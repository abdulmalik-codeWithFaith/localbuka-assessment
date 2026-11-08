import type { RestaurantResponse } from './restaurant-response.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

/** One place restaurants can come from. It should stop work when `signal` is aborted. */
export interface NearbySource {
  name: string;
  fetch: (coords: Coordinates, signal: AbortSignal) => Promise<RestaurantResponse[]>;
}

export interface NearbyOptions {
  /** Hard limit for the whole operation. */
  timeoutMs?: number;
  logger?: { error: (message: string, context: unknown) => void };
}

const DEFAULT_TIMEOUT_MS = 5000;

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Rejects as soon as the signal aborts, even if the underlying work ignores it. */
function rejectWhenAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Timed out'));
      return;
    }
    const onAbort = () => reject(new Error('Timed out'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Builds `fetchNearbyRestaurants(coords)`.
 *
 * Both sources start at the same moment, so the fallback is already on its way if the local
 * database fails. The local result always wins when it succeeds; the fallback is used only
 * when local fails. A single timeout covers everything. If nothing succeeds, it logs the
 * context and returns an empty list instead of throwing.
 */
export function createNearbyFetcher(
  sources: { local: NearbySource; fallback: NearbySource },
  options: NearbyOptions = {},
): (coords: Coordinates) => Promise<RestaurantResponse[]> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, logger = console } = options;

  return async function fetchNearbyRestaurants(coords: Coordinates): Promise<RestaurantResponse[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const local = sources.local.fetch(coords, controller.signal);
    const fallback = sources.fallback.fetch(coords, controller.signal);
    // Whichever promise we are not waiting on must not become an unhandled rejection.
    local.catch(() => undefined);
    fallback.catch(() => undefined);

    const failures: Record<string, string> = {};
    try {
      try {
        return await rejectWhenAborted(local, controller.signal);
      } catch (error) {
        failures[sources.local.name] = describeError(error);
      }

      try {
        return await rejectWhenAborted(fallback, controller.signal);
      } catch (error) {
        failures[sources.fallback.name] = describeError(error);
      }

      logger.error('fetchNearbyRestaurants failed: every source failed or the time limit was reached', {
        coords,
        timeoutMs,
        timedOut: controller.signal.aborted,
        failures,
      });
      return [];
    } finally {
      clearTimeout(timer);
      // Stop whichever request is still running (for example the unused fallback).
      controller.abort();
    }
  };
}
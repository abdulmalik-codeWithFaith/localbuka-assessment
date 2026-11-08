import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNearbyFetcher, type NearbySource } from './fetch-nearby-restaurants.js';
import type { RestaurantResponse } from './restaurant-response.js';

const COORDS = { lat: 6.5244, lng: 3.3792 };

function restaurant(id: string): RestaurantResponse {
  return {
    id,
    name: id,
    cuisine: 'Nigerian',
    priceRange: 2,
    location: COORDS,
    address: 'Lagos',
    tags: [],
    avgRating: 4,
    isOpen: true,
    images: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeSource(name: string, impl: NearbySource['fetch']) {
  const fetch = vi.fn(impl);
  return { source: { name, fetch } satisfies NearbySource, fetch };
}

describe('fetchNearbyRestaurants', () => {
  const logger = { error: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    logger.error.mockReset();
  });

  it('starts both requests at the same moment, not one after the other', async () => {
    const local = deferred<RestaurantResponse[]>();
    const google = deferred<RestaurantResponse[]>();
    const a = makeSource('local database', () => local.promise);
    const b = makeSource('google places', () => google.promise);
    const fetchNearby = createNearbyFetcher({ local: a.source, fallback: b.source }, { logger });

    const result = fetchNearby(COORDS);

    // Nothing has answered yet, and both have already been called.
    expect(a.fetch).toHaveBeenCalledOnce();
    expect(b.fetch).toHaveBeenCalledOnce();

    local.resolve([restaurant('local-1')]);
    await expect(result).resolves.toEqual([restaurant('local-1')]);
  });

  it('uses the local database when it succeeds, and stops the fallback request', async () => {
    const fallbackSignal: { current?: AbortSignal } = {};
    const a = makeSource('local database', async () => [restaurant('local-1')]);
    const b = makeSource('google places', (_coords, signal) => {
      fallbackSignal.current = signal;
      return new Promise<RestaurantResponse[]>(() => undefined);
    });

    const result = await createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);

    expect(result).toEqual([restaurant('local-1')]);
    expect(fallbackSignal.current?.aborted).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('still prefers local when the fallback happens to answer first', async () => {
    const local = deferred<RestaurantResponse[]>();
    const a = makeSource('local database', () => local.promise);
    const b = makeSource('google places', async () => [restaurant('google-1')]);

    const result = createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);
    await vi.advanceTimersByTimeAsync(100);
    local.resolve([restaurant('local-1')]);

    await expect(result).resolves.toEqual([restaurant('local-1')]);
  });

  it('falls back to Google Places when the local database fails', async () => {
    const a = makeSource('local database', async () => {
      throw new Error('connection refused');
    });
    const b = makeSource('google places', async () => [restaurant('google-1')]);

    const result = await createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);

    expect(result).toEqual([restaurant('google-1')]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns an empty list and logs the context when both sources fail', async () => {
    const a = makeSource('local database', async () => {
      throw new Error('connection refused');
    });
    const b = makeSource('google places', async () => {
      throw new Error('quota exceeded');
    });

    const result = await createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('fetchNearbyRestaurants failed'), {
      coords: COORDS,
      timeoutMs: 5000,
      timedOut: false,
      failures: {
        'local database': 'Error: connection refused',
        'google places': 'Error: quota exceeded',
      },
    });
  });

  it('gives up after 5000 ms with an empty list, even if the sources ignore the abort signal', async () => {
    const a = makeSource('local database', () => new Promise<RestaurantResponse[]>(() => undefined));
    const b = makeSource('google places', () => new Promise<RestaurantResponse[]>(() => undefined));

    const result = createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);

    await vi.advanceTimersByTimeAsync(4999);
    expect(logger.error).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timedOut: true, timeoutMs: 5000 }),
    );
  });

  it('leaves no timer running afterwards', async () => {
    const a = makeSource('local database', async () => [restaurant('local-1')]);
    const b = makeSource('google places', async () => []);

    await createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);

    expect(vi.getTimerCount()).toBe(0);
  });

  it('honours a custom time limit', async () => {
    const a = makeSource('local database', () => new Promise<RestaurantResponse[]>(() => undefined));
    const b = makeSource('google places', () => new Promise<RestaurantResponse[]>(() => undefined));

    const result = createNearbyFetcher({ local: a.source, fallback: b.source }, { timeoutMs: 200, logger })(COORDS);
    await vi.advanceTimersByTimeAsync(200);

    await expect(result).resolves.toEqual([]);
  });

  it('documents a trade-off: a hung local database costs the full limit even if Google already answered', async () => {
    const a = makeSource('local database', () => new Promise<RestaurantResponse[]>(() => undefined));
    const b = makeSource('google places', async () => [restaurant('google-1')]);

    const result = createNearbyFetcher({ local: a.source, fallback: b.source }, { logger })(COORDS);
    await vi.advanceTimersByTimeAsync(5000);

    // The brief says "if the timeout triggers, return a safe empty list", so that is what happens.
    await expect(result).resolves.toEqual([]);
  });
});
import { API_URL } from '../config'
import { ApiError } from './errors'

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
}

/** A phone on a weak connection can wait forever, so every request gets a time limit. */
const REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Pulls the message out of the API's error shape: { success: false, error: string | string[] }. */
function readErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  const { error } = payload
  if (typeof error === 'string') return error
  if (Array.isArray(error) && error.every((item) => typeof item === 'string')) {
    return error.join('. ')
  }
  return null
}

function unreachableMessage(): string {
  // In development, name the address: a wrong address or a firewall is the usual cause.
  return __DEV__
    ? `Cannot reach the server at ${API_URL}. Check that the backend is running, that your phone is on the same Wi-Fi, and that your firewall allows port 3000.`
    : 'Cannot reach the server. Check your connection and try again.'
}

/**
 * Calls the API and returns the `data` field of a successful response.
 * Failures throw an ApiError with a message that is safe to show to the user.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new ApiError(
        readErrorMessage(payload) ?? `The request failed (${response.status}).`,
        response.status,
      )
    }
    if (!isRecord(payload) || !('data' in payload)) {
      throw new ApiError('The server sent a response the app could not read.', response.status)
    }

    // The API contract guarantees the shape of `data` for each endpoint; callers state it with T.
    return payload.data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    // Cancelled by the caller (for example the screen was closed): not a failure to report.
    if (signal?.aborted) throw error
    throw new ApiError(unreachableMessage(), 0)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

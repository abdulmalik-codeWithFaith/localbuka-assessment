import { API_URL } from '../config'

/** An error returned by the API, or a failure to reach it (statusCode 0). */
export class ApiError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
}

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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Calls the API and returns the `data` field of a successful response.
 * Failures throw an ApiError with a message that is safe to show to the user.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // A cancelled request is not a failure: let the caller handle it.
    if (isAbortError(error)) throw error
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

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
}

/** A message that is safe to show for any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

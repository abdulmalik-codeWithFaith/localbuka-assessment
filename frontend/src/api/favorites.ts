import { ApiError } from './client'

/**
 * MOCK favorites service.
 *
 * API_CONTRACTS.md has no favorites endpoint, so this stands in for one: it waits like a
 * network call would, can fail on demand, and remembers favorites per user in localStorage.
 * Replacing it with a real endpoint only means changing the body of these two functions.
 */

const MOCK_LATENCY_MS = 600

const storageKey = (userId: string): string => `localbuka.favorites.${userId}`

export function readFavorites(userId: string): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return new Set()
  }
}

interface SetFavoriteOptions {
  /** Makes the call fail, so the rollback can be demonstrated. */
  simulateFailure?: boolean
}

export async function setFavorite(
  userId: string,
  restaurantId: string,
  isFavorite: boolean,
  options: SetFavoriteOptions = {},
): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

  if (options.simulateFailure) {
    throw new ApiError('The favorites service is unavailable.', 503)
  }

  const favorites = new Set(readFavorites(userId))
  if (isFavorite) favorites.add(restaurantId)
  else favorites.delete(restaurantId)

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...favorites]))
  } catch {
    // Storage unavailable: acceptable for a mock, the favorite just won't survive a reload.
  }
}

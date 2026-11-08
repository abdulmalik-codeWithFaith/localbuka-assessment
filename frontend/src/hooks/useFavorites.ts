import { useCallback, useMemo, useState } from 'react'
import { getErrorMessage } from '../api/client'
import { readFavorites, setFavorite } from '../api/favorites'
import type { Restaurant } from '../types'

interface UseFavoritesOptions {
  userId: string
  /** Demo switch: make the save request fail. */
  simulateFailure: boolean
  /** Called with a user-facing message when a change had to be undone. */
  onError: (message: string) => void
}

function withMembership(set: ReadonlySet<string>, id: string, isMember: boolean): Set<string> {
  const next = new Set(set)
  if (isMember) next.add(id)
  else next.delete(id)
  return next
}

/**
 * Favorites with optimistic updates: the heart changes the moment it is clicked, before the
 * request finishes. If the request fails, the heart goes back and the user is told why.
 *
 * State is kept per user, so switching users mid-request can never change the wrong person's list.
 */
export function useFavorites({ userId, simulateFailure, onError }: UseFavoritesOptions) {
  const [changesByUser, setChangesByUser] = useState<Record<string, ReadonlySet<string>>>({})
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(() => new Set())

  const favoriteIds = useMemo(
    () => changesByUser[userId] ?? readFavorites(userId),
    [changesByUser, userId],
  )

  const toggleFavorite = useCallback(
    async (restaurant: Pick<Restaurant, 'id' | 'name'>) => {
      const pendingKey = `${userId}:${restaurant.id}`
      // One request per restaurant at a time keeps an undo from racing the change it undoes.
      if (pendingKeys.has(pendingKey)) return

      const becomesFavorite = !favoriteIds.has(restaurant.id)

      const setMembership = (isMember: boolean) =>
        setChangesByUser((previous) => ({
          ...previous,
          [userId]: withMembership(previous[userId] ?? readFavorites(userId), restaurant.id, isMember),
        }))

      // 1. Optimistic update: show the new state straight away.
      setMembership(becomesFavorite)
      setPendingKeys((current) => withMembership(current, pendingKey, true))

      try {
        await setFavorite(userId, restaurant.id, becomesFavorite, { simulateFailure })
      } catch (error) {
        // 2. Roll back to what it was before the click and tell the user.
        setMembership(!becomesFavorite)
        const action = becomesFavorite ? 'save' : 'remove'
        const direction = becomesFavorite ? 'to' : 'from'
        onError(
          `Couldn't ${action} ${restaurant.name} ${direction} your favorites. ${getErrorMessage(error)} Try again in a moment.`,
        )
      } finally {
        setPendingKeys((current) => withMembership(current, pendingKey, false))
      }
    },
    [favoriteIds, pendingKeys, userId, simulateFailure, onError],
  )

  return { favoriteIds, toggleFavorite }
}

import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'

type Loader<T> = (signal: AbortSignal) => Promise<T>

/** The outcome of one request, remembered together with the request it answered. */
interface Settled<T> {
  loader: Loader<T>
  reloadCount: number
  data: T | null
  error: string | null
}

export interface AsyncData<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  /** Fetches again, for example after a failure or after the data changed. */
  reload: () => void
}

/**
 * Loads data when the component mounts and whenever `load` changes.
 *
 * `load` must be stable (wrap it in useCallback, listing what it depends on).
 * A request that is no longer wanted is cancelled, so a slow, outdated response can
 * never overwrite a newer one. The previous data stays available while reloading.
 */
export function useAsyncData<T>(load: Loader<T>): AsyncData<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSettled({ loader: load, reloadCount, data, error: null })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSettled((previous) => ({
          loader: load,
          reloadCount,
          data: previous?.data ?? null,
          error: getErrorMessage(error),
        }))
      })

    return () => controller.abort()
  }, [load, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  // Loading is derived, not stored: we are loading until a result arrives for the current request.
  const answersCurrentRequest =
    settled !== null && settled.loader === load && settled.reloadCount === reloadCount

  return {
    data: settled?.data ?? null,
    error: answersCurrentRequest ? settled.error : null,
    isLoading: !answersCurrentRequest,
    reload,
  }
}

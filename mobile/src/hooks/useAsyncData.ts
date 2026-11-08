import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '../api/errors'

type Loader<T> = (signal: AbortSignal) => Promise<T>

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
  reload: () => void
}

/**
 * Loads data when the screen opens and whenever `load` changes (keep `load` stable with useCallback).
 * An outdated request is cancelled, so a slow answer can never overwrite a newer one.
 */
export function useAsyncData<T>(load: Loader<T>): AsyncData<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ loader: load, reloadCount, data, error: null })
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

  const answersCurrentRequest =
    settled !== null && settled.loader === load && settled.reloadCount === reloadCount

  return {
    data: settled?.data ?? null,
    error: answersCurrentRequest ? settled.error : null,
    isLoading: !answersCurrentRequest,
    reload,
  }
}

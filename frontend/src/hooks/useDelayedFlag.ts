import { useEffect, useState } from 'react'

/**
 * True only after `active` has been true for `delayMs`.
 * Used so a loading skeleton does not flash for a request that finishes almost instantly.
 */
export function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setElapsed(true), delayMs)
    return () => {
      clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, delayMs])

  return active && elapsed
}

import { useCallback, useRef, useState } from 'react'
import { earnCheckInPoints } from '../api/points'
import { runCheckIn, type CheckInOutcome, type CheckInProgress } from '../lib/checkIn'
import { readDevicePosition, requestForegroundLocationPermission } from '../lib/deviceLocation'
import type { Coordinates } from '../types'

export type CheckInState = { status: 'idle' } | { status: CheckInProgress } | CheckInOutcome

interface UseCheckInOptions {
  userId: string
  restaurant: { id: string; location: Coordinates }
  /** Testing aid: pretend the phone is at this position. */
  locationOverride: Coordinates | null
}

/** Connects the check-in flow to the screen: tracks its state and wires in the phone's GPS and the API. */
export function useCheckIn({ userId, restaurant, locationOverride }: UseCheckInOptions) {
  const [state, setState] = useState<CheckInState>({ status: 'idle' })
  // A second tap while a check-in is running must not start another one.
  const isRunning = useRef(false)

  const start = useCallback(async () => {
    if (isRunning.current) return
    isRunning.current = true
    setState({ status: 'requesting-permission' })

    try {
      const outcome = await runCheckIn(
        restaurant,
        {
          requestLocationPermission: requestForegroundLocationPermission,
          getCurrentPosition: readDevicePosition,
          earnCheckInPoints: () => earnCheckInPoints(userId, restaurant.id),
          onProgress: (step) => setState({ status: step }),
        },
        { locationOverride: locationOverride ?? undefined },
      )
      setState(outcome)
    } finally {
      isRunning.current = false
    }
  }, [userId, restaurant, locationOverride])

  return { state, start }
}

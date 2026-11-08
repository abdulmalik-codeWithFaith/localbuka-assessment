import { getErrorMessage } from '../api/errors'
import type { Coordinates, EarnResult } from '../types'
import { distanceInMeters, isWithinCheckInRange } from './geo'

/** The steps shown to the user while a check-in is running. */
export type CheckInProgress = 'requesting-permission' | 'locating' | 'submitting'

/** How a finished check-in attempt ended. */
export type CheckInOutcome =
  | { status: 'success'; pointsAdded: number; newBalance: number }
  | { status: 'permission-denied'; canAskAgain: boolean }
  | { status: 'location-unavailable'; message: string }
  | { status: 'too-far'; distanceMeters: number }
  | { status: 'error'; message: string }

export interface LocationPermission {
  granted: boolean
  /** False when the user chose "don't ask again": only the phone's settings can change it. */
  canAskAgain: boolean
}

/** Thrown when the device cannot give a position. The message is shown to the user. */
export class LocationUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LocationUnavailableError'
  }
}

/** Everything the check-in needs from the outside world, so it can be tested without a phone. */
export interface CheckInDependencies {
  requestLocationPermission: () => Promise<LocationPermission>
  getCurrentPosition: () => Promise<Coordinates>
  earnCheckInPoints: () => Promise<EarnResult>
  onProgress?: (step: CheckInProgress) => void
}

interface CheckInOptions {
  /** Testing aid: use this position instead of reading the GPS. */
  locationOverride?: Coordinates
}

/**
 * The check-in flow:
 * ask for location permission, read the position, measure the distance to the restaurant,
 * and only when the user is within range ask the API to award the points.
 */
export async function runCheckIn(
  restaurant: { location: Coordinates },
  dependencies: CheckInDependencies,
  options: CheckInOptions = {},
): Promise<CheckInOutcome> {
  const { requestLocationPermission, getCurrentPosition, earnCheckInPoints, onProgress } = dependencies

  // 1. Permission.
  onProgress?.('requesting-permission')
  let permission: LocationPermission
  try {
    permission = await requestLocationPermission()
  } catch {
    return { status: 'error', message: 'We could not ask for location permission. Please try again.' }
  }
  if (!permission.granted) {
    return { status: 'permission-denied', canAskAgain: permission.canAskAgain }
  }

  // 2. Position.
  onProgress?.('locating')
  let position: Coordinates
  try {
    position = options.locationOverride ?? (await getCurrentPosition())
  } catch (error) {
    const message =
      error instanceof LocationUnavailableError
        ? error.message
        : 'We could not read your location. Move to an open area and try again.'
    return { status: 'location-unavailable', message }
  }

  // 3. Distance.
  const distanceMeters = distanceInMeters(position, restaurant.location)
  if (!isWithinCheckInRange(distanceMeters)) {
    return { status: 'too-far', distanceMeters }
  }

  // 4. Points.
  onProgress?.('submitting')
  try {
    const { pointsAdded, newBalance } = await earnCheckInPoints()
    return { status: 'success', pointsAdded, newBalance }
  } catch (error) {
    return { status: 'error', message: getErrorMessage(error) }
  }
}

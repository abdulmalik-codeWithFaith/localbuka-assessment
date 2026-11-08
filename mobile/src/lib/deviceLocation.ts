import * as Location from 'expo-location'
import type { Coordinates } from '../types'
import { LocationUnavailableError, type LocationPermission } from './checkIn'

/** Finding a GPS fix can take a while indoors; give up after this long. */
const POSITION_TIMEOUT_MS = 15_000

/** Asks for permission to use the location while the app is open (not in the background). */
export async function requestForegroundLocationPermission(): Promise<LocationPermission> {
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync()
  return { granted, canAskAgain }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

/** Reads the phone's current position. Throws LocationUnavailableError with a message to show. */
export async function readDevicePosition(): Promise<Coordinates> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new LocationUnavailableError(
        'Location is turned off on your phone. Turn it on in Settings and try again.',
      )
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      POSITION_TIMEOUT_MS,
      () =>
        new LocationUnavailableError(
          'Finding your location is taking too long. Move to an open area and try again.',
        ),
    )
    return { lat: position.coords.latitude, lng: position.coords.longitude }
  } catch (error) {
    if (error instanceof LocationUnavailableError) throw error
    throw new LocationUnavailableError('We could not read your location. Move to an open area and try again.')
  }
}

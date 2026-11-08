import { useCallback, useMemo, useRef, useState } from 'react'
import type { Location } from '../types'

export type LocationSource = 'anywhere' | 'device' | 'demo'

/** Yaba, Lagos, where most seeded restaurants are. Lets distance search be tried from anywhere. */
export const DEMO_LOCATION: Location = { lat: 6.5244, lng: 3.3792 }

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access was blocked. Allow it in your browser settings, or choose the demo location.'
    case error.TIMEOUT:
      return 'Finding your location took too long. Try again, or choose the demo location.'
    default:
      return 'Your location is not available right now. Try again, or choose the demo location.'
  }
}

function readDeviceLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location. Choose the demo location instead.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(describeGeolocationError(error))),
      { timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

/** Where the "near me" search starts from: nowhere, the device (GPS), or a fixed demo spot. */
export function useSearchLocation() {
  const [source, setSource] = useState<LocationSource>('anywhere')
  const [deviceLocation, setDeviceLocation] = useState<Location | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Only the latest choice may update state, so a slow GPS answer cannot override a newer pick.
  const latestChoice = useRef(0)

  const choose = useCallback(async (next: LocationSource) => {
    latestChoice.current += 1
    const choice = latestChoice.current

    setError(null)
    setSource(next)

    if (next !== 'device') {
      setIsLocating(false)
      return
    }

    setIsLocating(true)
    try {
      const location = await readDeviceLocation()
      if (choice === latestChoice.current) setDeviceLocation(location)
    } catch (caught) {
      if (choice !== latestChoice.current) return
      setSource('anywhere')
      setError(caught instanceof Error ? caught.message : 'Could not get your location.')
    } finally {
      if (choice === latestChoice.current) setIsLocating(false)
    }
  }, [])

  const coordinates = useMemo<Location | null>(() => {
    if (source === 'demo') return DEMO_LOCATION
    if (source === 'device') return deviceLocation
    return null
  }, [source, deviceLocation])

  return { source, coordinates, isLocating, error, choose }
}

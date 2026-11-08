import type { Coordinates } from '../types'

const EARTH_RADIUS_METERS = 6_371_000

/** A check-in only counts when the user is closer to the restaurant than this. */
export const CHECK_IN_RADIUS_METERS = 100

/** Great-circle distance between two points, in metres (Haversine formula). */
export function distanceInMeters(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2

  // Math.min guards against rounding pushing `a` marginally above 1.
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** "Less than 100 metres": exactly 100 m is already too far. */
export function isWithinCheckInRange(distanceMeters: number): boolean {
  return distanceMeters < CHECK_IN_RADIUS_METERS
}

/** "350 m" under a kilometre, "1.2 km" above. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

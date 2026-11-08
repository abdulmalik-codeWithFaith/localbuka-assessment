import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import type { Coordinates } from '../types'
import { LocationUnavailableError, runCheckIn, type CheckInDependencies, type CheckInProgress } from './checkIn'

const RESTAURANT = { location: { lat: 6.5244, lng: 3.3792 } }
/** 50 m north of the restaurant. */
const NEARBY: Coordinates = { lat: 6.52484966, lng: 3.3792 }
/** Roughly 1.2 km away. */
const FAR: Coordinates = { lat: 6.5182, lng: 3.3701 }

function makeDependencies(overrides: Partial<CheckInDependencies> = {}): CheckInDependencies {
  return {
    requestLocationPermission: vi.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    getCurrentPosition: vi.fn().mockResolvedValue(NEARBY),
    earnCheckInPoints: vi.fn().mockResolvedValue({ pointsAdded: 50, newBalance: 70 }),
    ...overrides,
  }
}

describe('runCheckIn', () => {
  it('awards points when the user is within 100 m', async () => {
    const dependencies = makeDependencies()

    const outcome = await runCheckIn(RESTAURANT, dependencies)

    expect(outcome).toEqual({ status: 'success', pointsAdded: 50, newBalance: 70 })
    expect(dependencies.earnCheckInPoints).toHaveBeenCalledOnce()
  })

  it('reports each step in order', async () => {
    const steps: CheckInProgress[] = []
    await runCheckIn(RESTAURANT, makeDependencies({ onProgress: (step) => steps.push(step) }))
    expect(steps).toEqual(['requesting-permission', 'locating', 'submitting'])
  })

  describe('permission', () => {
    it('stops when permission is refused, without reading the position or calling the API', async () => {
      const dependencies = makeDependencies({
        requestLocationPermission: vi.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
      })

      const outcome = await runCheckIn(RESTAURANT, dependencies)

      expect(outcome).toEqual({ status: 'permission-denied', canAskAgain: true })
      expect(dependencies.getCurrentPosition).not.toHaveBeenCalled()
      expect(dependencies.earnCheckInPoints).not.toHaveBeenCalled()
    })

    it('says when the phone will not ask again, so the app can point to Settings', async () => {
      const dependencies = makeDependencies({
        requestLocationPermission: vi.fn().mockResolvedValue({ granted: false, canAskAgain: false }),
      })
      expect(await runCheckIn(RESTAURANT, dependencies)).toEqual({ status: 'permission-denied', canAskAgain: false })
    })

    it('reports an error if asking for permission itself fails', async () => {
      const dependencies = makeDependencies({
        requestLocationPermission: vi.fn().mockRejectedValue(new Error('native crash')),
      })
      const outcome = await runCheckIn(RESTAURANT, dependencies)
      expect(outcome.status).toBe('error')
      expect(dependencies.earnCheckInPoints).not.toHaveBeenCalled()
    })
  })

  describe('position', () => {
    it('shows the device\'s own message when location services are off', async () => {
      const dependencies = makeDependencies({
        getCurrentPosition: vi.fn().mockRejectedValue(new LocationUnavailableError('Location services are turned off.')),
      })

      const outcome = await runCheckIn(RESTAURANT, dependencies)

      expect(outcome).toEqual({ status: 'location-unavailable', message: 'Location services are turned off.' })
      expect(dependencies.earnCheckInPoints).not.toHaveBeenCalled()
    })

    it('never leaks an unexpected internal error message', async () => {
      const dependencies = makeDependencies({
        getCurrentPosition: vi.fn().mockRejectedValue(new Error('E_NATIVE_0x8f3 stack trace')),
      })

      const outcome = await runCheckIn(RESTAURANT, dependencies)

      expect(outcome.status).toBe('location-unavailable')
      if (outcome.status === 'location-unavailable') {
        expect(outcome.message).not.toContain('E_NATIVE')
      }
    })
  })

  describe('distance', () => {
    it('blocks a check-in from too far away and reports how far', async () => {
      const dependencies = makeDependencies({ getCurrentPosition: vi.fn().mockResolvedValue(FAR) })

      const outcome = await runCheckIn(RESTAURANT, dependencies)

      expect(outcome.status).toBe('too-far')
      if (outcome.status === 'too-far') {
        expect(outcome.distanceMeters).toBeCloseTo(1219, 0)
      }
      expect(dependencies.earnCheckInPoints).not.toHaveBeenCalled()
    })

    it('allows 99 m and blocks 101 m', async () => {
      const at99 = makeDependencies({ getCurrentPosition: vi.fn().mockResolvedValue({ lat: 6.52529, lng: 3.3792 }) })
      const at101 = makeDependencies({ getCurrentPosition: vi.fn().mockResolvedValue({ lat: 6.5253083, lng: 3.3792 }) })

      expect((await runCheckIn(RESTAURANT, at99)).status).toBe('success')
      expect((await runCheckIn(RESTAURANT, at101)).status).toBe('too-far')
      expect(at101.earnCheckInPoints).not.toHaveBeenCalled()
    })
  })

  describe('points', () => {
    it('shows the server\'s message when the API refuses (for example: already checked in today)', async () => {
      const dependencies = makeDependencies({
        earnCheckInPoints: vi
          .fn()
          .mockRejectedValue(new ApiError('You have already checked in at this restaurant today', 400)),
      })

      expect(await runCheckIn(RESTAURANT, dependencies)).toEqual({
        status: 'error',
        message: 'You have already checked in at this restaurant today',
      })
    })

    it('shows a safe message for unexpected failures', async () => {
      const dependencies = makeDependencies({
        earnCheckInPoints: vi.fn().mockRejectedValue(new TypeError('undefined is not an object')),
      })

      const outcome = await runCheckIn(RESTAURANT, dependencies)
      expect(outcome).toEqual({ status: 'error', message: 'Something went wrong. Please try again.' })
    })
  })

  describe('location override (testing aid)', () => {
    it('uses the given position instead of reading the GPS, but still asks for permission', async () => {
      const dependencies = makeDependencies({ getCurrentPosition: vi.fn().mockResolvedValue(FAR) })

      const outcome = await runCheckIn(RESTAURANT, dependencies, { locationOverride: RESTAURANT.location })

      expect(outcome.status).toBe('success')
      expect(dependencies.requestLocationPermission).toHaveBeenCalledOnce()
      expect(dependencies.getCurrentPosition).not.toHaveBeenCalled()
    })

    it('still applies the distance rule to the override', async () => {
      const outcome = await runCheckIn(RESTAURANT, makeDependencies(), { locationOverride: FAR })
      expect(outcome.status).toBe('too-far')
    })
  })
})

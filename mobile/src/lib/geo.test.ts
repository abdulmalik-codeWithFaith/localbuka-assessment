import { describe, expect, it } from 'vitest'
import { CHECK_IN_RADIUS_METERS, distanceInMeters, formatDistance, isWithinCheckInRange } from './geo'

// Reference values were calculated separately (Python, same formula, Earth radius 6371 km).
const YABA = { lat: 6.5244, lng: 3.3792 }
const WHITE_HOUSE = { lat: 6.5182, lng: 3.3701 }
const ABUJA = { lat: 9.0765, lng: 7.3986 }
const LONDON = { lat: 51.5074, lng: -0.1278 }

describe('distanceInMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceInMeters(YABA, YABA)).toBe(0)
  })

  it('matches known distances', () => {
    expect(distanceInMeters(YABA, WHITE_HOUSE)).toBeCloseTo(1219.0, 0)
    expect(distanceInMeters(YABA, ABUJA)).toBeCloseTo(525_897.95, 0)
    expect(distanceInMeters(YABA, LONDON)).toBeCloseTo(5_012_309.7, 0)
  })

  it('is the same in both directions', () => {
    expect(distanceInMeters(YABA, ABUJA)).toBeCloseTo(distanceInMeters(ABUJA, YABA), 6)
  })

  it('measures short distances accurately (a point 99 m and 101 m due north)', () => {
    expect(distanceInMeters(YABA, { lat: 6.52529, lng: 3.3792 })).toBeCloseTo(99, 0)
    expect(distanceInMeters(YABA, { lat: 6.5253083, lng: 3.3792 })).toBeCloseTo(101, 0)
  })

  it('accounts for longitude shrinking away from the equator (100 m due east at Lagos)', () => {
    expect(distanceInMeters(YABA, { lat: 6.5244, lng: 3.380105 })).toBeCloseTo(100, 0)
  })

  it('does not produce NaN for opposite sides of the Earth', () => {
    const distance = distanceInMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })
    expect(Number.isNaN(distance)).toBe(false)
    expect(distance).toBeCloseTo(20_015_087, -1)
  })
})

describe('isWithinCheckInRange', () => {
  it('uses a 100 m radius', () => {
    expect(CHECK_IN_RADIUS_METERS).toBe(100)
  })

  it('allows distances under 100 m', () => {
    expect(isWithinCheckInRange(0)).toBe(true)
    expect(isWithinCheckInRange(99.99)).toBe(true)
  })

  it('refuses exactly 100 m and anything further', () => {
    expect(isWithinCheckInRange(100)).toBe(false)
    expect(isWithinCheckInRange(100.01)).toBe(false)
    expect(isWithinCheckInRange(5000)).toBe(false)
  })

  it('works with real coordinates: 99 m is in, 101 m is out', () => {
    expect(isWithinCheckInRange(distanceInMeters(YABA, { lat: 6.52529, lng: 3.3792 }))).toBe(true)
    expect(isWithinCheckInRange(distanceInMeters(YABA, { lat: 6.5253083, lng: 3.3792 }))).toBe(false)
  })
})

describe('formatDistance', () => {
  it('uses metres under a kilometre and kilometres above', () => {
    expect(formatDistance(350.4)).toBe('350 m')
    expect(formatDistance(999.4)).toBe('999 m')
    expect(formatDistance(1219)).toBe('1.2 km')
    expect(formatDistance(525_898)).toBe('525.9 km')
  })
})

/** Types that mirror API_CONTRACTS.md (only the parts the mobile app uses). */

export interface Coordinates {
  lat: number
  lng: number
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  /** 1 (cheapest) to 4 (most expensive). */
  priceRange: number
  location: Coordinates
  address: string
  tags: string[]
  avgRating: number
  isOpen: boolean
  images: string[]
}

export interface PointsBalance {
  userId: string
  balance: number
}

export interface EarnResult {
  pointsAdded: number
  newBalance: number
}

export interface DemoUser {
  id: string
  name: string
}

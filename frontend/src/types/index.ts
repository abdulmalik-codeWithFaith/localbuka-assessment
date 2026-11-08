/** Types that mirror API_CONTRACTS.md. */

export interface Location {
  lat: number
  lng: number
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  /** 1 (cheapest) to 4 (most expensive). */
  priceRange: number
  location: Location
  address: string
  tags: string[]
  avgRating: number
  isOpen: boolean
  images: string[]
  /** Kilometres from the search point. Only present when coordinates were sent. */
  distance?: number
}

/** Query parameters accepted by GET /restaurants. Every field is optional. */
export interface RestaurantFilters {
  cuisine?: string
  priceRange?: number
  minRating?: number
  latitude?: number
  longitude?: number
  /** Search radius in km. Only applies together with latitude and longitude. */
  radius?: number
}

export type LedgerAction = 'check-in' | 'review' | 'referral' | 'redeem'

export interface LedgerEntry {
  id: string
  action: LedgerAction
  /** Positive when earned, negative when redeemed. */
  points: number
  createdAt: string
}

export interface PointsBalance {
  userId: string
  balance: number
  history: LedgerEntry[]
}

export interface RedeemResult {
  pointsRedeemed: number
  newBalance: number
  voucherCode: string
}

export interface DemoUser {
  id: string
  name: string
}

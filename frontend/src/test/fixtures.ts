import type { Restaurant } from '../types'

export function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'buka_001',
    name: 'Mama Cass Kitchen',
    cuisine: 'Nigerian',
    priceRange: 2,
    location: { lat: 6.5244, lng: 3.3792 },
    address: 'Herbert Macaulay Way, Yaba, Lagos',
    tags: ['jollof', 'swallow'],
    avgRating: 4.5,
    isOpen: true,
    images: ['https://example.com/mama-cass.jpg'],
    ...overrides,
  }
}

export const SAMPLE_RESTAURANTS: Restaurant[] = [
  makeRestaurant(),
  makeRestaurant({
    id: 'buka_002',
    name: 'White House Buka',
    cuisine: 'Traditional Nigerian',
    priceRange: 1,
    tags: ['amala', 'ewedu'],
    avgRating: 4.8,
  }),
  makeRestaurant({
    id: 'buka_004',
    name: 'Calabar Kitchen',
    cuisine: 'South-South Nigerian',
    priceRange: 3,
    tags: ['edikang ikong'],
    avgRating: 4.2,
    images: [],
  }),
]

/** A promise the test resolves or rejects by hand, to observe what happens while it is pending. */
export function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

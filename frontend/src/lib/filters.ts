import type { Location, Restaurant, RestaurantFilters } from '../types'

/** What the filter controls hold. Selects work with strings; '' means "any". */
export interface FilterValues {
  search: string
  cuisine: string
  price: string
  rating: string
  radius: string
}

export const DEFAULT_FILTER_VALUES: FilterValues = {
  search: '',
  cuisine: '',
  price: '',
  rating: '',
  radius: '5',
}

/** Turns the controls into the query parameters the API understands. Search is local, not sent. */
export function toApiFilters(values: FilterValues, coordinates: Location | null): RestaurantFilters {
  return {
    cuisine: values.cuisine || undefined,
    priceRange: values.price ? Number(values.price) : undefined,
    minRating: values.rating ? Number(values.rating) : undefined,
    ...(coordinates && {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      radius: Number(values.radius),
    }),
  }
}

/** Local text search over name, cuisine and tags, ignoring case and surrounding spaces. */
export function matchesSearch(restaurant: Restaurant, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (needle === '') return true

  return [restaurant.name, restaurant.cuisine, ...restaurant.tags].some((text) =>
    text.toLowerCase().includes(needle),
  )
}

export function uniqueCuisines(restaurants: readonly Restaurant[]): string[] {
  return [...new Set(restaurants.map((restaurant) => restaurant.cuisine))].sort((a, b) =>
    a.localeCompare(b),
  )
}

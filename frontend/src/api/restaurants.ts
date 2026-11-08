import type { Restaurant, RestaurantFilters } from '../types'
import { request } from './client'

export function fetchRestaurants(
  filters: RestaurantFilters = {},
  signal?: AbortSignal,
): Promise<Restaurant[]> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) query.set(key, String(value))
  }
  const queryString = query.toString()
  return request<Restaurant[]>(`/restaurants${queryString ? `?${queryString}` : ''}`, { signal })
}

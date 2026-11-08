import type { Restaurant } from '../types'
import { request } from './client'

export function fetchRestaurants(signal?: AbortSignal): Promise<Restaurant[]> {
  return request<Restaurant[]>('/restaurants', { signal })
}

export function fetchRestaurant(id: string, signal?: AbortSignal): Promise<Restaurant> {
  return request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`, { signal })
}

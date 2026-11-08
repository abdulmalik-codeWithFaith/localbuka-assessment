import type { ReviewResponse } from '../reviews/review-response.js';
import type { Restaurant } from './restaurant.entity.js';

/** Restaurant shape defined by API_CONTRACTS.md. */
export interface RestaurantResponse {
  id: string;
  name: string;
  cuisine: string;
  priceRange: number;
  location: { lat: number; lng: number };
  address: string;
  tags: string[];
  avgRating: number;
  isOpen: boolean;
  images: string[];
  /** Kilometres from the user, only present when latitude/longitude were supplied. */
  distance?: number;
}

/** Restaurant profile with its reviews (GET /restaurants/:id). */
export interface RestaurantDetailResponse extends RestaurantResponse {
  reviews: ReviewResponse[];
}

export function toRestaurantResponse(restaurant: Restaurant, distanceKm?: number): RestaurantResponse {
  return {
    id: restaurant.id,
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    priceRange: restaurant.priceRange,
    location: { lat: restaurant.latitude, lng: restaurant.longitude },
    address: restaurant.address,
    tags: restaurant.tags,
    avgRating: restaurant.avgRating,
    isOpen: restaurant.isOpen === 1,
    images: restaurant.images,
    ...(distanceKm !== undefined && { distance: distanceKm }),
  };
}
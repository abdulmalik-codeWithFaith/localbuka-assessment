import type { Restaurant } from '../types'
import { CARD_GRID_CLASS } from './cardGrid'
import { RestaurantCard } from './RestaurantCard'

interface RestaurantGridProps {
  restaurants: readonly Restaurant[]
  favoriteIds: ReadonlySet<string>
  onToggleFavorite: (restaurant: Restaurant) => void
}

export function RestaurantGrid({ restaurants, favoriteIds, onToggleFavorite }: RestaurantGridProps) {
  return (
    <ul className={CARD_GRID_CLASS}>
      {restaurants.map((restaurant) => (
        <li key={restaurant.id}>
          <RestaurantCard
            restaurant={restaurant}
            isFavorite={favoriteIds.has(restaurant.id)}
            onToggleFavorite={onToggleFavorite}
          />
        </li>
      ))}
    </ul>
  )
}

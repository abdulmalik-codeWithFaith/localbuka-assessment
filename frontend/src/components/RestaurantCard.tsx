import { formatDistance } from '../lib/format'
import type { Restaurant } from '../types'
import { FavoriteButton } from './FavoriteButton'
import { PriceLevel } from './PriceLevel'
import { RatingStars } from './RatingStars'
import { RestaurantImage } from './RestaurantImage'

interface RestaurantCardProps {
  restaurant: Restaurant
  isFavorite: boolean
  onToggleFavorite: (restaurant: Restaurant) => void
}

export function RestaurantCard({ restaurant, isFavorite, onToggleFavorite }: RestaurantCardProps) {
  const { name, cuisine, priceRange, avgRating, address, tags, isOpen, images, distance } = restaurant

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-palm-600">
      <div className="relative aspect-[16/10] bg-palm-100">
        <RestaurantImage src={images[0]} name={name} />
        <span
          className={[
            'absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold',
            isOpen ? 'bg-white text-palm-800' : 'bg-ink text-white',
          ].join(' ')}
        >
          {isOpen ? 'Open now' : 'Closed'}
        </span>
        <div className="absolute right-3 top-3">
          <FavoriteButton
            restaurantName={name}
            isFavorite={isFavorite}
            onToggle={() => onToggleFavorite(restaurant)}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-lg font-bold leading-snug">{name}</h3>

        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>{cuisine}</span>
          <PriceLevel level={priceRange} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <RatingStars rating={avgRating} />
          {distance !== undefined && (
            <span className="rounded-full bg-danfo-400 px-2.5 py-0.5 text-xs font-bold text-ink">
              {formatDistance(distance)}
            </span>
          )}
        </div>

        <p className="text-sm text-muted">{address}</p>

        {tags.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-2 pt-1" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-palm-50 px-3 py-1 text-xs font-semibold text-palm-800">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

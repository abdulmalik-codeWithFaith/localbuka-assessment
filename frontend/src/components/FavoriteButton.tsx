import { HeartIcon } from './icons'

interface FavoriteButtonProps {
  restaurantName: string
  isFavorite: boolean
  onToggle: () => void
}

export function FavoriteButton({ restaurantName, isFavorite, onToggle }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={`Favorite ${restaurantName}`}
      className="grid size-11 place-items-center rounded-full bg-white text-ink transition-colors hover:bg-pepper-50"
    >
      <HeartIcon filled={isFavorite} className={isFavorite ? 'size-6 text-pepper-500' : 'size-6'} />
    </button>
  )
}

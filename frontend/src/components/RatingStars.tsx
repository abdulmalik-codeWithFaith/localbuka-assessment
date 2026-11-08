import { StarIcon } from './icons'

const STAR_COUNT = 5

/** Five stars, filled up to the rounded rating, followed by the exact number. */
export function RatingStars({ rating }: { rating: number }) {
  const filledStars = Math.round(rating)

  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={`Rated ${rating.toFixed(1)} out of ${STAR_COUNT}`}>
      <span className="flex text-danfo-500" aria-hidden="true">
        {Array.from({ length: STAR_COUNT }, (_, index) => (
          <StarIcon key={index} filled={index < filledStars} className="size-4" />
        ))}
      </span>
      <span className="text-sm font-bold" aria-hidden="true">
        {rating.toFixed(1)}
      </span>
    </span>
  )
}

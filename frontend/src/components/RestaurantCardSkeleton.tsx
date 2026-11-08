import { CARD_GRID_CLASS } from './cardGrid'

function RestaurantCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-full animate-pulse flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="aspect-[16/10] bg-palm-100" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-3/4 rounded bg-palm-100" />
        <div className="h-4 w-1/2 rounded bg-palm-50" />
        <div className="h-4 w-2/3 rounded bg-palm-50" />
        <div className="h-4 w-full rounded bg-palm-50" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 rounded-full bg-palm-50" />
          <div className="h-6 w-14 rounded-full bg-palm-50" />
        </div>
      </div>
    </div>
  )
}

const SKELETON_COUNT = 6

export function RestaurantGridSkeleton() {
  return (
    <div role="status" aria-label="Loading restaurants" className={CARD_GRID_CLASS}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <RestaurantCardSkeleton key={index} />
      ))}
    </div>
  )
}

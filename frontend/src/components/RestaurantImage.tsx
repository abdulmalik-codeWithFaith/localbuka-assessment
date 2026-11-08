import { useState } from 'react'
import { BowlIcon } from './icons'

interface RestaurantImageProps {
  src: string | undefined
  name: string
}

export function RestaurantImage({ src, name }: RestaurantImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`No photo available for ${name}`}
        className="flex size-full flex-col items-center justify-center gap-2 bg-palm-100 text-palm-700"
      >
        <BowlIcon className="size-10" />
        <span className="text-xs font-semibold">No photo yet</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className="size-full object-cover"
    />
  )
}

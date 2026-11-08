const MAX_LEVEL = 4

/** ₦ to ₦₦₦₦, with the unused symbols dimmed. */
export function PriceLevel({ level }: { level: number }) {
  return (
    <span role="img" aria-label={`Price level ${level} of ${MAX_LEVEL}`} className="text-sm font-bold">
      <span aria-hidden="true">
        <span>{'₦'.repeat(level)}</span>
        <span className="text-line">{'₦'.repeat(Math.max(MAX_LEVEL - level, 0))}</span>
      </span>
    </span>
  )
}

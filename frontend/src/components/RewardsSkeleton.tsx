export function RewardsSkeleton() {
  return (
    <div role="status" aria-label="Loading your rewards" className="grid animate-pulse gap-6 lg:grid-cols-2">
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-52 rounded-2xl bg-palm-100" />
        <div className="h-64 rounded-2xl bg-palm-50" />
      </div>
      <div aria-hidden="true" className="h-96 rounded-2xl bg-palm-50" />
    </div>
  )
}

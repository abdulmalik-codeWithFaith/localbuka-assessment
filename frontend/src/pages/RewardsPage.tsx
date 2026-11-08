import { useCallback } from 'react'
import { fetchPointsBalance } from '../api/points'
import { BalanceCard } from '../components/BalanceCard'
import { ErrorPanel } from '../components/ErrorPanel'
import { LedgerList } from '../components/LedgerList'
import { RedeemForm } from '../components/RedeemForm'
import { RewardsSkeleton } from '../components/RewardsSkeleton'
import { useAsyncData } from '../hooks/useAsyncData'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { DemoUser } from '../types'

export function RewardsPage() {
  const { user } = useCurrentUser()
  // Keyed by user: switching user starts from scratch, so one person's balance
  // (or an unfinished redeem form) can never show up under another person's name.
  return <RewardsDashboard key={user.id} user={user} />
}

function RewardsDashboard({ user }: { user: DemoUser }) {
  const load = useCallback((signal: AbortSignal) => fetchPointsBalance(user.id, signal), [user.id])
  const { data, error, isLoading, reload } = useAsyncData(load)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold text-palm-800 sm:text-4xl">Your rewards</h1>

      {error && <ErrorPanel message={error} onRetry={reload} />}

      {data === null && isLoading && <RewardsSkeleton />}

      {data && (
        <div
          aria-busy={isLoading}
          className={[
            'grid items-start gap-6 lg:grid-cols-2',
            isLoading ? 'opacity-70 transition-opacity' : '',
          ].join(' ')}
        >
          <div className="flex flex-col gap-6">
            <BalanceCard balance={data.balance} />
            <RedeemForm userId={user.id} balance={data.balance} onRedeemed={reload} />
          </div>
          <LedgerList entries={data.history} />
        </div>
      )}
    </div>
  )
}

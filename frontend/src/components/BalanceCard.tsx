import { formatNaira, largestRedeemable, pointsToNaira, REDEEM_STEP_POINTS } from '../lib/points'

export function BalanceCard({ balance }: { balance: number }) {
  // Redemptions come in steps, so only whole steps are worth money right now.
  const redeemablePoints = largestRedeemable(balance)
  const pointsToNextVoucher = REDEEM_STEP_POINTS - (balance % REDEEM_STEP_POINTS)

  return (
    <section aria-label="Points balance" className="rounded-2xl bg-palm-700 p-6 text-white sm:p-8">
      <p className="text-sm font-semibold text-palm-100">Your balance</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-6xl font-extrabold leading-none">{balance}</span>
        <span className="text-lg font-semibold text-palm-100">points</span>
      </p>

      {redeemablePoints > 0 && (
        <p className="mt-4 inline-block rounded-full bg-danfo-400 px-3 py-1 text-sm font-bold text-ink">
          You can redeem {formatNaira(pointsToNaira(redeemablePoints))} off
        </p>
      )}

      <p className="mt-4 text-sm text-palm-100">
        {redeemablePoints > 0
          ? `Every ${REDEEM_STEP_POINTS} points is ${formatNaira(pointsToNaira(REDEEM_STEP_POINTS))} off your order.`
          : `Earn ${pointsToNextVoucher} more points to unlock your first voucher.`}
      </p>
    </section>
  )
}

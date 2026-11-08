import { useId, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/client'
import { redeemPoints } from '../api/points'
import {
  formatNaira,
  largestRedeemable,
  pointsToNaira,
  REDEEM_STEP_POINTS,
  validateRedeemAmount,
} from '../lib/points'
import type { RedeemResult } from '../types'
import { VoucherTicket } from './VoucherTicket'

interface RedeemFormProps {
  userId: string
  balance: number
  /** Called after a successful redemption, so the page can refresh the balance and history. */
  onRedeemed: () => void
}

export function RedeemForm({ userId, balance, onRedeemed }: RedeemFormProps) {
  const inputId = useId()
  const messageId = useId()

  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [voucher, setVoucher] = useState<RedeemResult | null>(null)

  const hasEnoughPoints = balance >= REDEEM_STEP_POINTS
  const validation = validateRedeemAmount(value, balance)
  const visibleError = touched && !validation.ok ? validation.message : null

  const quickAmounts = [REDEEM_STEP_POINTS, 100, 250].filter((amount) => amount <= balance)
  const maxAmount = largestRedeemable(balance)

  const choose = (amount: number) => {
    setValue(String(amount))
    setTouched(true)
    setServerError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (!validation.ok || isSubmitting) return

    setIsSubmitting(true)
    setServerError(null)
    setVoucher(null)
    try {
      const result = await redeemPoints(userId, validation.amount)
      setVoucher(result)
      setValue('')
      setTouched(false)
      onRedeemed()
    } catch (error) {
      setServerError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="redeem-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="redeem-heading" className="font-display text-xl font-bold">
        Redeem a voucher
      </h2>

      {!hasEnoughPoints ? (
        <p className="mt-3 text-muted">
          You need at least {REDEEM_STEP_POINTS} points to redeem a voucher. Check in at a restaurant,
          leave a review or refer a friend to earn more.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-semibold">
              Points to redeem
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setServerError(null)
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={visibleError !== null}
              aria-describedby={messageId}
              placeholder={`For example ${REDEEM_STEP_POINTS}`}
              className={[
                'rounded-lg border bg-white px-4 py-3 text-lg font-semibold',
                visibleError ? 'border-pepper-500' : 'border-line',
              ].join(' ')}
            />
            <p id={messageId} aria-live="polite" className="min-h-5 text-sm">
              {visibleError ? (
                <span className="font-semibold text-pepper-600">{visibleError}</span>
              ) : validation.ok ? (
                <span className="font-semibold text-palm-700">
                  {validation.amount} points gets you {formatNaira(pointsToNaira(validation.amount))} off.
                </span>
              ) : (
                <span className="text-muted">
                  Multiples of {REDEEM_STEP_POINTS}. {REDEEM_STEP_POINTS} points is{' '}
                  {formatNaira(pointsToNaira(REDEEM_STEP_POINTS))} off.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => choose(amount)}
                className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:border-palm-700 hover:bg-palm-50"
              >
                {amount}
              </button>
            ))}
            {maxAmount > 0 && !quickAmounts.includes(maxAmount) && (
              <button
                type="button"
                onClick={() => choose(maxAmount)}
                className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:border-palm-700 hover:bg-palm-50"
              >
                Use {maxAmount}
              </button>
            )}
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg border border-pepper-500 bg-pepper-50 p-3 text-sm font-semibold text-pepper-600">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-palm-700 px-5 py-3 font-bold text-white hover:bg-palm-800 disabled:cursor-wait disabled:bg-palm-600"
          >
            {isSubmitting ? 'Redeeming…' : 'Redeem voucher'}
          </button>
        </form>
      )}

      {voucher && (
        <div className="mt-6" role="status">
          <VoucherTicket voucherCode={voucher.voucherCode} pointsRedeemed={voucher.pointsRedeemed} />
        </div>
      )}
    </section>
  )
}

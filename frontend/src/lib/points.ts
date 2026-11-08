import type { LedgerAction } from '../types'

/** Points can only be redeemed in steps of this size... */
export const REDEEM_STEP_POINTS = 50
/** ...and each step is worth this many naira off an order. */
export const NAIRA_PER_STEP = 500

export function pointsToNaira(points: number): number {
  return (points / REDEEM_STEP_POINTS) * NAIRA_PER_STEP
}

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export function formatNaira(amount: number): string {
  return nairaFormatter.format(amount)
}

/** The largest amount that can be redeemed right now, or 0 if there is not enough for one step. */
export function largestRedeemable(balance: number): number {
  return Math.floor(balance / REDEEM_STEP_POINTS) * REDEEM_STEP_POINTS
}

export type RedeemValidation = { ok: true; amount: number } | { ok: false; message: string }

/** Checks what the user typed against the rules the API enforces, with a message they can act on. */
export function validateRedeemAmount(raw: string, balance: number): RedeemValidation {
  const text = raw.trim()

  if (text === '') {
    return { ok: false, message: 'Enter how many points you want to redeem.' }
  }
  if (!/^\d+$/.test(text)) {
    return { ok: false, message: 'Use whole numbers only, for example 100.' }
  }

  const amount = Number(text)
  if (amount < REDEEM_STEP_POINTS) {
    return { ok: false, message: `The smallest amount you can redeem is ${REDEEM_STEP_POINTS} points.` }
  }
  if (amount % REDEEM_STEP_POINTS !== 0) {
    return {
      ok: false,
      message: `Points must be a multiple of ${REDEEM_STEP_POINTS}, for example 50, 100 or 150.`,
    }
  }
  if (amount > balance) {
    return { ok: false, message: `You only have ${balance} points.` }
  }

  return { ok: true, amount }
}

const ACTION_LABELS: Record<LedgerAction, string> = {
  'check-in': 'Checked in at a restaurant',
  review: 'Reviewed a restaurant',
  referral: 'Referred a friend',
  redeem: 'Redeemed a voucher',
}

export function describeLedgerAction(action: LedgerAction): string {
  return ACTION_LABELS[action]
}

const dateFormatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' })

export function formatTransactionDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

/** "+50" for earned points, "−100" (a real minus sign) for redeemed ones. */
export function formatSignedPoints(points: number): string {
  return points >= 0 ? `+${points}` : `\u2212${Math.abs(points)}`
}

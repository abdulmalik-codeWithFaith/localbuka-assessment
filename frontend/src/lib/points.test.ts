import { describe, expect, it } from 'vitest'
import {
  describeLedgerAction,
  formatNaira,
  formatSignedPoints,
  largestRedeemable,
  pointsToNaira,
  validateRedeemAmount,
} from './points'

describe('pointsToNaira', () => {
  it('values every 50 points at 500 naira', () => {
    expect(pointsToNaira(50)).toBe(500)
    expect(pointsToNaira(100)).toBe(1000)
    expect(pointsToNaira(70)).toBe(700)
    expect(pointsToNaira(0)).toBe(0)
  })
})

describe('formatNaira', () => {
  it('writes whole naira with the currency sign', () => {
    const text = formatNaira(1500)
    expect(text).toMatch(/₦|NGN/)
    expect(text).toMatch(/1,500/)
    expect(text).not.toMatch(/\.00/)
  })
})

describe('largestRedeemable', () => {
  it('rounds the balance down to a multiple of 50', () => {
    expect(largestRedeemable(120)).toBe(100)
    expect(largestRedeemable(50)).toBe(50)
    expect(largestRedeemable(49)).toBe(0)
    expect(largestRedeemable(0)).toBe(0)
  })
})

describe('validateRedeemAmount', () => {
  it('accepts multiples of 50 up to the balance, including the whole balance', () => {
    expect(validateRedeemAmount('50', 220)).toEqual({ ok: true, amount: 50 })
    expect(validateRedeemAmount('  150 ', 220)).toEqual({ ok: true, amount: 150 })
    expect(validateRedeemAmount('200', 200)).toEqual({ ok: true, amount: 200 })
  })

  it.each([
    ['', 'Enter how many points'],
    ['   ', 'Enter how many points'],
    ['abc', 'whole numbers'],
    ['50.5', 'whole numbers'],
    ['-50', 'whole numbers'],
    ['1e3', 'whole numbers'],
    ['0', 'smallest amount'],
    ['25', 'smallest amount'],
    ['75', 'multiple of 50'],
    ['120', 'multiple of 50'],
  ])('rejects "%s" and explains why', (input, expectedPart) => {
    const result = validateRedeemAmount(input, 500)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain(expectedPart)
  })

  it('rejects more than the balance, naming the balance', () => {
    const result = validateRedeemAmount('250', 220)
    expect(result).toEqual({ ok: false, message: 'You only have 220 points.' })
  })

  it('copes with absurdly large numbers', () => {
    expect(validateRedeemAmount('9'.repeat(30), 220).ok).toBe(false)
  })
})

describe('ledger formatting', () => {
  it('labels every action in plain words', () => {
    expect(describeLedgerAction('check-in')).toBe('Checked in at a restaurant')
    expect(describeLedgerAction('review')).toBe('Reviewed a restaurant')
    expect(describeLedgerAction('referral')).toBe('Referred a friend')
    expect(describeLedgerAction('redeem')).toBe('Redeemed a voucher')
  })

  it('signs points, using a real minus sign for redemptions', () => {
    expect(formatSignedPoints(50)).toBe('+50')
    expect(formatSignedPoints(-100)).toBe('\u2212100')
  })
})

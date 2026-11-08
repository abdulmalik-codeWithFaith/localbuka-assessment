import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { redeemPoints } from '../api/points'
import { createDeferred } from '../test/fixtures'
import type { RedeemResult } from '../types'
import { RedeemForm } from './RedeemForm'

vi.mock('../api/points')

function renderForm(balance = 220, onRedeemed = vi.fn()) {
  render(<RedeemForm userId="user_101" balance={balance} onRedeemed={onRedeemed} />)
  return { onRedeemed }
}

const field = () => screen.getByLabelText('Points to redeem') as HTMLInputElement
const submit = () => screen.getByRole('button', { name: /Redeem voucher|Redeeming/ })

describe('RedeemForm', () => {
  it('explains what is needed when there are not enough points, and offers no form', () => {
    renderForm(30)
    expect(screen.getByText(/at least 50 points/)).toBeTruthy()
    expect(screen.queryByLabelText('Points to redeem')).toBeNull()
  })

  it.each([
    ['75', /multiple of 50/],
    ['25', /smallest amount/],
    ['500', /only have 220 points/],
    ['abc', /whole numbers/],
  ])('shows a clear message for "%s" and sends nothing', async (input, message) => {
    const user = userEvent.setup()
    renderForm(220)

    await user.type(field(), input)
    await user.click(submit())

    expect(screen.getByText(message)).toBeTruthy()
    expect(field().getAttribute('aria-invalid')).toBe('true')
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it('asks for an amount when the field is empty', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(submit())
    expect(screen.getByText('Enter how many points you want to redeem.')).toBeTruthy()
    expect(redeemPoints).not.toHaveBeenCalled()
  })

  it('previews the value of a valid amount', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(field(), '100')
    expect(screen.getByText(/100 points gets you .*1,000 off/)).toBeTruthy()
  })

  it('fills the field from the quick amounts', async () => {
    const user = userEvent.setup()
    renderForm(220)

    await user.click(screen.getByRole('button', { name: '100' }))
    expect(field().value).toBe('100')

    await user.click(screen.getByRole('button', { name: 'Use 200' }))
    expect(field().value).toBe('200')
  })

  it('only offers quick amounts the balance can cover', () => {
    renderForm(120)
    expect(screen.getByRole('button', { name: '50' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '100' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '250' })).toBeNull()
  })

  it('redeems, shows the voucher, clears the field and tells the page to refresh', async () => {
    const user = userEvent.setup()
    vi.mocked(redeemPoints).mockResolvedValue({ pointsRedeemed: 100, newBalance: 120, voucherCode: 'BUKA-DISC-X9B2' })
    const { onRedeemed } = renderForm(220)

    await user.type(field(), '100')
    await user.click(submit())

    expect(await screen.findByText('BUKA-DISC-X9B2')).toBeTruthy()
    expect(redeemPoints).toHaveBeenCalledWith('user_101', 100)
    expect(onRedeemed).toHaveBeenCalledOnce()
    expect(field().value).toBe('')
  })

  it('cannot be submitted twice while the request is running', async () => {
    const user = userEvent.setup()
    const request = createDeferred<RedeemResult>()
    vi.mocked(redeemPoints).mockReturnValue(request.promise)
    renderForm(220)

    await user.type(field(), '100')
    await user.click(submit())

    const busyButton = screen.getByRole('button', { name: 'Redeeming…' }) as HTMLButtonElement
    expect(busyButton.disabled).toBe(true)
    await user.click(busyButton)
    expect(redeemPoints).toHaveBeenCalledTimes(1)

    request.resolve({ pointsRedeemed: 100, newBalance: 120, voucherCode: 'BUKA-DISC-AAAA' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Redeem voucher' })).toBeTruthy())
  })

  it('shows the server message when redeeming fails, and no voucher', async () => {
    const user = userEvent.setup()
    vi.mocked(redeemPoints).mockRejectedValue(new ApiError('Insufficient points: you have 20 but tried to redeem 100', 400))
    renderForm(220)

    await user.type(field(), '100')
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Insufficient points')
    expect(screen.queryByText(/BUKA-DISC/)).toBeNull()
    expect(field().value).toBe('100')
  })
})

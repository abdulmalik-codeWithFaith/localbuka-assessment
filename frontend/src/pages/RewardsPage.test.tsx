import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { fetchPointsBalance, redeemPoints } from '../api/points'
import App from '../App'
import { createDeferred } from '../test/fixtures'
import type { PointsBalance } from '../types'

vi.mock('../api/points')

const balanceOf = (userId: string, balance: number, history: PointsBalance['history'] = []): PointsBalance => ({
  userId,
  balance,
  history,
})

const HISTORY: PointsBalance['history'] = [
  { id: 'tx_3', action: 'redeem', points: -100, createdAt: '2026-06-30T10:00:00.000Z' },
  { id: 'tx_2', action: 'check-in', points: 50, createdAt: '2026-06-29T10:00:00.000Z' },
  { id: 'tx_1', action: 'review', points: 20, createdAt: '2026-06-28T12:00:00.000Z' },
]

function renderRewards() {
  window.history.pushState({}, '', '/rewards')
  return render(<App />)
}

describe('RewardsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPointsBalance).mockResolvedValue(balanceOf('user_101', 220, HISTORY))
  })

  it('shows a skeleton while loading, then the balance and what it is worth', async () => {
    const request = createDeferred<PointsBalance>()
    vi.mocked(fetchPointsBalance).mockReturnValue(request.promise)
    renderRewards()

    expect(screen.getByRole('status', { name: 'Loading your rewards' })).toBeTruthy()

    request.resolve(balanceOf('user_101', 220, HISTORY))

    const balance = await screen.findByRole('region', { name: 'Points balance' })
    expect(within(balance).getByText('220')).toBeTruthy()
    // 220 points: only 200 can be redeemed (steps of 50), so that is what the badge promises.
    expect(within(balance).getByText(/You can redeem .*2,000 off/)).toBeTruthy()
    expect(screen.queryByRole('status', { name: 'Loading your rewards' })).toBeNull()
  })

  it('lists the transactions newest first, with earned and redeemed points signed', async () => {
    renderRewards()
    const ledger = await screen.findByRole('region', { name: 'Recent activity' })

    const rows = within(ledger).getAllByRole('listitem').map((row) => row.textContent ?? '')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('Redeemed a voucher')
    expect(rows[0]).toContain('\u2212100')
    expect(rows[1]).toContain('Checked in at a restaurant')
    expect(rows[1]).toContain('+50')
    expect(rows[2]).toContain('Reviewed a restaurant')
    expect(rows[2]).toContain('+20')
  })

  it('shows only the latest ten transactions until asked for all of them', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `tx_${index}`,
      action: 'check-in' as const,
      points: 50,
      createdAt: '2026-06-29T10:00:00.000Z',
    }))
    vi.mocked(fetchPointsBalance).mockResolvedValue(balanceOf('user_101', 600, many))
    const user = userEvent.setup()
    renderRewards()
    const ledger = await screen.findByRole('region', { name: 'Recent activity' })
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(10)

    await user.click(within(ledger).getByRole('button', { name: 'Show all 12' }))
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(12)
  })

  it('invites a new user to start earning when there is no activity', async () => {
    vi.mocked(fetchPointsBalance).mockResolvedValue(balanceOf('user_101', 0))
    renderRewards()

    expect(await screen.findByText(/Nothing here yet/)).toBeTruthy()
    expect(screen.getByText(/Earn 50 more points to unlock your first voucher/)).toBeTruthy()
    expect(screen.queryByText(/You can redeem/)).toBeNull()
    expect(screen.getByText(/at least 50 points/)).toBeTruthy()
  })

  it('shows the error and recovers with Try again', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchPointsBalance).mockRejectedValue(new ApiError('User not found', 404))
    renderRewards()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('User not found')

    vi.mocked(fetchPointsBalance).mockResolvedValue(balanceOf('user_101', 70, HISTORY))
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('region', { name: 'Points balance' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('redeems a voucher, shows it, then refreshes the balance and the history', async () => {
    const user = userEvent.setup()
    renderRewards()
    await screen.findByRole('region', { name: 'Points balance' })

    vi.mocked(redeemPoints).mockResolvedValue({ pointsRedeemed: 100, newBalance: 120, voucherCode: 'BUKA-DISC-X9B2' })
    vi.mocked(fetchPointsBalance).mockResolvedValue(
      balanceOf('user_101', 120, [
        { id: 'tx_4', action: 'redeem', points: -100, createdAt: '2026-07-01T10:00:00.000Z' },
        ...HISTORY,
      ]),
    )

    await user.type(screen.getByLabelText('Points to redeem'), '100')
    await user.click(screen.getByRole('button', { name: 'Redeem voucher' }))

    expect(await screen.findByText('BUKA-DISC-X9B2')).toBeTruthy()
    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'Points balance' })).getByText('120')).toBeTruthy(),
    )
    const ledger = screen.getByRole('region', { name: 'Recent activity' })
    expect(within(ledger).getAllByRole('listitem')).toHaveLength(4)
    // The voucher stays visible after the refresh.
    expect(screen.getByText('BUKA-DISC-X9B2')).toBeTruthy()
  })

  it('never shows one user\'s balance while loading another user\'s', async () => {
    const user = userEvent.setup()
    renderRewards()
    await screen.findByRole('region', { name: 'Points balance' })
    expect(screen.getByText('220')).toBeTruthy()

    const other = createDeferred<PointsBalance>()
    vi.mocked(fetchPointsBalance).mockReturnValue(other.promise)
    await user.selectOptions(screen.getByLabelText(/Signed in as/), 'user_102')

    // While the second user's data is loading, the first user's numbers are gone.
    expect(screen.getByRole('status', { name: 'Loading your rewards' })).toBeTruthy()
    expect(screen.queryByText('220')).toBeNull()
    expect(fetchPointsBalance).toHaveBeenLastCalledWith('user_102', expect.any(AbortSignal))

    other.resolve(balanceOf('user_102', 50))
    const balance = await screen.findByRole('region', { name: 'Points balance' })
    expect(within(balance).getByText('50')).toBeTruthy()
  })
})

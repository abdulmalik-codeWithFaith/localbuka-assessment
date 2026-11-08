import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoucherTicket } from './VoucherTicket'

afterEach(() => vi.unstubAllGlobals())

describe('VoucherTicket', () => {
  it('shows the code and what it is worth', () => {
    render(<VoucherTicket voucherCode="BUKA-DISC-X9B2" pointsRedeemed={100} />)
    expect(screen.getByText('BUKA-DISC-X9B2')).toBeTruthy()
    expect(screen.getByText(/1,000 off/)).toBeTruthy()
    expect(screen.getByText(/will not be shown again/)).toBeTruthy()
  })

  it('copies the code and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<VoucherTicket voucherCode="BUKA-DISC-X9B2" pointsRedeemed={50} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(writeText).toHaveBeenCalledWith('BUKA-DISC-X9B2')
    expect(await screen.findByText('Copied.')).toBeTruthy()
  })

  it('tells the user when copying is not possible', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    render(<VoucherTicket voucherCode="BUKA-DISC-X9B2" pointsRedeemed={50} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy code' }))

    expect(await screen.findByText(/Could not copy/)).toBeTruthy()
  })
})

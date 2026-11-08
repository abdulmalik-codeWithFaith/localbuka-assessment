import { useState } from 'react'
import { formatNaira, pointsToNaira } from '../lib/points'

interface VoucherTicketProps {
  voucherCode: string
  pointsRedeemed: number
}

type CopyStatus = 'idle' | 'copied' | 'failed'

/** The voucher a user receives after redeeming. Shown once: the API does not list codes later. */
export function VoucherTicket({ voucherCode, pointsRedeemed }: VoucherTicketProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(voucherCode)
      setCopyStatus('copied')
    } catch {
      // Clipboard access can be blocked (insecure page, permissions). The code stays selectable.
      setCopyStatus('failed')
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-dashed border-palm-700 bg-white">
      <div className="bg-danfo-400 px-5 py-2 text-sm font-extrabold text-ink">
        Your voucher: {formatNaira(pointsToNaira(pointsRedeemed))} off
      </div>
      <div className="p-5">
        <p className="text-sm text-muted">Show this code when you place your order.</p>
        <p className="mt-2 select-all break-all font-mono text-3xl font-bold tracking-wider text-palm-800">
          {voucherCode}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyCode}
            className="rounded-lg border border-palm-700 px-4 py-2 text-sm font-semibold text-palm-800 hover:bg-palm-50"
          >
            Copy code
          </button>
          <p aria-live="polite" className="text-sm">
            {copyStatus === 'copied' && <span className="font-semibold text-palm-700">Copied.</span>}
            {copyStatus === 'failed' && (
              <span className="font-semibold text-pepper-600">
                Could not copy. Select the code and copy it by hand.
              </span>
            )}
          </p>
        </div>

        <p className="mt-4 text-sm font-semibold text-pepper-600">
          Save this code now. It will not be shown again.
        </p>
      </div>
    </div>
  )
}

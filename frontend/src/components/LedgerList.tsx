import { useState } from 'react'
import { describeLedgerAction, formatSignedPoints, formatTransactionDate } from '../lib/points'
import type { LedgerEntry } from '../types'

/** How many transactions show before the user asks for the rest. */
const RECENT_COUNT = 10

export function LedgerList({ entries }: { entries: readonly LedgerEntry[] }) {
  const [showAll, setShowAll] = useState(false)
  const visibleEntries = showAll ? entries : entries.slice(0, RECENT_COUNT)

  return (
    <section aria-labelledby="ledger-heading" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="ledger-heading" className="font-display text-xl font-bold">
        Recent activity
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-muted">
          Nothing here yet. Check in at a restaurant, leave a review or refer a friend to start earning.
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-line">
            {visibleEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{describeLedgerAction(entry.action)}</p>
                  <p className="text-sm text-muted">
                    <time dateTime={entry.createdAt}>{formatTransactionDate(entry.createdAt)}</time>
                  </p>
                </div>
                <p
                  className={[
                    'font-display text-lg font-extrabold',
                    entry.points >= 0 ? 'text-palm-700' : 'text-pepper-600',
                  ].join(' ')}
                >
                  {formatSignedPoints(entry.points)}
                </p>
              </li>
            ))}
          </ul>

          {entries.length > RECENT_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-3 text-sm font-semibold text-palm-700 underline underline-offset-4 hover:text-palm-800"
            >
              {showAll ? 'Show fewer' : `Show all ${entries.length}`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

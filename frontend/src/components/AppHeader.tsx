import { NavLink } from 'react-router'
import { useCurrentUser } from '../hooks/useCurrentUser'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-palm-700 text-white' : 'text-ink hover:bg-palm-50',
  ].join(' ')

export function AppHeader() {
  const { user, users, selectUser } = useCurrentUser()

  return (
    <header className="border-b-2 border-palm-700 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2" aria-label="LocalBuka home">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-palm-700 font-display text-lg font-extrabold text-danfo-400"
            >
              B
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-palm-800">
              LocalBuka
            </span>
          </NavLink>

          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Discover
            </NavLink>
            <NavLink to="/rewards" className={navLinkClass}>
              Rewards
            </NavLink>
          </nav>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          Signed in as
          <select
            value={user.id}
            onChange={(event) => selectUser(event.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
          >
            {users.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  )
}

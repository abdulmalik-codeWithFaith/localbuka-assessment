import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DEMO_USERS } from '../config'
import type { DemoUser } from '../types'
import { CurrentUserContext } from './currentUserContext'

const STORAGE_KEY = 'localbuka.userId'

/** The first demo user, used when nothing valid is remembered. */
const DEFAULT_USER: DemoUser = DEMO_USERS[0] ?? { id: 'user_101', name: 'Demo user' }

function readSavedUser(): DemoUser {
  try {
    const savedId = window.localStorage.getItem(STORAGE_KEY)
    return DEMO_USERS.find((user) => user.id === savedId) ?? DEFAULT_USER
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Carry on without it.
    return DEFAULT_USER
  }
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser>(readSavedUser)

  const selectUser = useCallback((userId: string) => {
    const next = DEMO_USERS.find((candidate) => candidate.id === userId)
    if (!next) return
    setUser(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next.id)
    } catch {
      // Not remembering the choice is fine.
    }
  }, [])

  const value = useMemo(() => ({ user, users: DEMO_USERS, selectUser }), [user, selectUser])

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

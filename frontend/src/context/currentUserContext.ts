import { createContext } from 'react'
import type { DemoUser } from '../types'

export interface CurrentUserValue {
  user: DemoUser
  users: readonly DemoUser[]
  selectUser: (userId: string) => void
}

export const CurrentUserContext = createContext<CurrentUserValue | null>(null)

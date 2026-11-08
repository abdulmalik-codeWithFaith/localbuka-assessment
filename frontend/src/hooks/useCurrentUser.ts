import { useContext } from 'react'
import { CurrentUserContext, type CurrentUserValue } from '../context/currentUserContext'

export function useCurrentUser(): CurrentUserValue {
  const value = useContext(CurrentUserContext)
  if (!value) throw new Error('useCurrentUser must be used inside <CurrentUserProvider>')
  return value
}

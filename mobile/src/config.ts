import Constants from 'expo-constants'
import type { DemoUser } from './types'

function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL
  if (configured) return configured.replace(/\/$/, '')

  // While developing, Expo knows the computer's address on the network (for example
  // "192.168.1.5:8081"), and the API runs on that same computer, port 3000.
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  if (host) return `http://${host}:3000`

  return 'http://localhost:3000'
}

export const API_URL = resolveApiUrl()

/**
 * The assessment has no login, so the app lets you pick one of the seeded users.
 * (A user can check in once per restaurant per day, so switching user lets you try again.)
 */
export const DEMO_USERS: readonly DemoUser[] = [
  { id: 'user_101', name: 'Chijioke' },
  { id: 'user_102', name: 'Amaka' },
  { id: 'user_103', name: 'Tunde' },
]

export const DEFAULT_USER: DemoUser = { id: 'user_101', name: 'Chijioke' }

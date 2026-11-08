import type { DemoUser } from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/**
 * The assessment has no login, so the app lets you pick one of the seeded users.
 * These match the users in mock_data.json.
 */
export const DEMO_USERS: readonly DemoUser[] = [
  { id: 'user_101', name: 'Chijioke Adebayo' },
  { id: 'user_102', name: 'Amaka Nwosu' },
  { id: 'user_103', name: 'Tunde Bakare' },
]

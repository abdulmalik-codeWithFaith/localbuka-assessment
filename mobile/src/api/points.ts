import type { EarnResult, PointsBalance } from '../types'
import { request } from './client'

export function fetchPointsBalance(userId: string, signal?: AbortSignal): Promise<PointsBalance> {
  return request<PointsBalance>(`/points/balance/${encodeURIComponent(userId)}`, { signal })
}

/** Asks the API to award the 50 check-in points. The API also enforces one check-in per day. */
export function earnCheckInPoints(userId: string, restaurantId: string): Promise<EarnResult> {
  return request<EarnResult>('/points/earn', {
    method: 'POST',
    body: { userId, action: 'check-in', restaurantId },
  })
}

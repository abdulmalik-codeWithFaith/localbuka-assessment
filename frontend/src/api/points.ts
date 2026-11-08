import type { PointsBalance, RedeemResult } from '../types'
import { request } from './client'

export function fetchPointsBalance(userId: string, signal?: AbortSignal): Promise<PointsBalance> {
  return request<PointsBalance>(`/points/balance/${encodeURIComponent(userId)}`, { signal })
}

export function redeemPoints(userId: string, points: number): Promise<RedeemResult> {
  return request<RedeemResult>('/points/redeem', { method: 'POST', body: { userId, points } })
}

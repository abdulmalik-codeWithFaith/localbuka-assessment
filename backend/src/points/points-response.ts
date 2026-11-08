import type { PointsLedger } from './points-ledger.entity.js';

export interface EarnPointsResponse {
  pointsAdded: number;
  newBalance: number;
}

export interface RedeemPointsResponse {
  pointsRedeemed: number;
  newBalance: number;
  voucherCode: string;
}

export interface LedgerEntryResponse {
  id: string;
  action: string;
  points: number;
  createdAt: string;
}

export interface BalanceResponse {
  userId: string;
  balance: number;
  history: LedgerEntryResponse[];
}

export function toLedgerEntryResponse(entry: PointsLedger): LedgerEntryResponse {
  return {
    id: entry.id,
    action: entry.action,
    points: entry.points,
    createdAt: entry.createdAt.toISOString(),
  };
}
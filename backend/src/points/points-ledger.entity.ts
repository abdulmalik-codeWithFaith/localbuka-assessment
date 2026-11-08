import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type LedgerAction = 'check-in' | 'review' | 'referral' | 'redeem';

/** Every point ever earned (positive) or redeemed (negative). The balance is their sum. */
@Entity('points_ledger')
export class PointsLedger {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  action: LedgerAction;

  @Column({ name: 'restaurant_id', type: 'varchar', length: 50, nullable: true })
  restaurantId: string | null;

  @Column({ name: 'referred_user_id', type: 'varchar', length: 50, nullable: true })
  referredUserId: string | null;

  @Column({ name: 'voucher_code', type: 'varchar', length: 30, nullable: true })
  voucherCode: string | null;

  @Column({ type: 'int' })
  points: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
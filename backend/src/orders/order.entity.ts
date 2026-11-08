import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

/** Minimal order record. Only used to check that a referred user completed an order. */
@Entity('orders')
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  userId: string;

  @Column({ name: 'restaurant_id', type: 'varchar', length: 50, nullable: true })
  restaurantId: string | null;

  @Column({ type: 'varchar', length: 20 })
  status: OrderStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
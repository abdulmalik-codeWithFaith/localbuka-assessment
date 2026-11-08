import { Column, Entity, PrimaryColumn, type ValueTransformer } from 'typeorm';

/** Postgres returns DECIMAL as a string; convert it to a number at the entity boundary. */
const decimalToNumber: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity('restaurants')
export class Restaurant {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  cuisine: string;

  @Column({ name: 'price_range', type: 'int' })
  priceRange: number;

  @Column({ type: 'double precision' })
  latitude: number;

  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text', array: true })
  tags: string[];

  @Column({
    name: 'avg_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    transformer: decimalToNumber,
  })
  avgRating: number;

  /** Stored as 0/1 in the schema; exposed as a boolean by the API. */
  @Column({ name: 'is_open', type: 'int' })
  isOpen: number;

  @Column({ type: 'text', array: true })
  images: string[];
}

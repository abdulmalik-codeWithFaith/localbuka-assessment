import { readFileSync } from 'node:fs';
import pg from 'pg';

/**
 * Seed script: resets the five tables and loads them from the official mock_data.json.
 *
 * Run from the backend folder with:  npm run seed
 * WARNING: it TRUNCATES all data. It refuses to run when NODE_ENV=production.
 */

interface MockRestaurant {
  id: string;
  name: string;
  cuisine: string;
  priceRange: number;
  location: { lat: number; lng: number };
  address: string;
  tags: string[];
  avgRating: string;
  isOpen: number;
  images: string[];
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  referredBy: string | null;
}

interface MockReview {
  id: string;
  restaurantId: string;
  userId: string;
  rating: number;
  comment: string;
  tags: string[];
  createdAt: string;
}

interface MockLedgerEntry {
  id: string;
  userId: string;
  action: string;
  points: number;
  createdAt: string;
}

interface MockData {
  restaurants: MockRestaurant[];
  users: MockUser[];
  reviews: MockReview[];
  pointsLedger: MockLedgerEntry[];
}

/**
 * mock_data.json leaves restaurantId out of its ledger entries, but the official
 * DATABASE_SCHEMA.sql seed includes it. The restaurant matters: the "review points once
 * per restaurant" rule cannot work on a NULL restaurant. Values below are taken from
 * DATABASE_SCHEMA.sql (tx_301 matches review rev_201, tx_302 is at the restaurant of rev_202).
 */
const LEDGER_RESTAURANT_IDS: Record<string, string> = {
  tx_301: 'buka_001',
  tx_302: 'buka_002',
};

/**
 * Not in mock_data.json. One completed order for user_102 lets us exercise the referral
 * rule (user_102 was referred by user_101) without inventing a separate orders API.
 */
const SEED_ORDERS = [
  { id: 'ord_401', userId: 'user_102', restaurantId: 'buka_002', status: 'completed' },
];

const mockDataUrl = new URL('../../../mock_data.json', import.meta.url);

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }

  process.loadEnvFile('.env');

  const data: MockData = JSON.parse(readFileSync(mockDataUrl, 'utf-8'));

  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'TRUNCATE orders, points_ledger, reviews, users, restaurants',
    );

    for (const r of data.restaurants) {
      await client.query(
        `INSERT INTO restaurants
           (id, name, cuisine, price_range, latitude, longitude, address, tags, avg_rating, is_open, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          r.id, r.name, r.cuisine, r.priceRange, r.location.lat, r.location.lng,
          r.address, r.tags, Number(r.avgRating), r.isOpen, r.images,
        ],
      );
    }

    // Two passes: referred_by points at another user, so every user must exist first.
    for (const u of data.users) {
      await client.query('INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', [
        u.id, u.name, u.email,
      ]);
    }
    for (const u of data.users) {
      if (u.referredBy !== null) {
        await client.query('UPDATE users SET referred_by = $1 WHERE id = $2', [u.referredBy, u.id]);
      }
    }

    for (const rev of data.reviews) {
      await client.query(
        `INSERT INTO reviews (id, restaurant_id, user_id, rating, comment, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [rev.id, rev.restaurantId, rev.userId, rev.rating, rev.comment, rev.tags, rev.createdAt],
      );
    }

    for (const tx of data.pointsLedger) {
      await client.query(
        `INSERT INTO points_ledger (id, user_id, action, restaurant_id, points, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tx.id, tx.userId, tx.action, LEDGER_RESTAURANT_IDS[tx.id] ?? null, tx.points, tx.createdAt],
      );
    }

    for (const o of SEED_ORDERS) {
      await client.query(
        'INSERT INTO orders (id, user_id, restaurant_id, status) VALUES ($1, $2, $3, $4)',
        [o.id, o.userId, o.restaurantId, o.status],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  for (const table of ['restaurants', 'users', 'reviews', 'points_ledger', 'orders']) {
    const result = await client.query<{ count: string }>(`SELECT COUNT(*) FROM ${table}`);
    console.log(`${table.padEnd(14)} ${result.rows[0]?.count}`);
  }

  await client.end();
}

seed().catch((error: unknown) => {
  console.error('Seeding failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
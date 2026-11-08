import type { DataSource } from 'typeorm';

/** Ids of the rows created by resetDatabase(). */
export const USERS = {
  /** Referrer. */
  ada: 'u_ada',
  /** Referred by Ada and has a completed order. */
  bayo: 'u_bayo',
  /** Referred by Ada but has NO completed order. */
  chidi: 'u_chidi',
  /** Unrelated user. */
  dele: 'u_dele',
} as const;

export const RESTAURANTS = {
  /** Yaba, Lagos. */
  near: 'r_near',
  /** About 1.2 km from `near`. */
  mid: 'r_mid',
  /** Abuja, roughly 525 km from `near`. */
  far: 'r_far',
} as const;

/** Safety net: refuse to wipe any database that is not clearly a test database. */
function assertTestDatabase(dataSource: DataSource): void {
  const name = dataSource.options.database;
  if (typeof name !== 'string' || !name.endsWith('_test')) {
    throw new Error(`Refusing to reset "${String(name)}": test database names must end in "_test".`);
  }
}

/** Empties every table and inserts a small, known data set. */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  assertTestDatabase(dataSource);

  await dataSource.query('TRUNCATE orders, points_ledger, reviews, users, restaurants');

  await dataSource.query(`
    INSERT INTO restaurants (id, name, cuisine, price_range, latitude, longitude, address, tags, avg_rating, is_open, images) VALUES
      ('${RESTAURANTS.near}', 'Near Buka', 'Nigerian', 2, 6.5244, 3.3792, 'Yaba, Lagos', '{jollof}', 4.5, 1, '{}'),
      ('${RESTAURANTS.mid}',  'Mid Buka',  'Traditional Nigerian', 1, 6.5182, 3.3701, 'Yaba, Lagos', '{amala}', 3.0, 0, '{}'),
      ('${RESTAURANTS.far}',  'Far Buka',  'Nigerian', 3, 9.0765, 7.3986, 'Abuja', '{suya}', 4.8, 1, '{}')
  `);

  await dataSource.query(`
    INSERT INTO users (id, name, email) VALUES
      ('${USERS.ada}', 'Ada', 'ada@example.com'),
      ('${USERS.dele}', 'Dele', 'dele@example.com')
  `);
  await dataSource.query(`
    INSERT INTO users (id, name, email, referred_by) VALUES
      ('${USERS.bayo}', 'Bayo', 'bayo@example.com', '${USERS.ada}'),
      ('${USERS.chidi}', 'Chidi', 'chidi@example.com', '${USERS.ada}')
  `);

  await dataSource.query(
    `INSERT INTO orders (id, user_id, restaurant_id, status) VALUES ('o_1', '${USERS.bayo}', '${RESTAURANTS.near}', 'completed')`,
  );
}

/** Gives a user a starting balance without going through the API. */
export async function grantPoints(dataSource: DataSource, userId: string, points: number): Promise<void> {
  await dataSource.query(
    `INSERT INTO points_ledger (id, user_id, action, restaurant_id, points)
     VALUES ('grant_' || $1, $1, 'review', NULL, $2)`,
    [userId, points],
  );
}

/** Inserts a review straight into the database (used to set up review-points tests). */
export async function insertReview(
  dataSource: DataSource,
  userId: string,
  restaurantId: string,
  rating = 5,
): Promise<void> {
  await dataSource.query(
    `INSERT INTO reviews (id, restaurant_id, user_id, rating, comment, tags)
     VALUES ('rev_' || $1 || '_' || $2, $2, $1, $3, NULL, '{}')`,
    [userId, restaurantId, rating],
  );
}
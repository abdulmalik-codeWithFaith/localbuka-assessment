import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { RestaurantDetailResponse } from '../src/restaurants/restaurant-response.js';
import type { CreatedReviewResponse } from '../src/reviews/review-response.js';
import { RESTAURANTS, USERS, resetDatabase } from './helpers/database.js';
import { createTestApp } from './helpers/test-app.js';

interface CreatedBody {
  success: true;
  message: string;
  data: CreatedReviewResponse;
}
interface DetailBody {
  data: RestaurantDetailResponse;
}
interface ErrorBody {
  success: false;
  error: string | string[];
  statusCode: number;
}

const reviewUrl = (restaurantId: string): string => `/restaurants/${restaurantId}/reviews`;

/*
 * The review route allows 10 requests per minute and the limiter keeps its count in the
 * running app. Every group below therefore boots its own app and stays under that limit,
 * except the rate-limit group, which is there to exceed it.
 */

describe('POST /restaurants/:id/reviews', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  const postReview = (restaurantId: string, body: object) =>
    request(app.getHttpServer()).post(reviewUrl(restaurantId)).send(body);

  it('creates a review and returns it in the contract shape', async () => {
    const res = await postReview(RESTAURANTS.mid, {
      userId: USERS.ada,
      rating: 5,
      comment: 'Lovely amala',
      tags: ['amala', 'cheap'],
    }).expect(201);

    const body = res.body as CreatedBody;
    expect(body.success).toBe(true);
    expect(body.message).toBe('Review submitted successfully');
    expect(body.data).toMatchObject({
      restaurantId: RESTAURANTS.mid,
      userId: USERS.ada,
      rating: 5,
      comment: 'Lovely amala',
      tags: ['amala', 'cheap'],
    });
    expect(body.data.id).toMatch(/^rev_/);
  });

  it('recalculates the restaurant average from its reviews and lists them newest first', async () => {
    await postReview(RESTAURANTS.mid, { userId: USERS.ada, rating: 5 }).expect(201);
    await postReview(RESTAURANTS.mid, { userId: USERS.dele, rating: 4 }).expect(201);

    const res = await request(app.getHttpServer()).get(`/restaurants/${RESTAURANTS.mid}`).expect(200);
    const { data } = res.body as DetailBody;

    expect(data.avgRating).toBe(4.5);
    expect(data.reviews.map((r) => r.userName)).toEqual(['Dele', 'Ada']);
  });

  it('rejects a second review by the same user for the same restaurant with 409', async () => {
    await postReview(RESTAURANTS.mid, { userId: USERS.ada, rating: 5 }).expect(201);
    const res = await postReview(RESTAURANTS.mid, { userId: USERS.ada, rating: 1 }).expect(409);

    expect(res.body).toMatchObject({
      success: false,
      error: 'You have already reviewed this restaurant',
      statusCode: 409,
    });

    // The rejected review must not change the average.
    const detail = await request(app.getHttpServer()).get(`/restaurants/${RESTAURANTS.mid}`).expect(200);
    expect((detail.body as DetailBody).data.avgRating).toBe(5);
  });

  it('lets the same user review a different restaurant', async () => {
    await postReview(RESTAURANTS.mid, { userId: USERS.ada, rating: 5 }).expect(201);
    await postReview(RESTAURANTS.near, { userId: USERS.ada, rating: 4 }).expect(201);
  });
});

describe('POST /restaurants/:id/reviews validation', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  it.each([
    ['a rating above 5', { userId: USERS.ada, rating: 6 }],
    ['a rating of 0', { userId: USERS.ada, rating: 0 }],
    ['a decimal rating', { userId: USERS.ada, rating: 4.5 }],
    ['a rating sent as text', { userId: USERS.ada, rating: '5' }],
    ['a missing userId', { rating: 5 }],
    ['tags that are not an array', { userId: USERS.ada, rating: 5, tags: 'spicy' }],
    ['an empty tag', { userId: USERS.ada, rating: 5, tags: ['ok', ''] }],
    ['an unknown field', { userId: USERS.ada, rating: 5, extra: true }],
  ])('rejects %s with 400 and saves nothing', async (_label, body) => {
    const res = await request(app.getHttpServer()).post(reviewUrl(RESTAURANTS.mid)).send(body).expect(400);
    expect((res.body as ErrorBody).success).toBe(false);

    const rows: unknown[] = await dataSource.query('SELECT id FROM reviews');
    expect(rows).toHaveLength(0);
  });

  it('returns 404 for an unknown restaurant', async () => {
    const res = await request(app.getHttpServer())
      .post(reviewUrl('nope'))
      .send({ userId: USERS.ada, rating: 5 })
      .expect(404);
    expect((res.body as ErrorBody).error).toBe('Restaurant not found');
  });
});

describe('POST /restaurants/:id/reviews with simultaneous requests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  it('accepts exactly one of several identical reviews sent at the same moment', async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request(app.getHttpServer()).post(reviewUrl(RESTAURANTS.mid)).send({ userId: USERS.ada, rating: 5 }),
      ),
    );

    const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409]);

    const rows: unknown[] = await dataSource.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND restaurant_id = $2',
      [USERS.ada, RESTAURANTS.mid],
    );
    expect(rows).toHaveLength(1);
  });

  it('keeps the average correct when different users review at the same moment', async () => {
    const ratings: Array<[string, number]> = [
      [USERS.ada, 5],
      [USERS.bayo, 4],
      [USERS.dele, 3],
    ];

    const responses = await Promise.all(
      ratings.map(([userId, rating]) =>
        request(app.getHttpServer()).post(reviewUrl(RESTAURANTS.mid)).send({ userId, rating }),
      ),
    );
    expect(responses.map((res) => res.status)).toEqual([201, 201, 201]);

    const detail = await request(app.getHttpServer()).get(`/restaurants/${RESTAURANTS.mid}`).expect(200);
    const { data } = detail.body as DetailBody;
    expect(data.reviews).toHaveLength(3);
    expect(data.avgRating).toBe(4);
  });
});

describe('POST /restaurants/:id/reviews rate limit', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  it('answers 429 after 10 requests in a minute, but leaves other routes alone', async () => {
    // Invalid bodies are fine: the limiter counts every request before validation runs.
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer()).post(reviewUrl(RESTAURANTS.mid)).send({}).expect(400);
    }

    const limited = await request(app.getHttpServer()).post(reviewUrl(RESTAURANTS.mid)).send({}).expect(429);
    expect(limited.body).toMatchObject({ success: false, statusCode: 429 });

    await request(app.getHttpServer()).get('/restaurants').expect(200);
  });
});
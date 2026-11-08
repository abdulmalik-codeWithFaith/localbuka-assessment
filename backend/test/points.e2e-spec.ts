import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type {
  BalanceResponse,
  EarnPointsResponse,
  RedeemPointsResponse,
} from '../src/points/points-response.js';
import { RESTAURANTS, USERS, grantPoints, insertReview, resetDatabase } from './helpers/database.js';
import { createTestApp } from './helpers/test-app.js';

interface Envelope<T> {
  success: true;
  data: T;
}
interface ErrorBody {
  success: false;
  error: string | string[];
  statusCode: number;
}

describe('points', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  const earn = (body: object) => request(app.getHttpServer()).post('/points/earn').send(body);
  const redeem = (body: object) => request(app.getHttpServer()).post('/points/redeem').send(body);

  const getBalance = async (userId: string): Promise<BalanceResponse> => {
    const res = await request(app.getHttpServer()).get(`/points/balance/${userId}`).expect(200);
    return (res.body as Envelope<BalanceResponse>).data;
  };

  const checkIn = (userId: string, restaurantId: string) =>
    earn({ userId, action: 'check-in', restaurantId });

  describe('POST /points/earn: check-in', () => {
    it('awards 50 points and returns the new balance', async () => {
      const res = await checkIn(USERS.ada, RESTAURANTS.near).expect(201);
      expect((res.body as Envelope<EarnPointsResponse>).data).toEqual({ pointsAdded: 50, newBalance: 50 });
    });

    it('rejects a second check-in at the same restaurant on the same day with 400', async () => {
      await checkIn(USERS.ada, RESTAURANTS.near).expect(201);
      const res = await checkIn(USERS.ada, RESTAURANTS.near).expect(400);

      expect((res.body as ErrorBody).error).toBe('You have already checked in at this restaurant today');
      expect((await getBalance(USERS.ada)).balance).toBe(50);
    });

    it('allows check-ins at different restaurants, and by different users, on the same day', async () => {
      await checkIn(USERS.ada, RESTAURANTS.near).expect(201);
      await checkIn(USERS.ada, RESTAURANTS.mid).expect(201);
      await checkIn(USERS.dele, RESTAURANTS.near).expect(201);
      expect((await getBalance(USERS.ada)).balance).toBe(100);
    });

    it('accepts only one of several identical check-ins sent at the same moment', async () => {
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => checkIn(USERS.ada, RESTAURANTS.near)),
      );

      expect(responses.map((res) => res.status).sort((a, b) => a - b)).toEqual([201, 400, 400, 400, 400, 400]);
      expect((await getBalance(USERS.ada)).balance).toBe(50);
    });

    it('returns 404 for an unknown restaurant or user', async () => {
      await checkIn(USERS.ada, 'nope').expect(404);
      await checkIn('ghost', RESTAURANTS.near).expect(404);
    });
  });

  describe('POST /points/earn: review', () => {
    const earnReview = (userId: string, restaurantId: string) =>
      earn({ userId, action: 'review', restaurantId });

    it('is refused until the user has actually reviewed the restaurant', async () => {
      const res = await earnReview(USERS.ada, RESTAURANTS.near).expect(400);
      expect((res.body as ErrorBody).error).toBe('You must review this restaurant before earning review points');
    });

    it('awards 20 points once per reviewed restaurant', async () => {
      await insertReview(dataSource, USERS.ada, RESTAURANTS.near);

      const res = await earnReview(USERS.ada, RESTAURANTS.near).expect(201);
      expect((res.body as Envelope<EarnPointsResponse>).data).toEqual({ pointsAdded: 20, newBalance: 20 });

      await earnReview(USERS.ada, RESTAURANTS.near).expect(400);
      expect((await getBalance(USERS.ada)).balance).toBe(20);
    });
  });

  describe('POST /points/earn: referral', () => {
    const earnReferral = (userId: string, referredUserId: string) =>
      earn({ userId, action: 'referral', referredUserId });

    it('awards 100 points once when the referred user completed an order', async () => {
      const res = await earnReferral(USERS.ada, USERS.bayo).expect(201);
      expect((res.body as Envelope<EarnPointsResponse>).data).toEqual({ pointsAdded: 100, newBalance: 100 });

      await earnReferral(USERS.ada, USERS.bayo).expect(400);
      expect((await getBalance(USERS.ada)).balance).toBe(100);
    });

    it('is refused when the referred user has no completed order', async () => {
      const res = await earnReferral(USERS.ada, USERS.chidi).expect(400);
      expect((res.body as ErrorBody).error).toBe('The referred user has not completed an order yet');

      // A pending order is not enough either.
      await dataSource.query(
        `INSERT INTO orders (id, user_id, status) VALUES ('o_pending', $1, 'pending')`,
        [USERS.chidi],
      );
      await earnReferral(USERS.ada, USERS.chidi).expect(400);

      await dataSource.query(`UPDATE orders SET status = 'completed' WHERE id = 'o_pending'`);
      await earnReferral(USERS.ada, USERS.chidi).expect(201);
    });

    it('is refused when the referred user was not referred by this user', async () => {
      const res = await earnReferral(USERS.dele, USERS.bayo).expect(400);
      expect((res.body as ErrorBody).error).toBe('This user was not referred by you');
    });

    it('is refused for self-referrals and for unknown referred users', async () => {
      await earnReferral(USERS.ada, USERS.ada).expect(400);
      await earnReferral(USERS.ada, 'ghost').expect(400);
    });
  });

  describe('POST /points/earn: validation', () => {
    it.each([
      ['an unknown action', { userId: USERS.ada, action: 'bogus' }],
      ['a check-in without a restaurant', { userId: USERS.ada, action: 'check-in' }],
      ['a review without a restaurant', { userId: USERS.ada, action: 'review' }],
      ['a referral without a referred user', { userId: USERS.ada, action: 'referral' }],
      ['a missing userId', { action: 'check-in', restaurantId: RESTAURANTS.near }],
      ['an unknown field', { userId: USERS.ada, action: 'check-in', restaurantId: RESTAURANTS.near, points: 999 }],
    ])('rejects %s with 400', async (_label, body) => {
      await earn(body).expect(400);
    });
  });

  describe('POST /points/redeem', () => {
    beforeEach(() => grantPoints(dataSource, USERS.ada, 220));

    it('redeems points, returns a voucher code and records it', async () => {
      const res = await redeem({ userId: USERS.ada, points: 100 }).expect(201);
      const { data } = res.body as Envelope<RedeemPointsResponse>;

      expect(data).toMatchObject({ pointsRedeemed: 100, newBalance: 120 });
      expect(data.voucherCode).toMatch(/^BUKA-DISC-[A-Z2-9]{4}$/);

      const rows: Array<{ points: number; voucher_code: string }> = await dataSource.query(
        `SELECT points, voucher_code FROM points_ledger WHERE action = 'redeem'`,
      );
      expect(rows).toEqual([{ points: -100, voucher_code: data.voucherCode }]);
    });

    it('allows spending the whole balance', async () => {
      await redeem({ userId: USERS.ada, points: 200 }).expect(201);
      const res = await redeem({ userId: USERS.ada, points: 50 }).expect(400);
      expect((res.body as ErrorBody).error).toContain('Insufficient points');
    });

    it('rejects amounts that are not positive multiples of 50, and amounts above the balance', async () => {
      const invalidBodies = [
        { userId: USERS.ada, points: 75 },
        { userId: USERS.ada, points: 0 },
        { userId: USERS.ada, points: -50 },
        { userId: USERS.ada, points: '50' },
        { userId: USERS.ada, points: 50.5 },
        { userId: USERS.ada, points: 5000 },
      ];
      for (const body of invalidBodies) {
        await redeem(body).expect(400);
      }
      expect((await getBalance(USERS.ada)).balance).toBe(220);
    });

    it('returns 404 for an unknown user', async () => {
      await redeem({ userId: 'ghost', points: 50 }).expect(404);
    });

    it('never spends more than the balance when redemptions arrive at the same moment', async () => {
      // 220 points allows four redemptions of 50, not six.
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => redeem({ userId: USERS.ada, points: 50 })),
      );

      const statuses = responses.map((res) => res.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, 201, 201, 201, 400, 400]);

      const codes = responses
        .filter((res) => res.status === 201)
        .map((res) => (res.body as Envelope<RedeemPointsResponse>).data.voucherCode);
      expect(new Set(codes).size).toBe(4);

      expect((await getBalance(USERS.ada)).balance).toBe(20);
    });
  });

  describe('GET /points/balance/:userId', () => {
    it('returns zero and an empty history for a user with no activity', async () => {
      expect(await getBalance(USERS.dele)).toEqual({ userId: USERS.dele, balance: 0, history: [] });
    });

    it('returns the sum of the ledger with the newest entry first', async () => {
      await checkIn(USERS.ada, RESTAURANTS.near).expect(201);
      await earn({ userId: USERS.ada, action: 'referral', referredUserId: USERS.bayo }).expect(201);
      await redeem({ userId: USERS.ada, points: 100 }).expect(201);

      const summary = await getBalance(USERS.ada);
      expect(summary.balance).toBe(50);
      expect(summary.history.map((entry) => [entry.action, entry.points])).toEqual([
        ['redeem', -100],
        ['referral', 100],
        ['check-in', 50],
      ]);
    });

    it('returns 404 for an unknown user', async () => {
      const res = await request(app.getHttpServer()).get('/points/balance/ghost').expect(404);
      expect((res.body as ErrorBody).error).toBe('User not found');
    });
  });
});
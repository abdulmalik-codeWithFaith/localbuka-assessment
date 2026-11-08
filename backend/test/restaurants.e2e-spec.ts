import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { RestaurantDetailResponse, RestaurantResponse } from '../src/restaurants/restaurant-response.js';
import { RESTAURANTS, resetDatabase } from './helpers/database.js';
import { createTestApp } from './helpers/test-app.js';

interface ListBody {
  success: true;
  data: RestaurantResponse[];
}
interface DetailBody {
  success: true;
  data: RestaurantDetailResponse;
}
interface ErrorBody {
  success: false;
  error: string | string[];
  statusCode: number;
}

// Yaba, Lagos: the same point as the `near` restaurant.
const YABA = 'latitude=6.5244&longitude=3.3792';

describe('GET /restaurants', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  const getList = async (query = ''): Promise<RestaurantResponse[]> => {
    const res = await request(app.getHttpServer()).get(`/restaurants${query}`).expect(200);
    return (res.body as ListBody).data;
  };

  it('returns every restaurant, sorted by name, without a distance', async () => {
    const list = await getList();
    expect(list.map((r) => r.name)).toEqual(['Far Buka', 'Mid Buka', 'Near Buka']);
    expect(list.every((r) => r.distance === undefined)).toBe(true);
  });

  it('matches the response contract (boolean isOpen, numeric avgRating, location object)', async () => {
    const mid = (await getList()).find((r) => r.id === RESTAURANTS.mid);
    expect(mid).toMatchObject({
      id: RESTAURANTS.mid,
      isOpen: false,
      avgRating: 3,
      location: { lat: 6.5182, lng: 3.3701 },
      tags: ['amala'],
    });
  });

  it('filters by cuisine, ignoring case', async () => {
    const list = await getList('?cuisine=nigerian');
    expect(list.map((r) => r.id).sort()).toEqual([RESTAURANTS.far, RESTAURANTS.near].sort());
  });

  it('filters by price range', async () => {
    const list = await getList('?priceRange=1');
    expect(list.map((r) => r.id)).toEqual([RESTAURANTS.mid]);
  });

  it('filters by minimum rating', async () => {
    const list = await getList('?minRating=4.6');
    expect(list.map((r) => r.id)).toEqual([RESTAURANTS.far]);
  });

  it('combines filters', async () => {
    const list = await getList('?cuisine=Nigerian&priceRange=2&minRating=4');
    expect(list.map((r) => r.id)).toEqual([RESTAURANTS.near]);
  });

  describe('with coordinates', () => {
    it('adds the distance in km and sorts nearest first, within the default 5 km radius', async () => {
      const list = await getList(`?${YABA}`);
      expect(list.map((r) => r.id)).toEqual([RESTAURANTS.near, RESTAURANTS.mid]);
      expect(list[0]?.distance).toBe(0);
      expect(list[1]?.distance).toBeCloseTo(1.22, 2);
    });

    it('widens the search with the radius parameter', async () => {
      const list = await getList(`?${YABA}&radius=1000`);
      expect(list.map((r) => r.id)).toEqual([RESTAURANTS.near, RESTAURANTS.mid, RESTAURANTS.far]);
      expect(list[2]?.distance).toBeCloseTo(525.9, 1);
    });

    it('excludes restaurants outside a small radius', async () => {
      const list = await getList(`?${YABA}&radius=1`);
      expect(list.map((r) => r.id)).toEqual([RESTAURANTS.near]);
    });

    it('applies the other filters as well', async () => {
      const list = await getList(`?${YABA}&radius=1000&cuisine=Nigerian`);
      expect(list.map((r) => r.id)).toEqual([RESTAURANTS.near, RESTAURANTS.far]);
    });
  });

  describe('validation', () => {
    it.each([
      ['latitude without longitude', '?latitude=6.5'],
      ['longitude without latitude', '?longitude=3.3'],
      ['a non-numeric latitude', '?latitude=abc&longitude=3.3'],
      ['a latitude out of range', '?latitude=91&longitude=3.3'],
      ['a price range above 4', '?priceRange=9'],
      ['a negative radius', `?${YABA}&radius=-3`],
      ['an unknown query parameter', '?foo=1'],
    ])('rejects %s with 400', async (_label, query) => {
      const res = await request(app.getHttpServer()).get(`/restaurants${query}`).expect(400);
      const body = res.body as ErrorBody;
      expect(body.success).toBe(false);
      expect(body.statusCode).toBe(400);
    });
  });
});

describe('GET /restaurants/:id', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  it('returns the restaurant with an empty review list', async () => {
    const res = await request(app.getHttpServer()).get(`/restaurants/${RESTAURANTS.near}`).expect(200);
    const { data } = res.body as DetailBody;
    expect(data.id).toBe(RESTAURANTS.near);
    expect(data.reviews).toEqual([]);
  });

  it('returns 404 in the standard error shape for an unknown id', async () => {
    const res = await request(app.getHttpServer()).get('/restaurants/nope').expect(404);
    expect(res.body).toMatchObject({ success: false, error: 'Restaurant not found', statusCode: 404 });
  });
});
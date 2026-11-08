import { describe, expect, it } from 'vitest';
import { parseRestaurant, RestaurantParseError } from './parse-restaurant.js';

/** What an older upstream service might send: snake_case keys, numbers as strings, 0/1 flags. */
const legacyPayload = {
  id: 'buka_001',
  name: 'Mama Cass Kitchen',
  cuisine: 'Nigerian',
  price_range: '2',
  latitude: '6.5244',
  longitude: '3.3792',
  address: 'Herbert Macaulay Way, Yaba, Lagos',
  tags: ['jollof', 'swallow'],
  avg_rating: '4.50',
  is_open: 1,
  images: ['https://example.com/a.jpg'],
};

const expected = {
  id: 'buka_001',
  name: 'Mama Cass Kitchen',
  cuisine: 'Nigerian',
  priceRange: 2,
  location: { lat: 6.5244, lng: 3.3792 },
  address: 'Herbert Macaulay Way, Yaba, Lagos',
  tags: ['jollof', 'swallow'],
  avgRating: 4.5,
  isOpen: true,
  images: ['https://example.com/a.jpg'],
};

function issuesOf(raw: unknown): readonly string[] {
  try {
    parseRestaurant(raw);
  } catch (error) {
    if (error instanceof RestaurantParseError) return error.issues;
    throw error;
  }
  throw new Error('Expected parseRestaurant to throw');
}

describe('parseRestaurant', () => {
  describe('accepted input', () => {
    it('converts a legacy snake_case payload with string numbers into typed values', () => {
      expect(parseRestaurant(legacyPayload)).toEqual(expected);
    });

    it('accepts the contract\'s own camelCase shape with a nested location', () => {
      const payload = { ...expected, location: { lat: 6.5244, lng: 3.3792 } };
      expect(parseRestaurant(payload)).toEqual(expected);
    });

    it('accepts short coordinate names (lat/lng) at the top level', () => {
      const { latitude, longitude, ...rest } = legacyPayload;
      expect(parseRestaurant({ ...rest, lat: latitude, lng: longitude })).toEqual(expected);
    });

    it.each([
      [1, true],
      ['1', true],
      ['true', true],
      [true, true],
      [0, false],
      ['0', false],
      ['false', false],
      [false, false],
    ])('reads the open flag %j as %s', (flag, result) => {
      expect(parseRestaurant({ ...legacyPayload, is_open: flag }).isOpen).toBe(result);
    });

    it('defaults missing tags and images to empty lists', () => {
      const { tags, images, ...rest } = legacyPayload;
      expect(tags).toBeDefined();
      expect(images).toBeDefined();
      expect(parseRestaurant(rest)).toMatchObject({ tags: [], images: [] });
    });

    it('keeps a distance when one is present, converting it to a number', () => {
      expect(parseRestaurant({ ...legacyPayload, distance: '1.22' }).distance).toBe(1.22);
    });

    it('trims surrounding spaces from text fields', () => {
      expect(parseRestaurant({ ...legacyPayload, name: '  Mama Cass Kitchen  ' }).name).toBe('Mama Cass Kitchen');
    });
  });

  describe('rejected input', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['text', 'string'],
      [42, 'number'],
      [[], 'an array'],
    ])('rejects %j (not an object)', (raw, described) => {
      expect(issuesOf(raw)).toEqual([`expected an object but received ${described}`]);
    });

    it('reports every problem at once, naming each field', () => {
      const issues = issuesOf({
        id: '',
        name: 42,
        price_range: '9',
        latitude: 'north',
        longitude: 3.3,
        address: 'x',
        avg_rating: '6',
        is_open: 'maybe',
        tags: 'jollof',
      });

      expect(issues).toEqual(
        expect.arrayContaining([
          'id must be a non-empty string',
          'name must be a non-empty string',
          'cuisine must be a non-empty string',
          'priceRange must be a whole number between 1 and 4',
          'latitude must be a number',
          'avgRating must be between 0 and 5',
          'isOpen must be true/false (or 1/0)',
          'tags must be an array of strings',
        ]),
      );
    });

    it('puts all the issues in the error message too', () => {
      expect(() => parseRestaurant({})).toThrow(/Invalid restaurant payload: .*id must be a non-empty string/);
    });

    it.each([
      ['price_range', '2.5', 'priceRange must be a whole number between 1 and 4'],
      ['price_range', 0, 'priceRange must be a whole number between 1 and 4'],
      ['price_range', 5, 'priceRange must be a whole number between 1 and 4'],
      ['price_range', 'abc', 'priceRange must be a number'],
      ['price_range', '', 'priceRange must be a number'],
      ['latitude', '91', 'latitude must be between -90 and 90'],
      ['longitude', -181, 'longitude must be between -180 and 180'],
      ['avg_rating', '1e3', 'avgRating must be a number'],
      ['avg_rating', 'NaN', 'avgRating must be a number'],
      ['avg_rating', Infinity, 'avgRating must be a number'],
      ['avg_rating', -0.1, 'avgRating must be between 0 and 5'],
    ])('rejects %s = %j', (field, value, message) => {
      expect(issuesOf({ ...legacyPayload, [field]: value })).toContain(message);
    });

    it('rejects whitespace-only names and non-string tags', () => {
      expect(issuesOf({ ...legacyPayload, name: '   ' })).toContain('name must be a non-empty string');
      expect(issuesOf({ ...legacyPayload, tags: ['ok', 7] })).toContain('tags must be an array of strings');
    });

    it('rejects a negative distance', () => {
      expect(issuesOf({ ...legacyPayload, distance: '-3' })).toContain('distance must be a number of 0 or more');
    });
  });
});
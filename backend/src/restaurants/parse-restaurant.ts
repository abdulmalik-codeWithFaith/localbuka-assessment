import type { RestaurantResponse } from './restaurant-response.js';

/** Thrown by parseRestaurant. `issues` lists every problem found, not just the first. */
export class RestaurantParseError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid restaurant payload: ${issues.join('; ')}`);
    this.name = 'RestaurantParseError';
    this.issues = issues;
  }
}

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The first of several possible key names that is present (legacy payloads use snake_case). */
function pick(record: RawRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

/** Accepts finite numbers and plain decimal strings such as "4.5". Rejects "", "1e3", "abc", "NaN". */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return Number(value.trim());
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

/**
 * Turns an untrusted payload (snake_case keys, numbers sent as strings, 0/1 flags) into the
 * strictly typed shape of API_CONTRACTS.md. Throws RestaurantParseError listing every problem.
 */
export function parseRestaurant(raw: unknown): RestaurantResponse {
  if (!isRecord(raw)) {
    throw new RestaurantParseError([`expected an object but received ${raw === null ? 'null' : Array.isArray(raw) ? 'an array' : typeof raw}`]);
  }

  const issues: string[] = [];

  const text = (label: string, ...keys: string[]): string => {
    const value = pick(raw, ...keys);
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    issues.push(`${label} must be a non-empty string`);
    return '';
  };

  const bounded = (label: string, value: unknown, min: number, max: number, integer = false): number => {
    const parsed = toNumber(value);
    if (parsed === null) {
      issues.push(`${label} must be a number`);
      return 0;
    }
    if (parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
      issues.push(`${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}`);
      return 0;
    }
    return parsed;
  };

  const list = (label: string, ...keys: string[]): string[] => {
    const value = pick(raw, ...keys);
    if (value === undefined) return [];
    if (Array.isArray(value) && value.every((item): item is string => typeof item === 'string')) {
      return value;
    }
    issues.push(`${label} must be an array of strings`);
    return [];
  };

  const nested = isRecord(raw.location) ? raw.location : undefined;
  const latitude = nested ? pick(nested, 'lat', 'latitude') : pick(raw, 'latitude', 'lat');
  const longitude = nested ? pick(nested, 'lng', 'longitude') : pick(raw, 'longitude', 'lng');

  const openValue = pick(raw, 'isOpen', 'is_open');
  const isOpen = toBoolean(openValue);
  if (isOpen === null) issues.push('isOpen must be true/false (or 1/0)');

  const restaurant: RestaurantResponse = {
    id: text('id', 'id'),
    name: text('name', 'name'),
    cuisine: text('cuisine', 'cuisine'),
    priceRange: bounded('priceRange', pick(raw, 'priceRange', 'price_range'), 1, 4, true),
    location: {
      lat: bounded('latitude', latitude, -90, 90),
      lng: bounded('longitude', longitude, -180, 180),
    },
    address: text('address', 'address'),
    tags: list('tags', 'tags'),
    avgRating: bounded('avgRating', pick(raw, 'avgRating', 'avg_rating'), 0, 5),
    isOpen: isOpen ?? false,
    images: list('images', 'images'),
  };

  const distance = pick(raw, 'distance');
  if (distance !== undefined) {
    const parsedDistance = toNumber(distance);
    if (parsedDistance === null || parsedDistance < 0) issues.push('distance must be a number of 0 or more');
    else restaurant.distance = parsedDistance;
  }

  if (issues.length > 0) throw new RestaurantParseError(issues);
  return restaurant;
}
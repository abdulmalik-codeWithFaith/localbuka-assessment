import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RestaurantPayloadDto } from './restaurant-payload.dto.js';

// The same options the application uses in app.setup.ts.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const legacyBody = {
  id: 'buka_001',
  name: 'Mama Cass Kitchen',
  cuisine: 'Nigerian',
  price_range: '2',
  latitude: '6.5244',
  longitude: '3.3792',
  address: 'Yaba, Lagos',
  avg_rating: '4.50',
  is_open: '1',
  tags: ['jollof'],
};

const run = (body: unknown) => pipe.transform(body, { type: 'body', metatype: RestaurantPayloadDto });

describe('RestaurantPayloadDto through the ValidationPipe', () => {
  it('maps snake_case keys and converts strings to numbers and booleans', async () => {
    const dto = (await run(legacyBody)) as RestaurantPayloadDto;

    expect(dto).toBeInstanceOf(RestaurantPayloadDto);
    expect(dto).toMatchObject({
      priceRange: 2,
      latitude: 6.5244,
      longitude: 3.3792,
      avgRating: 4.5,
      isOpen: true,
    });
  });

  it('rejects out-of-range values with messages that name the property', async () => {
    const error = await run({ ...legacyBody, price_range: '9', avg_rating: '7' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    const { message } = (error as BadRequestException).getResponse() as { message: string[] };
    expect(message).toEqual(
      expect.arrayContaining(['priceRange must not be greater than 4', 'avgRating must not be greater than 5']),
    );
  });

  it('rejects a flag it cannot understand instead of guessing', async () => {
    const error = await run({ ...legacyBody, is_open: 'maybe' }).catch((caught: unknown) => caught);
    const { message } = (error as BadRequestException).getResponse() as { message: string[] };
    expect(message).toContain('isOpen must be a boolean value');
  });
});
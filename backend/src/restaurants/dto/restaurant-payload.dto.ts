import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Illustration for SOLUTION.md (Q1): how the same clean-up that parseRestaurant() does by hand
 * is expressed for NestJS's global ValidationPipe with class-transformer and class-validator.
 * No endpoint uses it: this API's own payloads already follow the contract.
 *
 * - @Expose({ name }) maps a snake_case key to the camelCase property.
 * - @Type(() => Number) turns "4.5" into 4.5 before validation.
 * - @Transform converts 0/1/"true"/"false" flags, and leaves anything else untouched so
 *   @IsBoolean can reject it.
 */
const toBooleanOrOriginal = ({ value }: { value: unknown }): unknown => {
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return value;
};

export class RestaurantPayloadDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  cuisine: string;

  @Expose({ name: 'price_range' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  priceRange: number;

  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @Expose({ name: 'avg_rating' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  avgRating: number;

  @Expose({ name: 'is_open' })
  @Transform(toBooleanOrOriginal)
  @IsBoolean()
  isOpen: boolean;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
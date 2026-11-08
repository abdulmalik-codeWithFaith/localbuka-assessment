import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto.js';
import { Restaurant } from './restaurant.entity.js';
import { Review } from '../reviews/review.entity.js';
import { toReviewResponse } from '../reviews/review-response.js';
import {
  RestaurantDetailResponse,
  RestaurantResponse,
  toRestaurantResponse,
} from './restaurant-response.js';

const DEFAULT_RADIUS_KM = 5;
const EARTH_RADIUS_KM = 6371;
const KM_PER_DEGREE_LATITUDE = 111.32;

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async findOne(id: string): Promise<RestaurantDetailResponse> {
    const restaurant = await this.restaurantRepository.findOneBy({ id });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const reviews = await this.reviewRepository.find({
      where: { restaurantId: id },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return { ...toRestaurantResponse(restaurant), reviews: reviews.map(toReviewResponse) };
  }

  async findAll(query: QueryRestaurantsDto): Promise<RestaurantResponse[]> {
    const { latitude, longitude, cuisine, priceRange, minRating } = query;

    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException('latitude and longitude must be provided together');
    }

    const qb = this.restaurantRepository.createQueryBuilder('r');

    if (cuisine !== undefined) {
      qb.andWhere('LOWER(r.cuisine) = LOWER(:cuisine)', { cuisine });
    }
    if (priceRange !== undefined) {
      qb.andWhere('r.priceRange = :priceRange', { priceRange });
    }
    if (minRating !== undefined) {
      qb.andWhere('r.avgRating >= :minRating', { minRating });
    }

    if (latitude === undefined || longitude === undefined) {
      const restaurants = await qb.orderBy('r.name', 'ASC').getMany();
      return restaurants.map((restaurant) => toRestaurantResponse(restaurant));
    }

    const radius = query.radius ?? DEFAULT_RADIUS_KM;

    // Haversine great-circle distance in km, computed by PostgreSQL.
    // LEAST(1, ...) guards against floating point values marginally above 1.
    const distanceSql = `(2 * ${EARTH_RADIUS_KM} * ASIN(SQRT(LEAST(1,
      POWER(SIN(RADIANS(r.latitude - :latitude) / 2), 2) +
      COS(RADIANS(:latitude)) * COS(RADIANS(r.latitude)) *
      POWER(SIN(RADIANS(r.longitude - :longitude) / 2), 2)))))`;

    // Cheap rectangular pre-filter that can use the (latitude, longitude) index.
    // It only discards rows that are certainly too far; the Haversine check below is exact.
    const latDelta = radius / KM_PER_DEGREE_LATITUDE;
    const lngDelta =
      radius / (KM_PER_DEGREE_LATITUDE * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));

    qb.addSelect(distanceSql, 'distance')
      .andWhere('r.latitude BETWEEN :minLat AND :maxLat', {
        minLat: latitude - latDelta,
        maxLat: latitude + latDelta,
      })
      .andWhere('r.longitude BETWEEN :minLng AND :maxLng', {
        minLng: longitude - lngDelta,
        maxLng: longitude + lngDelta,
      })
      .andWhere(`${distanceSql} <= :radius`)
      .setParameters({ latitude, longitude, radius })
      .orderBy('distance', 'ASC')
      .addOrderBy('r.name', 'ASC');

    const { entities, raw } = await qb.getRawAndEntities();
    const rows: Array<{ distance: unknown }> = raw;

    return entities.map((restaurant, index) => {
      const distanceKm = Number(rows[index]?.distance);
      return toRestaurantResponse(restaurant, Math.round(distanceKm * 100) / 100);
    });
  }
}
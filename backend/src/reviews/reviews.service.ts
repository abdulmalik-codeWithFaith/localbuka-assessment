import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generateId } from '../common/utils/id.js';
import { isUniqueViolation } from '../common/utils/postgres-errors.js';
import { Restaurant } from '../restaurants/restaurant.entity.js';
import { User } from '../users/user.entity.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { CreatedReviewResponse, toCreatedReviewResponse } from './review-response.js';
import { Review } from './review.entity.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly dataSource: DataSource) {}

  async create(restaurantId: string, dto: CreateReviewDto): Promise<CreatedReviewResponse> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock the restaurant row so two simultaneous reviews cannot recalculate the
        // average from stale data. The second request waits here until the first commits.
        const restaurant = await manager.findOne(Restaurant, {
          where: { id: restaurantId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!restaurant) {
          throw new NotFoundException('Restaurant not found');
        }

        const userExists = await manager.existsBy(User, { id: dto.userId });
        if (!userExists) {
          throw new NotFoundException('User not found');
        }

        // Duplicates are rejected by the database constraint uq_user_restaurant_review,
        // so the rule holds even if two identical requests arrive at the same moment.
        const review = await manager.save(
          manager.create(Review, {
            id: generateId('rev'),
            restaurantId,
            userId: dto.userId,
            rating: dto.rating,
            comment: dto.comment ?? null,
            tags: dto.tags ?? [],
          }),
        );

        await manager.query(
          `UPDATE restaurants
              SET avg_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE restaurant_id = $1)
            WHERE id = $1`,
          [restaurantId],
        );

        return toCreatedReviewResponse(review);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('You have already reviewed this restaurant');
      }
      throw error;
    }
  }
}
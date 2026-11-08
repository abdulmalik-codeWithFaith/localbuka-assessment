import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { ApiSuccessResponse } from '../common/types/api-response.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import type { CreatedReviewResponse } from './review-response.js';
import { ReviewsService } from './reviews.service.js';

@Controller('restaurants/:restaurantId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Basic abuse protection: at most 10 review submissions per minute per client IP.
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ApiSuccessResponse<CreatedReviewResponse>> {
    const data = await this.reviewsService.create(restaurantId, dto);
    return { success: true, message: 'Review submitted successfully', data };
  }
}
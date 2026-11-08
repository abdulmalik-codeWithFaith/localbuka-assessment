import type { Review } from './review.entity.js';

/** Review as embedded in GET /restaurants/:id (includes the reviewer's name). */
export interface ReviewResponse {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}

/** Review as returned by POST /restaurants/:id/reviews. */
export interface CreatedReviewResponse {
  id: string;
  restaurantId: string;
  userId: string;
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}

/** Expects the `user` relation to be loaded. */
export function toReviewResponse(review: Review): ReviewResponse {
  return {
    id: review.id,
    userId: review.userId,
    userName: review.user.name,
    rating: review.rating,
    comment: review.comment,
    tags: review.tags,
    createdAt: review.createdAt.toISOString(),
  };
}

export function toCreatedReviewResponse(review: Review): CreatedReviewResponse {
  return {
    id: review.id,
    restaurantId: review.restaurantId,
    userId: review.userId,
    rating: review.rating,
    comment: review.comment,
    tags: review.tags,
    createdAt: review.createdAt.toISOString(),
  };
}
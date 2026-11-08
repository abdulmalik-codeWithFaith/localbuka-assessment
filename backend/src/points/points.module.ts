import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity.js';
import { Restaurant } from '../restaurants/restaurant.entity.js';
import { Review } from '../reviews/review.entity.js';
import { User } from '../users/user.entity.js';
import { PointsLedger } from './points-ledger.entity.js';
import { PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PointsLedger, Order, User, Restaurant, Review])],
  controllers: [PointsController],
  providers: [PointsService],
})
export class PointsModule {}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { generateId, generateVoucherCode } from '../common/utils/id.js';
import { isUniqueViolation } from '../common/utils/postgres-errors.js';
import { Order } from '../orders/order.entity.js';
import { Restaurant } from '../restaurants/restaurant.entity.js';
import { Review } from '../reviews/review.entity.js';
import { User } from '../users/user.entity.js';
import { EarnAction, EarnPointsDto } from './dto/earn-points.dto.js';
import { RedeemPointsDto } from './dto/redeem-points.dto.js';
import { PointsLedger } from './points-ledger.entity.js';
import {
  BalanceResponse,
  EarnPointsResponse,
  RedeemPointsResponse,
  toLedgerEntryResponse,
} from './points-response.js';

const POINTS_PER_ACTION: Record<EarnAction, number> = {
  'check-in': 50,
  review: 20,
  referral: 100,
};

/** Shown when the database rejects an earn as a duplicate (see migration 002's unique indexes). */
const DUPLICATE_MESSAGES: Record<EarnAction, string> = {
  'check-in': 'You have already checked in at this restaurant today',
  review: 'Review points were already earned for this restaurant',
  referral: 'Referral points were already earned for this user',
};

const VOUCHER_CODE_CONSTRAINT = 'uq_ledger_voucher_code';
const MAX_VOUCHER_ATTEMPTS = 5;

interface NewEarnEntry {
  id: string;
  userId: string;
  action: EarnAction;
  restaurantId: string | null;
  referredUserId: string | null;
  points: number;
}

@Injectable()
export class PointsService {
  constructor(private readonly dataSource: DataSource) {}

  async earn(dto: EarnPointsDto): Promise<EarnPointsResponse> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockUser(manager, dto.userId);

        const entry = await this.buildEarnEntry(manager, dto);
        // Duplicate check-ins, review points and referrals are stopped by unique
        // indexes, so the rules hold even for simultaneous requests.
        await manager.insert(PointsLedger, entry);

        return { pointsAdded: entry.points, newBalance: await this.getBalance(manager, dto.userId) };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(DUPLICATE_MESSAGES[dto.action]);
      }
      throw error;
    }
  }

  async redeem(dto: RedeemPointsDto): Promise<RedeemPointsResponse> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.dataSource.transaction((manager) => this.redeemInTransaction(manager, dto));
      } catch (error) {
        // A random voucher code collided with an existing one: just try a new code.
        const codeCollided = isUniqueViolation(error, VOUCHER_CODE_CONSTRAINT);
        if (!codeCollided || attempt >= MAX_VOUCHER_ATTEMPTS) {
          throw error;
        }
      }
    }
  }

  async getBalanceSummary(userId: string): Promise<BalanceResponse> {
    const manager = this.dataSource.manager;

    if (!(await manager.existsBy(User, { id: userId }))) {
      throw new NotFoundException('User not found');
    }

    const [balance, history] = await Promise.all([
      this.getBalance(manager, userId),
      manager.find(PointsLedger, { where: { userId }, order: { createdAt: 'DESC', id: 'DESC' } }),
    ]);

    return { userId, balance, history: history.map(toLedgerEntryResponse) };
  }

  private async redeemInTransaction(
    manager: EntityManager,
    dto: RedeemPointsDto,
  ): Promise<RedeemPointsResponse> {
    // Locking the user row makes simultaneous redemptions run one after another, so the
    // balance check below can never be based on stale data (no double spending).
    await this.lockUser(manager, dto.userId);

    const balance = await this.getBalance(manager, dto.userId);
    if (dto.points > balance) {
      throw new BadRequestException(
        `Insufficient points: you have ${balance} but tried to redeem ${dto.points}`,
      );
    }

    const voucherCode = generateVoucherCode();
    await manager.insert(PointsLedger, {
      id: generateId('tx'),
      userId: dto.userId,
      action: 'redeem',
      restaurantId: null,
      referredUserId: null,
      voucherCode,
      points: -dto.points,
    });

    return { pointsRedeemed: dto.points, newBalance: balance - dto.points, voucherCode };
  }

  /** Checks that the user is allowed to earn for this action and describes the ledger row. */
  private async buildEarnEntry(manager: EntityManager, dto: EarnPointsDto): Promise<NewEarnEntry> {
    const base = {
      id: generateId('tx'),
      userId: dto.userId,
      action: dto.action,
      points: POINTS_PER_ACTION[dto.action],
    };

    switch (dto.action) {
      case 'check-in': {
        const restaurantId = this.requireField(dto.restaurantId, 'restaurantId');
        await this.assertRestaurantExists(manager, restaurantId);
        return { ...base, restaurantId, referredUserId: null };
      }

      case 'review': {
        const restaurantId = this.requireField(dto.restaurantId, 'restaurantId');
        await this.assertRestaurantExists(manager, restaurantId);
        const hasReview = await manager.existsBy(Review, { userId: dto.userId, restaurantId });
        if (!hasReview) {
          throw new BadRequestException('You must review this restaurant before earning review points');
        }
        return { ...base, restaurantId, referredUserId: null };
      }

      case 'referral': {
        const referredUserId = this.requireField(dto.referredUserId, 'referredUserId');
        await this.assertValidReferral(manager, dto.userId, referredUserId);
        return { ...base, restaurantId: null, referredUserId };
      }
    }
  }

  private async assertValidReferral(
    manager: EntityManager,
    referrerId: string,
    referredUserId: string,
  ): Promise<void> {
    if (referredUserId === referrerId) {
      throw new BadRequestException('You cannot refer yourself');
    }

    const referredUser = await manager.findOneBy(User, { id: referredUserId });
    if (!referredUser) {
      throw new BadRequestException('Referred user does not exist');
    }
    if (referredUser.referredBy !== referrerId) {
      throw new BadRequestException('This user was not referred by you');
    }

    const hasCompletedOrder = await manager.existsBy(Order, {
      userId: referredUserId,
      status: 'completed',
    });
    if (!hasCompletedOrder) {
      throw new BadRequestException('The referred user has not completed an order yet');
    }
  }

  private async lockUser(manager: EntityManager, userId: string): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async assertRestaurantExists(manager: EntityManager, restaurantId: string): Promise<void> {
    if (!(await manager.existsBy(Restaurant, { id: restaurantId }))) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  /** The DTO already guarantees this; the check lets TypeScript (and a reader) know it too. */
  private requireField(value: string | undefined, name: string): string {
    if (value === undefined) {
      throw new BadRequestException(`${name} is required for this action`);
    }
    return value;
  }

  private async getBalance(manager: EntityManager, userId: string): Promise<number> {
    const row = await manager
      .createQueryBuilder(PointsLedger, 'l')
      .select('COALESCE(SUM(l.points), 0)', 'balance')
      .where('l.userId = :userId', { userId })
      .getRawOne<{ balance: string }>();
    return Number(row?.balance ?? 0);
  }
}
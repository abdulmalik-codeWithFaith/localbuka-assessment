import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { ApiSuccessResponse } from '../common/types/api-response.js';
import { EarnPointsDto } from './dto/earn-points.dto.js';
import { RedeemPointsDto } from './dto/redeem-points.dto.js';
import type { BalanceResponse, EarnPointsResponse, RedeemPointsResponse } from './points-response.js';
import { PointsService } from './points.service.js';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Post('earn')
  async earn(@Body() dto: EarnPointsDto): Promise<ApiSuccessResponse<EarnPointsResponse>> {
    return { success: true, data: await this.pointsService.earn(dto) };
  }

  @Post('redeem')
  async redeem(@Body() dto: RedeemPointsDto): Promise<ApiSuccessResponse<RedeemPointsResponse>> {
    return { success: true, data: await this.pointsService.redeem(dto) };
  }

  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string): Promise<ApiSuccessResponse<BalanceResponse>> {
    return { success: true, data: await this.pointsService.getBalanceSummary(userId) };
  }
}
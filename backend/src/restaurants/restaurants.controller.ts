import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ApiSuccessResponse } from '../common/types/api-response.js';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto.js';
import type { RestaurantDetailResponse, RestaurantResponse } from './restaurant-response.js';
import { RestaurantsService } from './restaurants.service.js';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  async findAll(
    @Query() query: QueryRestaurantsDto,
  ): Promise<ApiSuccessResponse<RestaurantResponse[]>> {
    const data = await this.restaurantsService.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiSuccessResponse<RestaurantDetailResponse>> {
    const data = await this.restaurantsService.findOne(id);
    return { success: true, data };
  }
}
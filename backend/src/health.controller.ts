import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface HealthResponse {
  success: true;
  data: { status: 'ok'; database: 'up' };
}

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthResponse> {
    // Throws if the database is unreachable, which the exception filter reports as a 500.
    await this.dataSource.query('SELECT 1');
    return { success: true, data: { status: 'ok', database: 'up' } };
  }
}
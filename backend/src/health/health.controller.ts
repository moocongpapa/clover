import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth() {
    const dbStatus = await this.healthService.checkDatabase();
    return {
      status: dbStatus ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus ? 'connected' : 'disconnected',
      },
    };
  }

  @Get('ping')
  getPing() {
    return 'pong';
  }
}

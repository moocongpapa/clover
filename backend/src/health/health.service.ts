import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Render Free Tier Sleep Prevention:
   * Pings the server's public endpoint every 5 minutes to prevent cold starts/spin-down.
   */
  @Cron('*/5 * * * *')
  async handleKeepAlivePing() {
    const publicUrl =
      this.config.get<string>('API_PUBLIC_URL') ||
      'https://clover-backend-vm9k.onrender.com';

    if (!publicUrl) return;

    try {
      const target = `${publicUrl.replace(/\/$/, '')}/health`;
      const res = await axios.get(target, { timeout: 10000 });
      this.logger.log(`[KeepAlive] Self-ping successful: ${target} (${res.status})`);
    } catch (err: any) {
      this.logger.warn(`[KeepAlive] Self-ping warning: ${err.message}`);
    }
  }
}

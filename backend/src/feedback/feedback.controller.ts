import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  async listAll() {
    return this.service.listAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: { content: string },
  ) {
    return this.service.create(user.id, user.displayName, dto.content);
  }
}

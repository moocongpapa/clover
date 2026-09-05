import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateFeedbackDto } from './feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @UseGuards(AdminGuard)
  async listAll() {
    return this.service.listAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFeedbackDto) {
    return this.service.create(user.id, user.displayName, dto.content);
  }
}

import { Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listForUser(user.id);
  }

  /** E2E/개발용: 하루 전 리마인더 크론 수동 실행 */
  @Post('dev/trigger-reminders')
  async triggerReminders() {
    if (this.config.get<string>('DEV_LOGIN_ENABLED') !== 'true') {
      throw new ForbiddenException('개발 모드에서만 사용할 수 있습니다.');
    }
    await this.notificationsService.sendReminderNotifications();
    return { ok: true };
  }
}

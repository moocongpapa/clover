import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('read')
  @UseGuards(JwtAuthGuard)
  markRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete('all')
  @UseGuards(JwtAuthGuard)
  deleteAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Delete('selected')
  @UseGuards(JwtAuthGuard)
  deleteSelected(
    @CurrentUser() user: AuthUser,
    @Body() body: { ids: string[] },
  ) {
    return this.notificationsService.deleteSelectedForUser(user.id, body?.ids ?? []);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteSingle(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteSelectedForUser(user.id, [id]);
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

  /** 개발용: 실시간 FCM 테스트 알림 전송 */
  @Post('dev/test-fcm')
  @UseGuards(JwtAuthGuard)
  async testFcm(@CurrentUser() user: AuthUser) {
    if (this.config.get<string>('DEV_LOGIN_ENABLED') !== 'true') {
      throw new ForbiddenException('개발 모드에서만 사용할 수 있습니다.');
    }
    await this.notificationsService.sendTestFcm(user.id);
    return { ok: true };
  }

  /** 개발용: 실시간 카카오톡 테스트 알림 전송 */
  @Post('dev/test-kakao')
  @UseGuards(JwtAuthGuard)
  async testKakao(@CurrentUser() user: AuthUser) {
    if (this.config.get<string>('DEV_LOGIN_ENABLED') !== 'true') {
      throw new ForbiddenException('개발 모드에서만 사용할 수 있습니다.');
    }
    const res = await this.notificationsService.sendTestKakao(user.id);
    return { ok: true, result: res };
  }
}

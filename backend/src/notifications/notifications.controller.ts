import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
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

  @Delete()
  @UseGuards(JwtAuthGuard)
  deleteRoot(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  postRoot(@CurrentUser() user: AuthUser, @Body() body: { ids?: string[] }) {
    if (body?.ids && body.ids.length > 0) {
      return this.notificationsService.deleteSelectedForUser(user.id, body.ids);
    }
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Delete('all')
  @UseGuards(JwtAuthGuard)
  deleteAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Post('delete-all')
  @UseGuards(JwtAuthGuard)
  deleteAllPost(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Delete('clear')
  @UseGuards(JwtAuthGuard)
  deleteClear(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Post('clear')
  @UseGuards(JwtAuthGuard)
  postClear(@CurrentUser() user: AuthUser) {
    return this.notificationsService.deleteAllForUser(user.id);
  }

  @Post('delete-batch')
  @UseGuards(JwtAuthGuard)
  deleteSelected(
    @CurrentUser() user: AuthUser,
    @Body() body: { ids: string[] },
  ) {
    return this.notificationsService.deleteSelectedForUser(
      user.id,
      body?.ids ?? [],
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteSingle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.deleteSelectedForUser(user.id, [id]);
  }

  /** E2E/개발용: 하루 전 리마인더 크론 수동 실행 */
  @Post('dev/trigger-reminders')
  async triggerReminders(@Headers('x-e2e-test-secret') secret?: string) {
    this.assertDevEndpointAllowed(secret);
    await this.notificationsService.sendReminderNotifications(true);
    return { ok: true };
  }

  /** 개발용: 실시간 FCM 테스트 알림 전송 */
  @Post('dev/test-fcm')
  @UseGuards(JwtAuthGuard)
  async testFcm(
    @CurrentUser() user: AuthUser,
    @Headers('x-e2e-test-secret') secret?: string,
  ) {
    this.assertDevEndpointAllowed(secret);
    await this.notificationsService.sendTestFcm(user.id);
    return { ok: true };
  }

  /** 개발용: 실시간 카카오톡 테스트 알림 전송 */
  @Post('dev/test-kakao')
  @UseGuards(JwtAuthGuard)
  async testKakao(
    @CurrentUser() user: AuthUser,
    @Headers('x-e2e-test-secret') secret?: string,
  ) {
    this.assertDevEndpointAllowed(secret);
    const res = await this.notificationsService.sendTestKakao(user.id);
    return { ok: true, result: res };
  }

  private assertDevEndpointAllowed(providedSecret?: string) {
    const environment = this.config.get<string>('NODE_ENV') ?? 'development';
    const expectedSecret = this.config.get<string>('E2E_TEST_SECRET');
    const isDevelopment =
      environment === 'development' || environment === 'test';

    if (
      !isDevelopment ||
      this.config.get<string>('DEV_LOGIN_ENABLED') !== 'true' ||
      !expectedSecret ||
      !providedSecret ||
      !this.secretsMatch(expectedSecret, providedSecret)
    ) {
      throw new ForbiddenException(
        '개발 전용 엔드포인트에 접근할 수 없습니다.',
      );
    }
  }

  private secretsMatch(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }
}

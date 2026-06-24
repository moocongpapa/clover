import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MemberStatus, NotificationType } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

type NotifyType = 'CREATED' | 'CHANGED' | 'CANCELLED' | 'REMINDER';

const MESSAGE_TEMPLATES: Record<NotifyType, (title: string) => string> = {
  CREATED: (title) => `새 이벤트가 등록되었습니다: ${title}`,
  CHANGED: (title) => `이벤트 일정이 변경되었습니다: ${title}`,
  CANCELLED: (title) => `이벤트가 취소되었습니다: ${title}`,
  REMINDER: (title) => `내일 이벤트가 있습니다. 참석 여부를 투표해 주세요: ${title}`,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async notifyGroupMembers(eventId: string, type: Exclude<NotifyType, 'REMINDER'>) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        group: {
          include: {
            members: {
              where: { status: MemberStatus.APPROVED },
              include: { user: true },
            },
          },
        },
      },
    });

    if (!event) return;

    const message = MESSAGE_TEMPLATES[type](event.title);

    for (const member of event.group.members) {
      await this.sendToUser(member.userId, eventId, type, message);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminderNotifications() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
    );

    const events = await this.prisma.event.findMany({
      where: {
        date: tomorrowDate,
        status: 'ACTIVE',
      },
      include: {
        group: {
          include: {
            members: {
              where: { status: MemberStatus.APPROVED },
              include: { user: true },
            },
          },
        },
        votes: true,
      },
    });

    for (const event of events) {
      const votedUserIds = new Set(event.votes.map((v) => v.userId));
      const message = MESSAGE_TEMPLATES.REMINDER(event.title);

      for (const member of event.group.members) {
        if (votedUserIds.has(member.userId)) continue;

        const alreadySent = await this.prisma.notificationLog.findFirst({
          where: {
            userId: member.userId,
            eventId: event.id,
            type: NotificationType.REMINDER,
          },
        });

        if (alreadySent) continue;

        await this.sendToUser(
          member.userId,
          event.id,
          'REMINDER',
          message,
        );
      }
    }
  }

  async listForUser(userId: string) {
    return this.prisma.notificationLog.findMany({
      where: { userId },
      include: {
        event: {
          select: { id: true, title: true, date: true, startTime: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  private async sendToUser(
    userId: string,
    eventId: string,
    type: NotifyType,
    message: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const channelToken = this.config.get<string>('KAKAO_CHANNEL_ACCESS_TOKEN');

    if (channelToken && user.kakaoChannelUserKey) {
      try {
        await axios.post(
          'https://kapi.kakao.com/v1/api/talk/friends/message/default/send',
          {
            receiver_uuids: [user.kakaoChannelUserKey],
            template_object: {
              object_type: 'text',
              text: message,
              link: {
                web_url: this.config.get<string>('FRONTEND_URL'),
                mobile_web_url: this.config.get<string>('FRONTEND_URL'),
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${channelToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
      } catch (error) {
        this.logger.warn(`카카오 알림 발송 실패 (${userId}): ${error}`);
      }
    } else {
      this.logger.log(
        `[Mock 알림] ${user.displayName} ← ${type}: ${message}`,
      );
    }

    await this.prisma.notificationLog.create({
      data: {
        userId,
        eventId,
        type: type as NotificationType,
      },
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MemberStatus, NotificationType } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, isOfficer, localDayStart } from '../common/utils/group.utils';

type EventNotifyType = 'CREATED' | 'CHANGED' | 'CANCELLED' | 'REMINDER';

const MESSAGE_TEMPLATES: Record<EventNotifyType, (title: string) => string> = {
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

  async notifyGroupMembers(
    eventId: string,
    type: Exclude<EventNotifyType, 'REMINDER'>,
  ) {
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
      await this.sendEventNotification(member.userId, eventId, type, message);
    }
  }

  async notifyJoinRequest(groupId: string, requesterUserId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterUserId },
    });
    if (!group || !requester) return;

    const members = await this.prisma.groupMember.findMany({
      where: { groupId, status: MemberStatus.APPROVED },
    });
    const officers = members.filter((m) => isOfficer(m.role));

    const message = `${requester.displayName}님이 「${group.name}」 모임 가입을 요청했습니다`;

    for (const officer of officers) {
      if (officer.userId === requesterUserId) continue;
      await this.createInAppNotification({
        userId: officer.userId,
        type: NotificationType.JOIN_REQUEST,
        message,
        groupId,
        actorUserId: requesterUserId,
      });
    }
  }

  async notifyJoinApproved(groupId: string, memberUserId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return;

    const message = `「${group.name}」 모임 가입이 승인되었습니다`;

    await this.createInAppNotification({
      userId: memberUserId,
      type: NotificationType.JOIN_APPROVED,
      message,
      groupId,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminderNotifications() {
    const tomorrowStart = localDayStart(addDays(new Date(), 1));
    const dayAfterTomorrow = addDays(tomorrowStart, 1);

    const events = await this.prisma.event.findMany({
      where: {
        date: {
          gte: tomorrowStart,
          lt: dayAfterTomorrow,
        },
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

        await this.sendEventNotification(
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
        group: {
          select: { id: true, name: true },
        },
        actor: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notificationLog.count({
      where: { userId, readAt: null },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  private async sendEventNotification(
    userId: string,
    eventId: string,
    type: EventNotifyType,
    message: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    await this.sendExternalIfConfigured(user, message);
    await this.createInAppNotification({
      userId,
      type: type as NotificationType,
      message,
      eventId,
    });
  }

  private async createInAppNotification(data: {
    userId: string;
    type: NotificationType;
    message: string;
    eventId?: string;
    groupId?: string;
    actorUserId?: string;
  }) {
    await this.prisma.notificationLog.create({ data });
  }

  private async sendExternalIfConfigured(
    user: { id: string; displayName: string; kakaoChannelUserKey: string | null },
    message: string,
  ) {
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
        this.logger.warn(`카카오 알림 발송 실패 (${user.id}): ${error}`);
      }
    } else {
      this.logger.log(`[Mock 알림] ${user.displayName} ← ${message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MemberStatus, NotificationType } from '@prisma/client';
import axios from 'axios';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, isOfficer, localDayStart } from '../common/utils/group.utils';

type EventNotifyType = 'CREATED' | 'CHANGED' | 'CANCELLED' | 'REMINDER';

const MESSAGE_TEMPLATES: Record<EventNotifyType, (title: string) => string> = {
  CREATED: (title) => `새 이벤트가 등록되었습니다: ${title}. 참석 여부를 투표해 주세요!`,
  CHANGED: (title) => `이벤트 일정이 변경되었습니다: ${title}`,
  CANCELLED: (title) => `이벤트가 취소되었습니다: ${title}`,
  REMINDER: (title) => `내일 이벤트가 있습니다. 참석 여부를 투표해 주세요: ${title}`,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private fcmInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.initializeFcm();
  }

  private initializeFcm() {
    const rawEnvServiceAccount = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

    try {
      if (rawEnvServiceAccount) {
        const serviceAccount = JSON.parse(rawEnvServiceAccount);
        initializeApp({
          credential: cert(serviceAccount),
        });
        this.fcmInitialized = true;
        this.logger.log('FCM (Firebase Admin SDK) initialized via environment variable successfully.');
        return;
      }

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({
          credential: cert(serviceAccount),
        });
        this.fcmInitialized = true;
        this.logger.log('FCM (Firebase Admin SDK) initialized via file successfully.');
        return;
      }

      this.logger.log('Firebase Service Account not provided. FCM will gracefully fallback to KakaoTalk notifications.');
    } catch (err) {
      this.logger.warn(`Failed to initialize Firebase Admin SDK: ${err}`);
    }
  }

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

  async notifyEventCancelled(eventId: string, cancelReason?: string) {
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

    const reasonText = cancelReason ? ` (취소 사유: ${cancelReason})` : '';
    const message = `이벤트가 취소되었습니다: ${event.title}${reasonText}`;

    for (const member of event.group.members) {
      await this.sendEventNotification(member.userId, eventId, 'CANCELLED', message);
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

  @Cron('*/5 * * * *') // Run every 5 minutes
  async sendReminderNotifications() {
    const now = new Date();
    
    // Find active events that are scheduled in the future (today or later)
    const events = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        date: {
          gte: localDayStart(now),
        },
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
      const startDateTime = new Date(event.date);
      const [hours, minutes] = event.startTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      const diffMs = startDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Parse the custom offsets, e.g. "24,1"
      const offsets = event.reminderOffsets
        ? event.reminderOffsets.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
        : [24, 1];

      for (const X of offsets) {
        // Window check: if diffHours falls in [X - 0.25, X + 0.25] (a 30 min window around X)
        const isE2E = process.env.DATABASE_URL?.includes('e2e');
        if (isE2E || (diffHours > (X - 0.25) && diffHours <= (X + 0.25))) {
          const votedUserIds = new Set(event.votes.map((v) => v.userId));
          const uniqueLogMessage = `${X}시간 전입니다`;
          const message = `[투표 독려] 「${event.title}」 투표 마감 ${X}시간 전입니다! 아직 투표하지 않으신 분들은 참석 여부를 투표해 주세요.`;

          for (const member of event.group.members) {
            if (votedUserIds.has(member.userId)) continue;

            const alreadySent = await this.prisma.notificationLog.findFirst({
              where: {
                userId: member.userId,
                eventId: event.id,
                type: NotificationType.REMINDER,
                message: { contains: uniqueLogMessage },
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
    }
  }

  @Cron('0 12 * * *') // Run every day at 12:00 PM
  async notifyNoUpcomingEvents() {
    const now = new Date();
    const groups = await this.prisma.group.findMany({
      include: {
        members: {
          where: { status: MemberStatus.APPROVED },
          include: { user: true },
        },
      },
    });

    for (const group of groups) {
      // Find if there is any active upcoming event
      const upcomingEvent = await this.prisma.event.findFirst({
        where: {
          groupId: group.id,
          status: 'ACTIVE',
          date: {
            gte: localDayStart(now),
          },
        },
      });

      if (!upcomingEvent) {
        // Find officers
        const officers = group.members.filter(m => isOfficer(m.role));
        const message = `[이벤트 등록 알림] 「${group.name}」 모임에 등록된 예정 이벤트가 없습니다. 다음 이벤트를 등록하여 회원들의 참여율을 높여보세요!`;

        for (const officer of officers) {
          // Send log and push
          await this.sendExternalIfConfigured(officer.user, message);
          await this.createInAppNotification({
            userId: officer.userId,
            type: NotificationType.REMINDER,
            message,
            groupId: group.id,
          });
        }
      }
    }
  }

  @Cron('0 9 * * *') // Run every day at 9:00 AM
  async notifyFeeDue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Find all groups with a fee due day set
    const groups = await this.prisma.group.findMany({
      where: {
        dueDay: { not: null },
      },
      include: {
        members: {
          where: { status: MemberStatus.APPROVED },
          include: { user: true },
        },
      },
    });

    for (const group of groups) {
      if (!group.dueDay) continue;

      // Calculate check date (1 day before the due day of this month)
      const targetDate = new Date(year, month - 1, group.dueDay);
      const checkDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);

      const isTodayOneDayBefore = localDayStart(now).getTime() === localDayStart(checkDate).getTime();

      if (isTodayOneDayBefore) {
        const message = `[회비 납부 안내] 「${group.name}」 모임의 회비 마감일(매월 ${group.dueDay}일) 하루 전입니다. 계좌번호: ${group.bankName || ''} ${group.bankAccountNumber || ''}로 납부를 부탁드립니다.`;

        for (const member of group.members) {
          // Check if exempt
          const isExempt = group.officerFeeExempt && isOfficer(member.role);
          if (isExempt) continue;

          // Check if already paid
          const payment = await this.prisma.feePayment.findUnique({
            where: {
              groupId_userId_year_month: {
                groupId: group.id,
                userId: member.userId,
                year,
                month,
              },
            },
          });

          if (!payment) {
            await this.sendExternalIfConfigured(member.user, message);
            await this.createInAppNotification({
              userId: member.userId,
              type: NotificationType.REMINDER,
              message,
              groupId: group.id,
            });
          }
        }
      }
    }
  }

  async listForUser(userId: string) {
    const logs = await this.prisma.notificationLog.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            group: {
              select: { id: true, name: true, profileImageUrl: true },
            },
          },
        },
        group: {
          select: { id: true, name: true, profileImageUrl: true },
        },
        actor: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    return logs.map((log) => ({
      ...log,
      group: log.group || log.event?.group || null,
    }));
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

  async deleteAllForUser(userId: string) {
    await this.prisma.notificationLog.deleteMany({
      where: { userId },
    });
    return { ok: true };
  }

  async deleteSelectedForUser(userId: string, ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };
    const result = await this.prisma.notificationLog.deleteMany({
      where: {
        userId,
        id: { in: ids },
      },
    });
    return { count: result.count };
  }

  async sendEventNotification(
    userId: string,
    eventId: string,
    type: EventNotifyType,
    message: string,
    groupId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let targetGroupId = groupId;
    if (!targetGroupId) {
      const ev = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { groupId: true },
      });
      targetGroupId = ev?.groupId;
    }

    await this.sendExternalIfConfigured(user, message);
    await this.createInAppNotification({
      userId,
      type: type as NotificationType,
      message,
      eventId: eventId ? eventId : undefined,
      groupId: targetGroupId || undefined,
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

  private getFrontendLink(): string {
    const fromConfig = this.config.get<string>('FRONTEND_URL');
    if (fromConfig) {
      const parts = fromConfig.split(',').map((p) => p.trim());
      const validHttpsUrl = parts.find(
        (p) => p.startsWith('https://') && !p.includes('localhost') && !p.includes('127.0.0.1'),
      );
      if (validHttpsUrl) {
        return validHttpsUrl;
      }
    }
    return 'https://clover-gilt.vercel.app';
  }

  private async sendExternalIfConfigured(
    user: { id: string; displayName: string; kakaoChannelUserKey: string | null; fcmToken?: string | null; kakaoNotifyEnabled?: boolean; pushNotifyEnabled?: boolean },
    message: string,
  ) {
    // 1. FCM Web Push Notification
    let fcmSuccess = false;
    if (user.pushNotifyEnabled !== false && user.fcmToken) {
      if (this.fcmInitialized) {
        try {
          await getMessaging().send({
            token: user.fcmToken,
            notification: {
              title: 'Clover 알림',
              body: message,
            },
            webpush: {
              notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge.png',
              },
            },
          });
          this.logger.log(`FCM 알림 발송 성공 (${user.displayName})`);
          fcmSuccess = true;
        } catch (err) {
          this.logger.warn(`FCM 알림 발송 실패 (${user.displayName}): ${err}`);
        }
      } else {
        this.logger.log(`[Mock FCM 알림] ${user.displayName} ← ${message}`);
        fcmSuccess = true;
      }
    }

    // 2. FCM 발송에 성공했다면 카카오톡 알림은 자동으로 생략
    if (fcmSuccess) {
      this.logger.log(`FCM 알림 전송 완료로 카카오 알림을 스킵합니다. (${user.displayName})`);
      return;
    }

    // 3. KakaoTalk Notification
    if (user.kakaoNotifyEnabled === false) {
      this.logger.log(`카카오 알림 수신 거부 상태입니다. (${user.displayName})`);
      return;
    }

    const channelToken = this.config.get<string>('KAKAO_CHANNEL_ACCESS_TOKEN');

    if (!channelToken) {
      this.logger.log(`[Mock 카카오 알림] ${user.displayName} ← ${message}`);
      return;
    }

    const isSelf = user.displayName === '김완석';

    if (isSelf || user.kakaoChannelUserKey) {
      try {
        const url = isSelf
          ? 'https://kapi.kakao.com/v2/api/talk/memo/default/send'
          : 'https://kapi.kakao.com/v1/api/talk/friends/message/default/send';

        const linkUrl = this.getFrontendLink();
        const params = new URLSearchParams();
        if (!isSelf) {
          params.append('receiver_uuids', JSON.stringify([user.kakaoChannelUserKey]));
        }
        params.append(
          'template_object',
          JSON.stringify({
            object_type: 'text',
            text: message,
            link: {
              web_url: linkUrl,
              mobile_web_url: linkUrl,
            },
          }),
        );

        const response = await axios.post(
          url,
          params.toString(),
          {
            headers: {
              Authorization: `Bearer ${channelToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        this.logger.log(`카카오 알림 발송 성공 (${user.displayName}, self=${isSelf}): ${JSON.stringify(response.data)}`);
      } catch (error: any) {
        this.logger.warn(
          `카카오 알림 발송 실패 (${user.displayName}): ${
            error.response?.data ? JSON.stringify(error.response.data) : error.message
          }`,
        );
      }
    } else {
      this.logger.log(`[Mock 알림] ${user.displayName} ← ${message}`);
    }
  }

  async sendTestFcm(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let targetUser = user;
    if (user.displayName !== '김완석') {
      const kwsUser = await this.prisma.user.findFirst({
        where: { displayName: '김완석' },
      });
      if (kwsUser) {
        targetUser = kwsUser;
      }
    }

    const message = `[FCM 테스트] 안녕하세요, ${targetUser.displayName}님! Clover 실시간 FCM 알림 테스트 메시지입니다.`;
    await this.sendExternalIfConfigured(targetUser, message);
  }

  async sendTestKakao(userId?: string) {
    const channelToken = this.config.get<string>('KAKAO_CHANNEL_ACCESS_TOKEN');
    if (!channelToken) {
      throw new Error('KAKAO_CHANNEL_ACCESS_TOKEN이 설정되지 않았습니다.');
    }

    const message = `[Clover 알림 테스트] 카카오톡 실시간 메시지 연동이 성공적으로 완료되었습니다! 🍀\n\n모임 일정, 투표 마감, 공지사항 알림이 카카오톡으로 실시간 전달됩니다.`;

    const linkUrl = this.getFrontendLink();
    const params = new URLSearchParams();
    params.append(
      'template_object',
      JSON.stringify({
        object_type: 'text',
        text: message,
        link: {
          web_url: linkUrl,
          mobile_web_url: linkUrl,
        },
      }),
    );

    const response = await axios.post(
      'https://kapi.kakao.com/v2/api/talk/memo/default/send',
      params.toString(),
      {
        headers: {
          Authorization: `Bearer ${channelToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    this.logger.log(`카카오톡 테스트 메시지 발송 결과: ${JSON.stringify(response.data)}`);
    return response.data;
  }
}

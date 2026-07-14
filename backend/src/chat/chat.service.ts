import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(groupId: string, userId: string, message: string, imageUrl?: string, videoUrl?: string) {
    const msg = await this.prisma.chatMessage.create({
      data: {
        groupId,
        userId,
        message,
        imageUrl,
        videoUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            gender: true,
            birthYear: true,
            isEarlyYear: true,
          },
        },
      },
    });

    await this.resolveGroupProfilesForUsers(groupId, [msg.user]);
    return msg;
  }

  async getMessages(groupId: string, limit = 50) {
    const msgs = await this.prisma.chatMessage.findMany({
      where: { groupId },
      take: limit,
      orderBy: { sentAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            gender: true,
            birthYear: true,
            isEarlyYear: true,
          },
        },
      },
    });

    await this.resolveGroupProfilesForUsers(groupId, msgs.map(m => m.user));
    return msgs.reverse(); // Chronological order for client
  }

  private async resolveGroupProfilesForUsers(groupId: string, users: any[]) {
    if (users.length === 0) return;
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { in: users.map(u => u.id) } },
      include: { profileCard: true },
    });
    const map = new Map<string, { nickname: string; profileImageUrl: string | null }>();
    for (const m of members) {
      if (m.profileCard) {
        map.set(m.userId, {
          nickname: m.profileCard.nickname,
          profileImageUrl: m.profileCard.profileImageUrl,
        });
      }
    }
    for (const user of users) {
      if (!user) continue;
      const card = map.get(user.id);
      if (card) {
        user.displayName = card.nickname;
        user.profileImageUrl = card.profileImageUrl;
      }
    }
  }
}

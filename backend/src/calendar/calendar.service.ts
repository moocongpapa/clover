import { Injectable } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnifiedCalendar(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: MemberStatus.APPROVED },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return [];
    }

    const events = await this.prisma.event.findMany({
      where: { groupId: { in: groupIds } },
      include: {
        group: { select: { id: true, name: true, category: true } },
        votes: {
          where: { userId },
          select: { choice: true },
        },
        _count: { select: { votes: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      location: event.location,
      status: event.status,
      group: event.group,
      myVote: event.votes[0]?.choice ?? null,
      voteCount: event._count.votes,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { MemberStatus, VoteChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eventEndAt, isEventVoteLocked } from '../common/utils/group.utils';
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
        group: {
          select: {
            id: true,
            name: true,
            category: true,
            profileImageUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            gender: true,
            birthYear: true,
            isEarlyYear: true,
          },
        },
        votes: {
          where: { userId },
          select: { choice: true },
        },
        _count: { select: { votes: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const eventIds = events.map((e) => e.id);
    const aggregates =
      eventIds.length === 0
        ? []
        : await this.prisma.vote.groupBy({
            by: ['eventId', 'choice'],
            where: { eventId: { in: eventIds } },
            _count: { _all: true },
          });

    const countsByEvent = new Map<
      string,
      Record<VoteChoice, number>
    >();
    for (const id of eventIds) {
      countsByEvent.set(id, { ATTEND: 0, ABSENT: 0, LATE: 0 });
    }
    for (const row of aggregates) {
      const counts = countsByEvent.get(row.eventId);
      if (counts) {
        counts[row.choice] = row._count._all;
      }
    }

    const myTeamAssignments =
      eventIds.length === 0
        ? []
        : await this.prisma.eventTeamAssignment.findMany({
            where: {
              userId,
              split: { eventId: { in: eventIds } },
            },
            select: {
              teamLabel: true,
              split: { select: { eventId: true } },
            },
          });

    const myTeamByEvent = new Map(
      myTeamAssignments.map((row) => [row.split.eventId, row.teamLabel]),
    );

    const teamSplits =
      eventIds.length === 0
        ? []
        : await this.prisma.eventTeamSplit.findMany({
            where: { eventId: { in: eventIds } },
            select: { eventId: true },
          });

    const splitEventIds = new Set(teamSplits.map((split) => split.eventId));

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      status: event.status,
      group: event.group,
      createdBy: event.createdBy,
      myVote: event.votes[0]?.choice ?? null,
      voteCount: event._count.votes,
      voteCounts: countsByEvent.get(event.id)!,
      myTeam: myTeamByEvent.get(event.id) ?? null,
      voteLocked: isEventVoteLocked(event, splitEventIds.has(event.id)),
      isPast:
        event.status === 'CANCELLED' ||
        eventEndAt(event.date, event.startTime, event.endTime) < new Date(),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  }
}

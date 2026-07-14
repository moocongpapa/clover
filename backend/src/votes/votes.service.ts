import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CastVoteDto } from './dto/votes.dto';
import {
  eventStartAt,
  isEventVoteLocked,
  USER_MEMBER_SELECT,
} from '../common/utils/group.utils';

const CHOICE_LABELS: Record<string, string> = {
  ATTEND: '참석',
  ABSENT: '불참',
  LATE: '늦참',
};

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async castVote(eventId: string, userId: string, dto: CastVoteDto) {
    const event = await this.getActiveEvent(eventId, userId);
    await this.assertCanVote(eventId, event.date, event.startTime);

    const vote = await this.prisma.vote.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { choice: dto.choice },
      create: { eventId, userId, choice: dto.choice },
      include: {
        user: {
          select: { id: true, displayName: true, profileImageUrl: true, gender: true, birthYear: true, isEarlyYear: true },
        },
      },
    });

    await this.groupsService.resolveGroupProfileForUser(event.groupId, vote.user);
    return vote;
  }

  async cancelVote(eventId: string, userId: string) {
    const event = await this.getActiveEvent(eventId, userId);
    await this.assertCanVote(eventId, event.date, event.startTime);

    try {
      await this.prisma.vote.delete({
        where: { eventId_userId: { eventId, userId } },
      });
    } catch (e) {
      // Ignore if record already deleted
    }

    return { ok: true };
  }

  async getResults(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    await this.groupsService.requireApprovedMember(event.groupId, userId);

    const votes = await this.prisma.vote.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, displayName: true, profileImageUrl: true, gender: true, birthYear: true, isEarlyYear: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const counts = {
      ATTEND: votes.filter((v) => v.choice === 'ATTEND').length,
      ABSENT: votes.filter((v) => v.choice === 'ABSENT').length,
      LATE: votes.filter((v) => v.choice === 'LATE').length,
    };

    const myVote = votes.find((v) => v.userId === userId) ?? null;
    const hasTeamSplit = !!(await this.prisma.eventTeamSplit.findUnique({
      where: { eventId },
      select: { id: true },
    }));
    const voteLocked = isEventVoteLocked(event, hasTeamSplit);

    const votedUserIds = votes.map((v) => v.userId);
    const nonVoterMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId: event.groupId,
        status: MemberStatus.APPROVED,
        ...(votedUserIds.length > 0
          ? { userId: { notIn: votedUserIds } }
          : {}),
      },
      include: {
        user: { select: USER_MEMBER_SELECT },
      },
      orderBy: { createdAt: 'asc' },
    });

    const votesUsers = votes.map((v) => v.user);
    const nonVotersUsers = nonVoterMembers.map((member) => member.user);

    await this.groupsService.resolveGroupProfilesForUsers(event.groupId, [...votesUsers, ...nonVotersUsers]);
    if (myVote) {
      await this.groupsService.resolveGroupProfileForUser(event.groupId, myVote.user);
    }

    const nonVoters = nonVotersUsers.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'ko'),
    );

    return {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        date: event.date,
        startTime: event.startTime,
        voteLocked,
        hasTeamSplit,
      },
      counts,
      votes: votes.map((v) => ({
        ...v,
        choiceLabel: CHOICE_LABELS[v.choice],
      })),
      nonVoters,
      myVote,
    };
  }

  private async getActiveEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('취소된 이벤트에는 투표할 수 없습니다.');
    }

    await this.groupsService.requireApprovedMember(event.groupId, userId);
    return event;
  }

  private async assertCanVote(
    eventId: string,
    date: Date,
    startTime: string,
  ) {
    const hasTeamSplit = !!(await this.prisma.eventTeamSplit.findUnique({
      where: { eventId },
      select: { id: true },
    }));

    if (hasTeamSplit) {
      throw new ForbiddenException(
        '그룹 나누기 후에는 투표를 변경할 수 없습니다.',
      );
    }

    if (eventStartAt(date, startTime) <= new Date()) {
      throw new ForbiddenException('모임 시작 후에는 투표를 변경할 수 없습니다.');
    }
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, VoteChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';
import { isOfficer, parseEventDate, canSplitTeams } from '../common/utils/group.utils';
import {
  shuffleAndSplit,
  teamLabelForIndex,
} from '../common/utils/team.utils';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listByGroup(groupId: string, userId: string) {
    await this.groupsService.requireApprovedMember(groupId, userId);

    return this.prisma.event.findMany({
      where: { groupId },
      include: {
        createdBy: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
        _count: { select: { votes: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getById(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        group: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    await this.groupsService.requireApprovedMember(event.groupId, userId);
    return event;
  }

  async create(groupId: string, userId: string, dto: CreateEventDto) {
    const membership = await this.groupsService.requireApprovedMember(
      groupId,
      userId,
    );

    if (!isOfficer(membership.role)) {
      throw new ForbiddenException('운영진만 이벤트를 등록할 수 있습니다.');
    }

    this.assertValidTimeRange(dto.startTime, dto.endTime);

    const event = await this.prisma.event.create({
      data: {
        groupId,
        title: dto.title,
        date: parseEventDate(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime ?? null,
        location: dto.location,
        description: dto.description,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
    });

    await this.notifications.notifyGroupMembers(event.id, 'CREATED');
    return event;
  }

  async update(eventId: string, userId: string, dto: UpdateEventDto) {
    const event = await this.requireOfficerForEvent(eventId, userId);

    this.assertValidTimeRange(dto.startTime, dto.endTime);

    const updated = await this.prisma.event.update({
      where: { id: event.id },
      data: {
        title: dto.title,
        date: parseEventDate(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime ?? null,
        location: dto.location,
        description: dto.description,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
    });

    await this.notifications.notifyGroupMembers(event.id, 'CHANGED');
    return updated;
  }

  async cancel(eventId: string, userId: string) {
    const event = await this.requireOfficerForEvent(eventId, userId);

    const cancelled = await this.prisma.event.update({
      where: { id: event.id },
      data: { status: EventStatus.CANCELLED },
    });

    await this.notifications.notifyGroupMembers(event.id, 'CANCELLED');
    return cancelled;
  }

  async getTeams(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, groupId: true, status: true, date: true, startTime: true },
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    const membership = await this.groupsService.requireApprovedMember(
      event.groupId,
      userId,
    );

    const split = await this.prisma.eventTeamSplit.findUnique({
      where: { eventId },
      include: {
        createdBy: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, displayName: true, profileImageUrl: true },
            },
          },
        },
      },
    });

    return {
      ...this.formatTeamsResponse(
        split,
        userId,
        isOfficer(membership.role),
      ),
      canSplit:
        event.status !== EventStatus.CANCELLED &&
        canSplitTeams(event.date, event.startTime),
    };
  }

  async splitTeams(eventId: string, userId: string, teamCount: number) {
    const event = await this.requireOfficerForEvent(eventId, userId);

    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('취소된 이벤트는 그룹을 나눌 수 없습니다.');
    }

    if (!canSplitTeams(event.date, event.startTime)) {
      throw new BadRequestException(
        '모임 시작 30분 전부터만 사용할 수 있습니다.',
      );
    }

    const attendeeVotes = await this.prisma.vote.findMany({
      where: {
        eventId,
        choice: { in: [VoteChoice.ATTEND, VoteChoice.LATE] },
      },
      include: {
        user: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
      orderBy: { votedAt: 'asc' },
    });

    if (attendeeVotes.length === 0) {
      throw new BadRequestException(
        '참석 또는 늦참으로 투표한 회원이 없습니다.',
      );
    }

    if (attendeeVotes.length < teamCount) {
      throw new BadRequestException(
        '참석 인원보다 많은 그룹 수는 선택할 수 없습니다.',
      );
    }

    const shuffledTeams = shuffleAndSplit(attendeeVotes, teamCount);

    const split = await this.prisma.$transaction(async (tx) => {
      await tx.eventTeamSplit.deleteMany({ where: { eventId } });

      const created = await tx.eventTeamSplit.create({
        data: {
          eventId,
          teamCount,
          createdById: userId,
          assignments: {
            create: shuffledTeams.flatMap((teamVotes, index) =>
              teamVotes.map((vote) => ({
                userId: vote.user.id,
                teamLabel: teamLabelForIndex(index),
              })),
            ),
          },
        },
        include: {
          createdBy: {
            select: { id: true, displayName: true, profileImageUrl: true },
          },
          assignments: {
            include: {
              user: {
                select: { id: true, displayName: true, profileImageUrl: true },
              },
            },
          },
        },
      });

      return created;
    });

    return {
      ...this.formatTeamsResponse(split, userId, true),
      canSplit: canSplitTeams(event.date, event.startTime),
    };
  }

  private formatTeamsResponse(
    split: {
      teamCount: number;
      createdAt: Date;
      createdBy: {
        id: string;
        displayName: string;
        profileImageUrl: string | null;
      };
      assignments: Array<{
        teamLabel: string;
        user: { id: string; displayName: string; profileImageUrl: string | null };
      }>;
    } | null,
    userId: string,
    canManage: boolean,
  ) {
    if (!split) {
      return {
        split: null,
        teams: [],
        myTeam: null,
        canManage,
      };
    }

    const teams = Array.from({ length: split.teamCount }, (_, index) => {
      const label = teamLabelForIndex(index);
      const members = split.assignments
        .filter((assignment) => assignment.teamLabel === label)
        .map((assignment) => assignment.user)
        .sort((a, b) =>
          a.displayName.localeCompare(b.displayName, 'ko'),
        );

      return { label, members };
    });

    const myAssignment = split.assignments.find(
      (assignment) => assignment.user.id === userId,
    );

    return {
      split: {
        teamCount: split.teamCount,
        createdAt: split.createdAt,
        createdBy: split.createdBy,
      },
      teams,
      myTeam: myAssignment?.teamLabel ?? null,
      canManage,
    };
  }

  private async requireOfficerForEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    }

    const membership = await this.groupsService.requireApprovedMember(
      event.groupId,
      userId,
    );

    if (!isOfficer(membership.role)) {
      throw new ForbiddenException('운영진만 이 작업을 수행할 수 있습니다.');
    }

    return event;
  }

  private assertValidTimeRange(startTime: string, endTime?: string) {
    if (!endTime) return;
    if (endTime <= startTime) {
      throw new BadRequestException('종료 시간은 시작 시간보다 뒤여야 합니다.');
    }
  }
}

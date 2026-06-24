import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CastVoteDto } from './dto/votes.dto';
import { eventStartAt } from '../common/utils/group.utils';

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
    this.assertBeforeStart(event.date, event.startTime);

    return this.prisma.vote.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { choice: dto.choice },
      create: { eventId, userId, choice: dto.choice },
      include: {
        user: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
    });
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
          select: { id: true, displayName: true, profileImageUrl: true },
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
    const started = eventStartAt(event.date, event.startTime) <= new Date();

    return {
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        date: event.date,
        startTime: event.startTime,
        voteLocked: started,
      },
      counts,
      votes: votes.map((v) => ({
        ...v,
        choiceLabel: CHOICE_LABELS[v.choice],
      })),
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

  private assertBeforeStart(date: Date, startTime: string) {
    if (eventStartAt(date, startTime) <= new Date()) {
      throw new ForbiddenException('이벤트 시작 후에는 투표를 변경할 수 없습니다.');
    }
  }
}

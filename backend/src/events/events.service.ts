import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEventDto, UpdateEventDto } from './dto/events.dto';
import { isOfficer, parseEventDate } from '../common/utils/group.utils';

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

    const event = await this.prisma.event.create({
      data: {
        groupId,
        title: dto.title,
        date: parseEventDate(dto.date),
        startTime: dto.startTime,
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

    const updated = await this.prisma.event.update({
      where: { id: event.id },
      data: {
        title: dto.title,
        date: parseEventDate(dto.date),
        startTime: dto.startTime,
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
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MemberRole, MemberStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGroupDto,
  TransferPresidentDto,
  UpdateMemberDto,
} from './dto/groups.dto';
import {
  getApprovedMembership,
  isApproved,
  isOfficer,
} from '../common/utils/group.utils';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(search?: string, category?: string) {
    return this.prisma.group.findMany({
      where: {
        isPublic: true,
        ...(search ? { name: { contains: search } } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        _count: { select: { members: { where: { status: MemberStatus.APPROVED } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, status: MemberStatus.APPROVED },
      include: {
        group: {
          include: {
            _count: {
              select: { members: { where: { status: MemberStatus.APPROVED } } },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.group,
      myRole: m.role,
      memberCount: m.group._count.members,
    }));
  }

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        profileImageUrl: dto.profileImageUrl,
        category: dto.category,
        isPublic: dto.isPublic,
        inviteCode: nanoid(10),
        members: {
          create: {
            userId,
            role: MemberRole.PRESIDENT,
            status: MemberStatus.APPROVED,
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return group;
  }

  async getById(groupId: string, userId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: MemberStatus.APPROVED },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            members: { where: { status: MemberStatus.APPROVED } },
            events: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    let myMembership = null;
    let pendingRequests: typeof group.members = [];

    if (userId) {
      myMembership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId } },
      });

      if (myMembership && isOfficer(myMembership.role)) {
        pendingRequests = await this.prisma.groupMember.findMany({
          where: { groupId, status: MemberStatus.PENDING },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        });
      }
    }

    if (!group.isPublic && !myMembership) {
      throw new ForbiddenException('비공개 모임입니다.');
    }

    return {
      ...group,
      myMembership,
      pendingRequests,
    };
  }

  async joinByGroupId(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    return this.requestJoin(groupId, userId);
  }

  async joinByInviteCode(inviteCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      throw new NotFoundException('유효하지 않은 초대 링크입니다.');
    }

    return this.requestJoin(group.id, userId);
  }

  private async requestJoin(groupId: string, userId: string) {
    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (existing) {
      if (existing.status === MemberStatus.APPROVED) {
        throw new BadRequestException('이미 가입된 모임입니다.');
      }
      if (existing.status === MemberStatus.PENDING) {
        throw new BadRequestException('이미 가입 신청 중입니다.');
      }
      return this.prisma.groupMember.update({
        where: { id: existing.id },
        data: { status: MemberStatus.PENDING },
      });
    }

    return this.prisma.groupMember.create({
      data: { userId, groupId, status: MemberStatus.PENDING },
    });
  }

  async updateMember(
    groupId: string,
    targetUserId: string,
    actorUserId: string,
    dto: UpdateMemberDto,
  ) {
    const actor = await this.requireOfficer(groupId, actorUserId);
    const target = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });

    if (!target) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    if (dto.role === MemberRole.PRESIDENT) {
      throw new ForbiddenException('회장 지정은 양도 API를 사용하세요.');
    }

    if (dto.role === MemberRole.OFFICER && actor.role !== MemberRole.PRESIDENT) {
      throw new ForbiddenException('회장만 운영진을 지정할 수 있습니다.');
    }

    if (
      target.role === MemberRole.PRESIDENT &&
      (dto.status === MemberStatus.REJECTED || dto.role === MemberRole.MEMBER)
    ) {
      throw new ForbiddenException('회장은 제거하거나 강등할 수 없습니다.');
    }

    return this.prisma.groupMember.update({
      where: { id: target.id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
      include: {
        user: {
          select: { id: true, displayName: true, profileImageUrl: true },
        },
      },
    });
  }

  async transferPresident(
    groupId: string,
    actorUserId: string,
    dto: TransferPresidentDto,
  ) {
    const actor = await this.requirePresident(groupId, actorUserId);
    const target = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: dto.newPresidentUserId, groupId },
      },
    });

    if (!target || !isApproved(target.status)) {
      throw new NotFoundException('대상 회원을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction([
      this.prisma.groupMember.update({
        where: { id: actor.id },
        data: { role: MemberRole.OFFICER },
      }),
      this.prisma.groupMember.update({
        where: { id: target.id },
        data: { role: MemberRole.PRESIDENT },
      }),
    ]);

    return { success: true };
  }

  async leave(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new NotFoundException('가입하지 않은 모임입니다.');
    }

    if (membership.role === MemberRole.PRESIDENT) {
      throw new BadRequestException(
        '회장은 모임을 떠나기 전에 회장직을 양도해야 합니다.',
      );
    }

    await this.prisma.groupMember.delete({ where: { id: membership.id } });
    return { success: true };
  }

  async requireApprovedMember(groupId: string, userId: string) {
    const membership = await getApprovedMembership(
      this.prisma,
      groupId,
      userId,
    );

    if (!membership || !isApproved(membership.status)) {
      throw new ForbiddenException('모임 회원만 접근할 수 있습니다.');
    }

    return membership;
  }

  private async requireOfficer(groupId: string, userId: string) {
    const membership = await this.requireApprovedMember(groupId, userId);

    if (!isOfficer(membership.role)) {
      throw new ForbiddenException('운영진만 이 작업을 수행할 수 있습니다.');
    }

    return membership;
  }

  private async requirePresident(groupId: string, userId: string) {
    const membership = await this.requireApprovedMember(groupId, userId);

    if (membership.role !== MemberRole.PRESIDENT) {
      throw new ForbiddenException('회장만 이 작업을 수행할 수 있습니다.');
    }

    return membership;
  }
}

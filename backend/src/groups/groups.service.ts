import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MemberRole, MemberStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateGroupDto,
  TransferPresidentDto,
  UpdateGroupDto,
  UpdateMemberDto,
  UpdateMyStatusDto,
  CreateGroupMediaDto,
} from './dto/groups.dto';
import {
  getApprovedMembership,
  isApproved,
  isOfficer,
  buildActivityRegion,
  parseKoreanAddress,
  normalizeOptionalText,
  USER_MEMBER_SELECT,
} from '../common/utils/group.utils';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listPublic(search?: string, category?: string, userId?: string) {
    const groups = await this.prisma.group.findMany({
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

    if (!userId) {
      return groups.map((g) => ({ ...g, myMembership: null }));
    }

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, groupId: { in: groups.map((g) => g.id) } },
    });
    const byGroup = new Map(memberships.map((m) => [m.groupId, m]));

    return groups.map((g) => {
      const m = byGroup.get(g.id);
      return {
        ...g,
        myMembership: m
          ? { status: m.status, role: m.role }
          : null,
      };
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
    let activitySido: string = dto.activitySido;
    let activitySigungu: string | null = dto.activitySigungu ?? null;
    let activityDistrict: string | null = dto.activityDistrict ?? null;
    let activityTown: string | null = dto.activityTown ?? null;

    if ((!activitySido || activitySido.trim() === '') && dto.arenas && dto.arenas.length > 0) {
      const parsed = parseKoreanAddress(dto.arenas[0].address);
      if (parsed) {
        activitySido = parsed.activitySido;
        activitySigungu = parsed.activitySigungu;
        activityDistrict = parsed.activityDistrict;
        activityTown = parsed.activityTown;
      }
    }

    const activityRegion = buildActivityRegion({
      activitySido,
      activitySigungu,
      activityDistrict,
      activityTown,
    });

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name: dto.name,
          description: dto.description,
          profileImageUrl: dto.profileImageUrl,
          category: dto.category,
          customSportName: dto.category === '기타' ? dto.customSportName : null,
          maxMembers: dto.maxMembers ?? 50,
          dueDay: dto.dueDay ?? null,
          officerFeeExempt: dto.officerFeeExempt ?? false,
          isPublic: dto.isPublic,
          activitySido,
          activitySigungu,
          activityDistrict,
          activityTown,
          activityRegion,
          bankName: normalizeOptionalText(dto.bankName),
          bankAccountNumber: normalizeOptionalText(dto.bankAccountNumber),
          bankAccountHolder: normalizeOptionalText(dto.bankAccountHolder),
          inviteCode: nanoid(10),
          members: {
            create: {
              userId,
              role: MemberRole.PRESIDENT,
              status: MemberStatus.APPROVED,
            },
          },
        },
      });

      if (dto.arenas && dto.arenas.length > 0) {
        for (const arena of dto.arenas) {
          await tx.groupArena.create({
            data: {
              groupId: created.id,
              placeName: arena.placeName,
              address: arena.address,
            },
          });
        }
      }

      await tx.officerHistory.create({
        data: {
          groupId: created.id,
          userId,
          role: MemberRole.PRESIDENT,
          startDate: new Date(),
        },
      });

      return created;
    }, { timeout: 30000 });

    return group;
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.requireOfficer(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    let activitySido: string = dto.activitySido;
    let activitySigungu: string | null = dto.activitySigungu ?? null;
    let activityDistrict: string | null = dto.activityDistrict ?? null;
    let activityTown: string | null = dto.activityTown ?? null;

    if ((!activitySido || activitySido.trim() === '') && dto.arenas && dto.arenas.length > 0) {
      const parsed = parseKoreanAddress(dto.arenas[0].address);
      if (parsed) {
        activitySido = parsed.activitySido;
        activitySigungu = parsed.activitySigungu;
        activityDistrict = parsed.activityDistrict;
        activityTown = parsed.activityTown;
      }
    }

    const activityRegion = buildActivityRegion({
      activitySido,
      activitySigungu,
      activityDistrict,
      activityTown,
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.group.update({
        where: { id: groupId },
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          customSportName: dto.category === '기타' ? dto.customSportName : null,
          maxMembers: dto.maxMembers ?? 50,
          dueDay: dto.dueDay ?? null,
          officerFeeExempt: dto.officerFeeExempt ?? false,
          isPublic: dto.isPublic,
          activitySido,
          activitySigungu,
          activityDistrict,
          activityTown,
          activityRegion,
          bankName: normalizeOptionalText(dto.bankName),
          bankAccountNumber: normalizeOptionalText(dto.bankAccountNumber),
          bankAccountHolder: normalizeOptionalText(dto.bankAccountHolder),
          ...(dto.profileImageUrl !== undefined
            ? { profileImageUrl: dto.profileImageUrl }
            : {}),
        },
        include: {
          _count: { select: { members: true } },
        },
      });

      if (dto.arenas !== undefined) {
        await tx.groupArena.deleteMany({ where: { groupId } });
        if (dto.arenas && dto.arenas.length > 0) {
          for (const arena of dto.arenas) {
            await tx.groupArena.create({
              data: {
                groupId,
                placeName: arena.placeName,
                address: arena.address,
              },
            });
          }
        }
      }

      return updated;
    }, { timeout: 30000 });
  }

  async getById(groupId: string, userId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        arenas: true,
        officerHistories: {
          orderBy: { startDate: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                birthYear: true,
              },
            },
          },
        },
        members: {
          where: { status: MemberStatus.APPROVED },
          include: {
            user: {
              select: USER_MEMBER_SELECT,
            },
            profileCard: true,
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

    const resolveMemberProfile = (m: any) => {
      if (!m) return m;
      if (m.profileCard) {
        return {
          ...m,
          user: {
            ...m.user,
            displayName: m.profileCard.nickname,
            profileImageUrl: m.profileCard.profileImageUrl,
          },
        };
      }
      return m;
    };

    let myMembership = null;
    let pendingRequests: any[] = [];

    if (userId) {
      myMembership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId } },
        include: { profileCard: true },
      });
      if (myMembership) {
        myMembership = resolveMemberProfile(myMembership);
      }

      if (myMembership?.role === MemberRole.PRESIDENT) {
        const pRequests = await this.prisma.groupMember.findMany({
          where: { groupId, status: MemberStatus.PENDING },
          include: {
            user: {
              select: USER_MEMBER_SELECT,
            },
            profileCard: true,
          },
          orderBy: { createdAt: 'asc' },
        });
        pendingRequests = pRequests.map(resolveMemberProfile);
      }
    }

    if (!group.isPublic && !myMembership) {
      throw new ForbiddenException('비공개 모임입니다.');
    }

    const resolvedMembers = group.members.map(resolveMemberProfile);

    return {
      ...group,
      members: resolvedMembers,
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

  async getGroupByInviteCode(inviteCode: string, userId?: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: {
        members: {
          where: { status: MemberStatus.APPROVED },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profileImageUrl: true,
                birthYear: true,
                gender: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('유효하지 않거나 만료된 초대 링크입니다.');
    }

    let myMembership = null;
    if (userId) {
      myMembership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: group.id } },
      });
    }

    const president = group.members.find((m) => m.role === 'PRESIDENT');

    return {
      ...group,
      myMembership,
      memberCount: group.members.length,
      presidentUser: president ? president.user : null,
    };
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

    let result;

    if (existing) {
      if (existing.status === MemberStatus.APPROVED) {
        throw new BadRequestException('이미 가입된 모임입니다.');
      }
      if (existing.status === MemberStatus.PENDING) {
        throw new BadRequestException('이미 가입 신청 중입니다.');
      }
      result = await this.prisma.groupMember.update({
        where: { id: existing.id },
        data: { status: MemberStatus.PENDING },
      });
    } else {
      result = await this.prisma.groupMember.create({
        data: { userId, groupId, status: MemberStatus.PENDING },
      });
    }

    await this.notifications.notifyJoinRequest(groupId, userId);
    return result;
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

    if (dto.status !== undefined) {
      await this.requirePresident(groupId, actorUserId);
    }

    if (dto.role === MemberRole.PRESIDENT) {
      throw new ForbiddenException('회장 지정은 양도 API를 사용하세요.');
    }

    if (dto.role !== undefined && actor.role !== MemberRole.PRESIDENT) {
      throw new ForbiddenException('회장만 역할을 변경할 수 있습니다.');
    }

    if (
      target.role === MemberRole.PRESIDENT &&
      (dto.status === MemberStatus.REJECTED || dto.role !== undefined)
    ) {
      throw new ForbiddenException('회장 역할은 양도 API를 사용하세요.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.groupMember.update({
        where: { id: target.id },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
        },
        include: {
          user: {
            select: USER_MEMBER_SELECT,
          },
        },
      });

      if (dto.role !== undefined && dto.role !== target.role) {
        await this.updateOfficerHistory(tx, groupId, targetUserId, target.role, dto.role);
      }

      return updated;
    }, { timeout: 30000 });

    if (dto.status === MemberStatus.APPROVED) {
      await this.notifications.notifyJoinApproved(groupId, targetUserId);
    }

    return updated;
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

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.update({
        where: { id: actor.id },
        data: { role: MemberRole.MEMBER },
      });
      await tx.groupMember.update({
        where: { id: target.id },
        data: { role: MemberRole.PRESIDENT },
      });

      await this.updateOfficerHistory(tx, groupId, actorUserId, MemberRole.PRESIDENT, MemberRole.MEMBER);
      await this.updateOfficerHistory(tx, groupId, dto.newPresidentUserId, target.role, MemberRole.PRESIDENT);
    }, { timeout: 30000 });

    return { success: true };
  }

  async updateMyStatus(
    groupId: string,
    userId: string,
    dto: UpdateMyStatusDto,
  ) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || !isApproved(membership.status)) {
      throw new ForbiddenException('모임 회원만 상태를 변경할 수 있습니다.');
    }

    return this.prisma.groupMember.update({
      where: { id: membership.id },
      data: {
        userStatus: dto.userStatus,
      },
    });
  }

  async getPayments(
    groupId: string,
    userId: string,
    year: number,
    month: number,
  ) {
    await this.requireApprovedMember(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: MemberStatus.APPROVED },
          include: {
            user: {
              select: USER_MEMBER_SELECT,
            },
            profileCard: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    const payments = await this.prisma.feePayment.findMany({
      where: {
        groupId,
        year,
        month,
      },
    });

    const paidUserIds = new Set(payments.map(p => p.userId));

    const list = group.members.map(member => {
      const isExempt = group.officerFeeExempt && isOfficer(member.role);
      const isPaid = isExempt || paidUserIds.has(member.userId);
      const displayName = member.profileCard?.nickname || member.user.displayName;
      const profileImageUrl = member.profileCard?.profileImageUrl || member.user.profileImageUrl;
      return {
        userId: member.userId,
        displayName,
        profileImageUrl,
        gender: member.user.gender,
        birthYear: member.user.birthYear,
        role: member.role,
        isExempt,
        isPaid,
      };
    });

    return {
      bankName: group.bankName,
      bankAccountNumber: group.bankAccountNumber,
      bankAccountHolder: group.bankAccountHolder,
      dueDay: group.dueDay,
      officerFeeExempt: group.officerFeeExempt,
      payments: list,
    };
  }

  async togglePayment(
    groupId: string,
    actorUserId: string,
    targetUserId: string,
    year: number,
    month: number,
  ) {
    await this.requireOfficer(groupId, actorUserId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('모임을 찾을 수 없습니다.');
    }

    const targetMember = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
    });

    if (!targetMember || !isApproved(targetMember.status)) {
      throw new NotFoundException('대상 회원을 찾을 수 없습니다.');
    }

    const existingPayment = await this.prisma.feePayment.findUnique({
      where: {
        groupId_userId_year_month: {
          groupId,
          userId: targetUserId,
          year,
          month,
        },
      },
    });

    if (existingPayment) {
      await this.prisma.feePayment.delete({
        where: { id: existingPayment.id },
      });
      return { isPaid: false };
    } else {
      await this.prisma.feePayment.create({
        data: {
          groupId,
          userId: targetUserId,
          year,
          month,
          paidById: actorUserId,
        },
      });
      return { isPaid: true };
    }
  }

  private async updateOfficerHistory(
    tx: any,
    groupId: string,
    userId: string,
    oldRole: MemberRole,
    newRole: MemberRole,
  ) {
    const isOldOfficer = isOfficer(oldRole);
    const isNewOfficer = isOfficer(newRole);

    if (isOldOfficer && oldRole !== newRole) {
      await tx.officerHistory.updateMany({
        where: {
          groupId,
          userId,
          role: oldRole,
          endDate: null,
        },
        data: {
          endDate: new Date(),
        },
      });
    }

    if (isNewOfficer && oldRole !== newRole) {
      await tx.officerHistory.create({
        data: {
          groupId,
          userId,
          role: newRole,
          startDate: new Date(),
        },
      });
    }
  }

  async cancelJoinRequest(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership || membership.status !== MemberStatus.PENDING) {
      throw new BadRequestException('취소할 가입 신청이 없습니다.');
    }

    await this.prisma.groupMember.delete({ where: { id: membership.id } });
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

  async getGroupMedia(groupId: string, userId: string) {
    await this.requireApprovedMember(groupId, userId);
    return this.prisma.groupMedia.findMany({
      where: { groupId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGroupMedia(groupId: string, userId: string, dto: CreateGroupMediaDto) {
    await this.requireApprovedMember(groupId, userId);
    return this.prisma.groupMedia.create({
      data: {
        groupId,
        url: dto.url,
        fileType: dto.fileType,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async deleteGroupMedia(groupId: string, mediaId: string, userId: string) {
    const membership = await this.requireApprovedMember(groupId, userId);
    const media = await this.prisma.groupMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.groupId !== groupId) {
      throw new NotFoundException('미디어를 찾을 수 없습니다.');
    }

    const canDelete = isOfficer(membership.role) || media.uploadedById === userId;
    if (!canDelete) {
      throw new ForbiddenException('사진을 삭제할 권한이 없습니다.');
    }

    await this.prisma.groupMedia.delete({
      where: { id: mediaId },
    });

    return { ok: true };
  }

  async linkProfileCard(groupId: string, userId: string, profileCardId: string | null) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) throw new NotFoundException('가입되지 않은 모임입니다.');

    if (profileCardId) {
      const card = await this.prisma.userProfileCard.findUnique({
        where: { id: profileCardId },
      });
      if (!card || card.userId !== userId) {
        throw new ForbiddenException('유효하지 않은 프로필입니다.');
      }
    }

    return this.prisma.groupMember.update({
      where: { userId_groupId: { userId, groupId } },
      data: { profileCardId },
    });
  }

  async resolveGroupProfilesForUsers<T extends { id: string; displayName: string; profileImageUrl: string | null }>(
    groupId: string,
    users: T[]
  ): Promise<T[]> {
    if (users.length === 0) return users;
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
    return users;
  }

  async resolveGroupProfileForUser<T extends { id: string; displayName: string; profileImageUrl: string | null }>(
    groupId: string,
    user: T
  ): Promise<T> {
    if (!user) return user;
    const [resolved] = await this.resolveGroupProfilesForUsers(groupId, [user]);
    return resolved;
  }

  async deleteGroup(groupId: string, userId: string) {
    await this.requirePresident(groupId, userId);
    await this.prisma.group.delete({
      where: { id: groupId },
    });
    return { success: true };
  }

  async kickMember(groupId: string, targetUserId: string, actorUserId: string) {
    const actor = await this.requireOfficer(groupId, actorUserId);

    if (targetUserId === actorUserId) {
      throw new BadRequestException('자기 자신은 강제 탈퇴시킬 수 없습니다. 모임 탈퇴 기능을 이용해 주세요.');
    }

    const target = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });

    if (!target) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    if (target.role === MemberRole.PRESIDENT) {
      throw new ForbiddenException('모임의 회장은 강제 탈퇴시킬 수 없습니다. 회장직 위임 또는 해체 기능을 사용하세요.');
    }

    if (isOfficer(target.role) && actor.role !== MemberRole.PRESIDENT) {
      throw new ForbiddenException('일반 운영진은 다른 운영진을 강제 탈퇴시킬 수 없습니다. 회장만 운영진을 강퇴할 수 있습니다.');
    }

    await this.prisma.groupMember.delete({
      where: { id: target.id },
    });

    return { success: true };
  }
}

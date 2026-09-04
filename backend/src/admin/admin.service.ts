import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  UpdateUserAdminDto,
  UpdateGroupAdminDto,
  UpdateFeedbackStatusDto,
  CreateSystemAnnouncementDto,
  UpdateSystemAnnouncementDto,
  SetAppSettingDto,
  BroadcastPushDto,
  CreateRoleDto,
  UpdateRoleDto,
  ReorderRolesDto,
} from './admin.dto';

export interface RoleItem {
  id: string;
  key: string;
  label: string;
  isStaff: boolean;
  isDefault: boolean;
  canDelete: boolean;
  sortOrder: number;
}

export const DEFAULT_ROLES: RoleItem[] = [
  { id: 'role_pres', key: 'PRESIDENT', label: '회장', isStaff: true, isDefault: true, canDelete: false, sortOrder: 0 },
  { id: 'role_vp', key: 'VICE_PRESIDENT', label: '부회장', isStaff: true, isDefault: true, canDelete: false, sortOrder: 1 },
  { id: 'role_sec', key: 'SECRETARY', label: '총무', isStaff: true, isDefault: true, canDelete: false, sortOrder: 2 },
  { id: 'role_off', key: 'OFFICER', label: '스태프', isStaff: true, isDefault: true, canDelete: false, sortOrder: 3 },
  { id: 'role_member', key: 'MEMBER', label: '일반 회원', isStaff: false, isDefault: true, canDelete: false, sortOrder: 4 },
];

const DEFAULT_CATEGORIES = [
  { value: '풋살/축구', emoji: '⚽', sortOrder: 0 },
  { value: '농구', emoji: '🏀', sortOrder: 1 },
  { value: '야구', emoji: '⚾', sortOrder: 2 },
  { value: '러닝', emoji: '🏃', sortOrder: 3 },
  { value: '테니스', emoji: '🎾', sortOrder: 4 },
  { value: '탁구', emoji: '🏓', sortOrder: 5 },
  { value: '배드민턴', emoji: '🏸', sortOrder: 6 },
  { value: '볼링', emoji: '🎳', sortOrder: 7 },
  { value: '골프', emoji: '⛳', sortOrder: 8 },
  { value: '기타', emoji: '✨', sortOrder: 9 },
];

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultCategories();
  }

  async seedDefaultCategories() {
    try {
      const count = await this.prisma.category.count();
      if (count === 0) {
        this.logger.log('Seeding initial default categories...');
        for (const cat of DEFAULT_CATEGORIES) {
          await this.prisma.category.create({
            data: {
              value: cat.value,
              emoji: cat.emoji,
              sortOrder: cat.sortOrder,
              isActive: true,
            },
          });
        }
        this.logger.log('Default categories seeded successfully.');
      }
    } catch (e) {
      this.logger.warn(`Category seeding skipped: ${e}`);
    }
  }

  // ═══════════════════════════════════════════
  // 1. Dashboard Statistics
  // ═══════════════════════════════════════════
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      users7d,
      users30d,
      totalGroups,
      groupsToday,
      publicGroups,
      totalEvents,
      activeEvents,
      totalVotes,
      pendingFeedback,
      recentUsers,
      recentGroups,
      recentFeedbacks,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.group.count(),
      this.prisma.group.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.group.count({ where: { isPublic: true } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: 'ACTIVE', date: { gte: todayStart } } }),
      this.prisma.vote.count(),
      this.prisma.feedback.count({ where: { status: 'PENDING' } }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          displayName: true,
          profileImageUrl: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      }),
      this.prisma.group.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { members: true, events: true } },
        },
      }),
      this.prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // 7-day registration trend
    const trend7Days: { date: string; users: number; groups: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

      const [uCount, gCount] = await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
        this.prisma.group.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ]);

      trend7Days.push({ date: dateStr, users: uCount, groups: gCount });
    }

    return {
      summary: {
        totalUsers,
        usersToday,
        users7d,
        users30d,
        totalGroups,
        groupsToday,
        publicGroups,
        totalEvents,
        activeEvents,
        totalVotes,
        pendingFeedback,
      },
      trend7Days,
      recentUsers,
      recentGroups,
      recentFeedbacks,
    };
  }

  // ═══════════════════════════════════════════
  // 2. User Management
  // ═══════════════════════════════════════════
  async getUsers(params: {
    search?: string;
    role?: string;
    isBlocked?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { displayName: { contains: params.search, mode: 'insensitive' } },
        { phoneNumber: { contains: params.search } },
        { kakaoId: { contains: params.search } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.isBlocked !== undefined) {
      where.isBlocked = String(params.isBlocked) === 'true';
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          kakaoId: true,
          displayName: true,
          profileImageUrl: true,
          gender: true,
          birthYear: true,
          phoneNumber: true,
          bio: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          _count: {
            select: {
              memberships: true,
              createdEvents: true,
              votes: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                profileImageUrl: true,
                category: true,
              },
            },
          },
        },
        profileCards: true,
        _count: {
          select: {
            createdEvents: true,
            votes: true,
            comments: true,
            uploadedMedia: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isBlocked !== undefined ? { isBlocked: dto.isBlocked } : {}),
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
      },
    });
  }

  // ═══════════════════════════════════════════
  // 3. Group Management
  // ═══════════════════════════════════════════
  async getGroups(params: {
    search?: string;
    category?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { inviteCode: { contains: params.search } },
      ];
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.isPublic !== undefined) {
      where.isPublic = String(params.isPublic) === 'true';
    }

    const [total, groups] = await Promise.all([
      this.prisma.group.count({ where }),
      this.prisma.group.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              members: true,
              events: true,
              announcements: true,
              media: true,
            },
          },
          members: {
            where: { role: 'PRESIDENT' },
            select: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profileImageUrl: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      groups: groups.map((g) => ({
        ...g,
        president: g.members[0]?.user || null,
      })),
    };
  }

  async updateGroup(id: string, dto: UpdateGroupAdminDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('모임을 찾을 수 없습니다.');

    return this.prisma.group.update({
      where: { id },
      data: {
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.maxMembers !== undefined ? { maxMembers: dto.maxMembers } : {}),
      },
    });
  }

  async deleteGroup(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('모임을 찾을 수 없습니다.');

    await this.prisma.group.delete({ where: { id } });
    return { ok: true, message: '모임이 삭제되었습니다.' };
  }

  // ═══════════════════════════════════════════
  // 4. Category Management
  // ═══════════════════════════════════════════
  async getCategories(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { value: dto.value },
    });
    if (existing) {
      throw new BadRequestException('이미 존재하는 카테고리 이름입니다.');
    }

    const maxSort = await this.prisma.category.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = dto.sortOrder ?? ((maxSort._max.sortOrder ?? 0) + 1);

    return this.prisma.category.create({
      data: {
        value: dto.value,
        emoji: dto.emoji,
        sortOrder,
        isActive: dto.isActive !== false,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    if (dto.value && dto.value !== cat.value) {
      const conflict = await this.prisma.category.findUnique({
        where: { value: dto.value },
      });
      if (conflict) throw new BadRequestException('이미 존재하는 카테고리 이름입니다.');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('카테고리를 찾을 수 없습니다.');

    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async reorderCategories(categoryIds: string[]) {
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.getCategories(true);
  }

  // ═══════════════════════════════════════════
  // 5. Feedback Management
  // ═══════════════════════════════════════════
  async getFeedbacks(params: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    const [total, feedbacks] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      feedbacks,
    };
  }

  async updateFeedbackStatus(id: string, dto: UpdateFeedbackStatusDto) {
    const fb = await this.prisma.feedback.findUnique({ where: { id } });
    if (!fb) throw new NotFoundException('피드백을 찾을 수 없습니다.');

    return this.prisma.feedback.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async deleteFeedback(id: string) {
    const fb = await this.prisma.feedback.findUnique({ where: { id } });
    if (!fb) throw new NotFoundException('피드백을 찾을 수 없습니다.');

    await this.prisma.feedback.delete({ where: { id } });
    return { ok: true };
  }

  // ═══════════════════════════════════════════
  // 6. System Announcement Management
  // ═══════════════════════════════════════════
  async getSystemAnnouncements(includeInactive = true) {
    return this.prisma.systemAnnouncement.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createSystemAnnouncement(dto: CreateSystemAnnouncementDto) {
    return this.prisma.systemAnnouncement.create({
      data: {
        title: dto.title,
        content: dto.content,
        isActive: dto.isActive !== false,
        priority: dto.priority || 0,
      },
    });
  }

  async updateSystemAnnouncement(id: string, dto: UpdateSystemAnnouncementDto) {
    const item = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    return this.prisma.systemAnnouncement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      },
    });
  }

  async deleteSystemAnnouncement(id: string) {
    const item = await this.prisma.systemAnnouncement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    await this.prisma.systemAnnouncement.delete({ where: { id } });
    return { ok: true };
  }

  // ═══════════════════════════════════════════
  // 7. App Settings
  // ═══════════════════════════════════════════
  async getSettings() {
    const items = await this.prisma.appSetting.findMany();
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.key] = item.value;
    }
    return map;
  }

  async setSetting(dto: SetAppSettingDto) {
    return this.prisma.appSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value },
      create: { key: dto.key, value: dto.value },
    });
  }

  // ═══════════════════════════════════════════
  // 8. Broadcast Notifications
  // ═══════════════════════════════════════════
  async broadcastNotification(dto: BroadcastPushDto) {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    const logs = users.map((u) => ({
      userId: u.id,
      type: 'CREATED' as const,
      message: `[공지] ${dto.title}: ${dto.message}`,
    }));

    await this.prisma.notificationLog.createMany({
      data: logs,
    });

    return { ok: true, sentCount: users.length };
  }

  // ═══════════════════════════════════════════
  // 9. Role / Position Management
  // ═══════════════════════════════════════════
  async getRoles(): Promise<RoleItem[]> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: 'group_roles' },
    });
    if (!setting) {
      await this.prisma.appSetting.create({
        data: {
          key: 'group_roles',
          value: JSON.stringify(DEFAULT_ROLES),
        },
      });
      return DEFAULT_ROLES;
    }
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
    } catch {}
    return DEFAULT_ROLES;
  }

  async createRole(dto: CreateRoleDto) {
    const roles = await this.getRoles();
    const rawKey = dto.key?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '') || `ROLE_${Date.now()}`;
    if (roles.some((r) => r.key === rawKey)) {
      throw new BadRequestException('이미 존재하는 직책 코드(KEY)입니다.');
    }
    const maxSort = roles.reduce((max, r) => Math.max(max, r.sortOrder ?? 0), 0);
    const newRole: RoleItem = {
      id: `role_${Date.now()}`,
      key: rawKey,
      label: dto.label.trim(),
      isStaff: dto.isStaff ?? true,
      isDefault: false,
      canDelete: true,
      sortOrder: maxSort + 1,
    };
    roles.push(newRole);
    await this.prisma.appSetting.upsert({
      where: { key: 'group_roles' },
      update: { value: JSON.stringify(roles) },
      create: { key: 'group_roles', value: JSON.stringify(roles) },
    });
    return newRole;
  }

  async updateRole(key: string, dto: UpdateRoleDto) {
    const roles = await this.getRoles();
    const roleIndex = roles.findIndex((r) => r.key === key);
    if (roleIndex === -1) {
      throw new NotFoundException('해당 직책을 찾을 수 없습니다.');
    }
    const target = roles[roleIndex];
    if (dto.label !== undefined) target.label = dto.label.trim();
    if (dto.isStaff !== undefined && target.key !== 'PRESIDENT') target.isStaff = dto.isStaff;
    if (dto.sortOrder !== undefined) target.sortOrder = dto.sortOrder;

    await this.prisma.appSetting.upsert({
      where: { key: 'group_roles' },
      update: { value: JSON.stringify(roles) },
      create: { key: 'group_roles', value: JSON.stringify(roles) },
    });
    return target;
  }

  async deleteRole(key: string) {
    const roles = await this.getRoles();
    const target = roles.find((r) => r.key === key);
    if (!target) {
      throw new NotFoundException('해당 직책을 찾을 수 없습니다.');
    }
    if (target.isDefault || !target.canDelete) {
      throw new BadRequestException('기본 시스템 직책(회장, 부회장, 총무, 스태프, 회원)은 삭제할 수 없습니다. 이름(명칭) 수정만 가능합니다.');
    }
    const filtered = roles.filter((r) => r.key !== key);
    await this.prisma.appSetting.upsert({
      where: { key: 'group_roles' },
      update: { value: JSON.stringify(filtered) },
      create: { key: 'group_roles', value: JSON.stringify(filtered) },
    });
    return { ok: true };
  }

  async reorderRoles(keys: string[]) {
    const roles = await this.getRoles();
    const updated = roles.map((r) => {
      const idx = keys.indexOf(r.key);
      return { ...r, sortOrder: idx !== -1 ? idx : r.sortOrder };
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    await this.prisma.appSetting.upsert({
      where: { key: 'group_roles' },
      update: { value: JSON.stringify(updated) },
      create: { key: 'group_roles', value: JSON.stringify(updated) },
    });
    return updated;
  }
}

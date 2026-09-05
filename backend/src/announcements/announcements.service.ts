import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './announcements.dto';
import { isOfficer } from '../common/utils/group.utils';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId?: string) {
    const list = await this.prisma.announcement.findMany({
      where: groupId ? { groupId } : {},
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
            gender: true,
            birthYear: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (list.length === 0) return [];
    try {
      const ids = list.map((a) => a.id);
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT id, "isPinned" FROM "Announcement" WHERE id IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})`,
        ...ids,
      );
      const pinMap = new Map(rows.map((r) => [r.id, Boolean(r.isPinned)]));
      return list
        .map((a) => ({
          ...a,
          isPinned: pinMap.get(a.id) ?? false,
        }))
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    } catch {
      return list;
    }
  }

  async listMy(userId: string) {
    const list = await this.prisma.announcement.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
            gender: true,
            birthYear: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (list.length === 0) return [];
    try {
      const ids = list.map((a) => a.id);
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT id, "isPinned" FROM "Announcement" WHERE id IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})`,
        ...ids,
      );
      const pinMap = new Map(rows.map((r) => [r.id, Boolean(r.isPinned)]));
      return list
        .map((a) => ({
          ...a,
          isPinned: pinMap.get(a.id) ?? false,
        }))
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    } catch {
      return list;
    }
  }

  async getById(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
            gender: true,
            birthYear: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        'SELECT "isPinned" FROM "Announcement" WHERE id = $1',
        id,
      );
      return {
        ...announcement,
        isPinned: Boolean(rows[0]?.isPinned),
      };
    } catch {
      return announcement;
    }
  }

  async create(userId: string, dto: CreateAnnouncementDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (dto.groupId) {
      // Check if user is an approved member of this group
      const membership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: dto.groupId } },
      });
      if (!membership || membership.status !== 'APPROVED') {
        throw new ForbiddenException('모임 회원만 게시글을 작성할 수 있습니다.');
      }
    } else {
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException('운영자만 전체 공지사항을 작성할 수 있습니다.');
      }
    }

    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        authorId: userId,
        groupId: dto.groupId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
            gender: true,
            birthYear: true,
          },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    await this.assertCanManage(announcement, userId);

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isPinned !== undefined ? { isPinned: dto.isPinned } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
            gender: true,
            birthYear: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    await this.assertCanManage(announcement, userId);

    await this.prisma.announcement.delete({ where: { id } });
    return { ok: true, message: '게시글이 삭제되었습니다.' };
  }

  async togglePin(id: string, userId: string) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    // Check permission - use the same assertCanManage pattern already in this file
    await this.assertCanManage(ann, userId);
    await this.prisma.$executeRawUnsafe(
      'UPDATE "Announcement" SET "isPinned" = NOT "isPinned", "updatedAt" = NOW() WHERE id = $1',
      id,
    );
    return this.getById(id);
  }

  private async assertCanManage(
    announcement: { id: string; authorId: string; groupId: string | null },
    userId: string,
  ) {
    // 1. If author, allowed
    if (announcement.authorId === userId) return;

    // 2. If app ADMIN, allowed
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role === 'ADMIN') return;

    // 3. If group post, check if user is a group officer
    if (announcement.groupId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: announcement.groupId } },
      });
      if (membership && membership.status === 'APPROVED' && isOfficer(membership.role)) {
        return;
      }
    }

    throw new ForbiddenException('게시글을 수정하거나 삭제할 권한이 없습니다.');
  }
}

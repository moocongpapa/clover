import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(groupId?: string) {
    return this.prisma.announcement.findMany({
      where: groupId ? { groupId } : {},
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            role: true,
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
      throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    }
    return announcement;
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
          },
        },
      },
    });
  }
}

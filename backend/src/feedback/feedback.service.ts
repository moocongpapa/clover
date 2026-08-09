import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, userName: string, content: string) {
    return this.prisma.feedback.create({
      data: {
        userId,
        userName,
        content,
      },
    });
  }

  async listAll() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

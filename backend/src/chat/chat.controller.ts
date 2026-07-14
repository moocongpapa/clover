import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':groupId/chats')
  async getChatHistory(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Query('limit') limitStr?: string,
  ) {
    const userId = req.user.id;

    // Verify membership is APPROVED
    const member = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        status: 'APPROVED',
      },
    });

    if (!member) {
      throw new ForbiddenException('모임 회원만 채팅 기록을 조회할 수 있습니다.');
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.chatService.getMessages(groupId, limit);
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { ConfigService } from '@nestjs/config';
import { isAllowedOrigin } from '../common/utils/origin.utils';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const isAllowed = isAllowedOrigin(
          origin,
          process.env.FRONTEND_URL,
          process.env.NODE_ENV,
        );
        callback(null, isAllowed);
      } catch {
        callback(null, false);
      }
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const authHeader = client.handshake.headers.authorization as
      | string
      | undefined;
    const authToken = client.handshake.auth?.token;
    let token = typeof authToken === 'string' ? authToken : undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.isBlocked) {
        client.disconnect();
        return;
      }

      client.data.user = user;
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Left empty on purpose
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (!data?.groupId) return;
    const user = client.data.user;
    if (!user) return;

    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId: data.groupId,
        userId: user.id,
        status: 'APPROVED',
      },
    });

    if (!membership) return;
    client.join(data.groupId);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ) {
    if (!data?.groupId) return;
    client.leave(data.groupId);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      groupId: string;
      message?: string;
      imageUrl?: string;
      videoUrl?: string;
    },
  ) {
    const user = client.data.user;
    if (!user || !data?.groupId) return;

    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (message.length > 2_000) {
      client.emit('chatError', {
        message: '메시지는 2,000자 이하여야 합니다.',
      });
      return;
    }

    const imageUrl = this.isTrustedGalleryUrl(data.imageUrl);
    const videoUrl = this.isTrustedGalleryUrl(data.videoUrl);
    if ((data.imageUrl && !imageUrl) || (data.videoUrl && !videoUrl)) {
      client.emit('chatError', {
        message: '업로드된 미디어 파일만 전송할 수 있습니다.',
      });
      return;
    }
    if (!message && !imageUrl && !videoUrl) return;

    // Check if the user is a member of the group
    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId: data.groupId,
        userId: user.id,
        status: 'APPROVED',
      },
    });

    if (!membership) return;

    const savedMessage = await this.chatService.saveMessage(
      data.groupId,
      user.id,
      message,
      imageUrl,
      videoUrl,
    );

    this.server.to(data.groupId).emit('newMessage', savedMessage);
  }

  private isTrustedGalleryUrl(value?: string): string | undefined {
    if (!value) return undefined;

    try {
      const port = this.config.get<number>('PORT', 3000);
      const base =
        this.config.get<string>('API_PUBLIC_URL') ??
        (process.env.NODE_ENV === 'production' || process.env.RENDER
          ? 'https://clover-backend-vm9k.onrender.com'
          : `http://localhost:${port}`);
      const url = new URL(value);
      const publicUrl = new URL(base);
      const allowedExtensions = /\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i;
      return url.origin === publicUrl.origin &&
        url.pathname.startsWith('/uploads/gallery/') &&
        allowedExtensions.test(url.pathname)
        ? url.toString()
        : undefined;
    } catch {
      return undefined;
    }
  }
}

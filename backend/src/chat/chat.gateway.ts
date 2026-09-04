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

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const allowedOrigins = (process.env.FRONTEND_URL || 'https://clover-gilt.vercel.app,http://localhost:5174').split(',').map((o) => o.trim());
        const hostname = new URL(origin).hostname;
        const isAllowed =
          allowedOrigins.includes(origin) ||
          (hostname.endsWith('.vercel.app') && hostname.includes('clover')) ||
          hostname === 'localhost' ||
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
            origin,
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
  ) {}

  async handleConnection(client: Socket) {
    const authHeader = client.handshake.headers.authorization as string | undefined;
    const queryToken = client.handshake.query.token as string | undefined;
    let token = queryToken;

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

      if (!user) {
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
    @MessageBody() data: { groupId: string; message?: string; imageUrl?: string; videoUrl?: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.groupId) return;
    if (!data.message && !data.imageUrl && !data.videoUrl) return;

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
      data.message || '',
      data.imageUrl,
      data.videoUrl,
    );

    this.server.to(data.groupId).emit('newMessage', savedMessage);
  }
}

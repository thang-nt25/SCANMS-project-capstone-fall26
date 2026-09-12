import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

// Map userId -> Set of socket IDs (hỗ trợ multi-tab)
const userSocketMap = new Map<string, Set<string>>();

@WebSocketGateway({
  cors: {
    origin: (
      process.env.CORS_ORIGINS ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173'
    )
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    console.log('✅ ChatGateway Socket.io initialized');
  }

  async onModuleDestroy() {
    if (this.server) {
      try {
        this.server.close();
      } catch {}
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.emit('error', { message: 'Cần xác thực JWT' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.userFullName = payload.fullName;
      client.data.userRole = payload.role;

      // Đăng ký socket vào map
      if (!userSocketMap.has(payload.sub)) {
        userSocketMap.set(payload.sub, new Set());
      }
      userSocketMap.get(payload.sub)!.add(client.id);

      console.log(
        `🔗 User ${payload.fullName} (${payload.sub}) connected: ${client.id}`,
      );
      client.emit('connected', { userId: payload.sub, socketId: client.id });
    } catch (err) {
      client.emit('error', { message: 'Token không hợp lệ hoặc đã hết hạn' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && userSocketMap.has(userId)) {
      userSocketMap.get(userId)!.delete(client.id);
      if (userSocketMap.get(userId)!.size === 0) {
        userSocketMap.delete(userId);
      }
    }
    console.log(`🔌 Socket ${client.id} disconnected`);
  }

  // ---- Handlers ----

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    try {
      await this.chatService.getConversationById(data.conversationId, userId);
      client.join(`conv:${data.conversationId}`);
      client.emit('joined_conversation', {
        conversationId: data.conversationId,
      });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conv:${data.conversationId}`);
    client.emit('left_conversation', { conversationId: data.conversationId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; messageText: string; mediaUrl?: string },
  ) {
    const userId = client.data.userId;
    if (!data.conversationId || !data.messageText?.trim()) {
      client.emit('error', {
        message: 'Thiếu conversationId hoặc nội dung tin nhắn',
      });
      return;
    }

    try {
      // Kiểm tra quyền
      await this.chatService.getConversationById(data.conversationId, userId);

      // Lưu vào DB
      const message = await this.chatService.saveMessage(
        data.conversationId,
        userId,
        data.messageText.trim(),
        data.mediaUrl,
      );

      // Phát tới tất cả trong phòng conv:xxx
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('new_message', message);
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conv:${data.conversationId}`).emit('user_typing', {
      userId: client.data.userId,
      fullName: client.data.userFullName,
      isTyping: data.isTyping,
    });
  }

  // Utility: push notification tới user cụ thể (gọi từ service khác)
  emitToUser(userId: string, event: string, payload: any) {
    const sockets = userSocketMap.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }
}

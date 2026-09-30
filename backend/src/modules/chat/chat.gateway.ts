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
import { checkProfanity } from './profanity-filter';
import {
  ChatAttachmentType,
  isCloudinaryChatAttachmentUrl,
  sanitizeChatAttachmentName,
} from './chat-attachment.utils';

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
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
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
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!data?.conversationId || !UUID_REGEX.test(data.conversationId)) {
      client.emit('chat_warning', { message: 'Mã hội thoại không hợp lệ' });
      return;
    }
    try {
      await this.chatService.getConversationById(data.conversationId, userId);
      client.join(`conv:${data.conversationId}`);
      client.emit('joined_conversation', {
        conversationId: data.conversationId,
      });
    } catch (err: any) {
      client.emit('chat_warning', { message: err.message });
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
    data: {
      conversationId: string;
      messageText?: string;
      mediaUrl?: string;
      mediaType?: ChatAttachmentType;
      mediaName?: string;
    },
  ) {
    const userId = client.data.userId;
    let messageText = data.messageText?.trim() || '';
    if (!data.conversationId || (!messageText && !data.mediaUrl)) {
      client.emit('error', {
        message: 'Thiếu conversationId hoặc nội dung tin nhắn',
      });
      return;
    }

    if (
      data.mediaUrl &&
      (!data.mediaType ||
        !data.mediaName ||
        !isCloudinaryChatAttachmentUrl(data.mediaUrl, data.mediaType))
    ) {
      client.emit('error', {
        message: 'Tệp đính kèm không hợp lệ hoặc chưa được tải lên hệ thống.',
      });
      return;
    }

    if (!data.mediaUrl && (data.mediaType || data.mediaName)) {
      client.emit('error', { message: 'Thiếu đường dẫn tệp đính kèm.' });
      return;
    }

    try {
      // Kiểm tra quyền
      const conversation = await this.chatService.getConversationById(
        data.conversationId,
        userId,
      );
      // Ensure the sender receives the persisted message echo as well as the other participant.
      await client.join(`conv:${data.conversationId}`);
      messageText = await this.chatService.normalizeShareCardMessage(
        conversation.storeId,
        messageText,
      );

      // Kiểm tra nội dung người dùng nhập; các trường giá/mã của thẻ được lấy từ DB.
      const profanityCheck = messageText
        ? checkProfanity(messageText)
        : { isProfane: false };
      if (profanityCheck.isProfane) {
        client.emit('error', {
          message:
            profanityCheck.errorMessage ||
            'Tin nhắn bị chặn: Vui lòng không sử dụng từ ngữ thô tục, chửi thề hoặc vi phạm chuẩn mực văn minh.',
        });
        return;
      }

      // Lưu vào DB
      const message = await this.chatService.saveMessage(
        data.conversationId,
        userId,
        messageText,
        data.mediaUrl,
        data.mediaType,
        data.mediaName ? sanitizeChatAttachmentName(data.mediaName) : undefined,
      );

      // Phát tới tất cả trong phòng conv:xxx
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('new_message', message);
      return { ok: true, messageId: message.id };
    } catch (err: any) {
      client.emit('error', { message: err.message });
      return { ok: false, message: err.message };
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
    if (sockets && this.server) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  // Utility: phát sự kiện tới tất cả client đang mở phòng chat conv:xxx
  broadcastToConversation(conversationId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`conv:${conversationId}`).emit(event, payload);
    }
  }

  // Utility: phát tin nhắn mới đồng thời tới phòng chat và các cá nhân liên quan
  broadcastNewMessage(conversationId: string, message: any, recipientUserId?: string) {
    if (this.server) {
      this.server.to(`conv:${conversationId}`).emit('new_message', message);
    }
    if (recipientUserId) {
      this.emitToUser(recipientUserId, 'new_message', message);
    }
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateConversationDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ---- Conversation ----

  async getOrCreateConversation(dto: CreateConversationDto) {
    const existing = await this.prisma.conversation.findFirst({
      where: { storeId: dto.storeId, collaboratorId: dto.collaboratorId },
      include: {
        store: { select: { id: true, name: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { storeId: dto.storeId, collaboratorId: dto.collaboratorId },
      include: {
        store: { select: { id: true, name: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async getConversationsByUser(userId: string) {
    // Lấy danh sách hội thoại mà user tham gia (là shop owner hoặc collaborator)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { collaboratorId: userId },
          { store: { ownerId: userId } },
        ],
      },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { messageText: true, createdAt: true, senderId: true, isRead: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return conversations;
  }

  async getConversationById(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        store: { select: { id: true, name: true, logoUrl: true, ownerId: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
      },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy hội thoại');

    const isParticipant = conv.collaboratorId === userId || conv.store.ownerId === userId;
    if (!isParticipant)
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');

    return conv;
  }

  // ---- Messages ----

  async getMessages(conversationId: string, userId: string, take = 50, cursor?: string) {
    // Xác nhận user là thành viên
    await this.getConversationById(conversationId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        messageText: true,
        mediaUrl: true,
        isRead: true,
        createdAt: true,
        sender: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Đánh dấu đã đọc các tin nhắn chưa đọc của người khác gửi
    await this.prisma.chatMessage.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });

    return messages.reverse(); // Trả về theo thứ tự thời gian cũ -> mới
  }

  async saveMessage(conversationId: string, senderId: string, messageText: string, mediaUrl?: string) {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { conversationId, senderId, messageText, mediaUrl },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          messageText: true,
          mediaUrl: true,
          isRead: true,
          createdAt: true,
          sender: { select: { id: true, fullName: true, role: true } },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return message;
  }

  async countUnread(userId: string) {
    return this.prisma.chatMessage.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ collaboratorId: userId }, { store: { ownerId: userId } }],
        },
      },
    });
  }
}

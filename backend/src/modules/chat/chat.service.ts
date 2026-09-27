import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateConversationDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ---- Conversation ----

  // KOL/Shop tạo hoặc lấy conversation
  // - Shop gọi: truyền collaboratorId (storeId tự lấy từ userId)
  // - KOL gọi: truyền storeId (collaboratorId = userId)
  async getOrCreateConversation(dto: CreateConversationDto, userId: string) {
    let storeId = dto.storeId;
    let collaboratorId = dto.collaboratorId;
    let customerId = dto.customerId;
    let targetStoreOwnerId: string | undefined;
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!actor) throw new ForbiddenException('Tài khoản không tồn tại');

    // Nếu shop gọi (có collaboratorId, không có storeId) → tự lấy storeId
    if (!storeId && (collaboratorId || customerId)) {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: userId, isDeleted: false },
      });
      if (!store)
        throw new BadRequestException(
          'Tài khoản Shop này chưa có cửa hàng nào',
        );
      storeId = store.id;
    }

    if (storeId) {
      const targetStore = await this.prisma.store.findFirst({
        where: { id: storeId, isDeleted: false, isActive: true },
        select: { ownerId: true },
      });
      if (!targetStore) throw new NotFoundException('Không tìm thấy cửa hàng');

      // Người không phải chủ shop chỉ được tạo hội thoại với chính danh tính của mình.
      targetStoreOwnerId = targetStore.ownerId;
      if (targetStore.ownerId !== userId) {
        if (
          (collaboratorId && collaboratorId !== userId) ||
          (customerId && customerId !== userId)
        ) {
          throw new ForbiddenException('Không thể tạo hội thoại thay cho người dùng khác');
        }
        if (actor.role === 'CUSTOMER') {
          customerId = userId;
          collaboratorId = undefined;
        } else if (actor.role === 'COLLABORATOR') {
          collaboratorId = userId;
          customerId = undefined;
        } else {
          throw new ForbiddenException('Vai trò này không thể tạo hội thoại với Shop');
        }
      } else if (actor.role !== 'SHOP_MANAGER' && actor.role !== 'SYSTEM_ADMIN') {
        throw new ForbiddenException('Chỉ chủ Shop được mở hội thoại thay mặt Shop');
      }
    }

    if (!storeId || (!collaboratorId && !customerId) || (collaboratorId && customerId)) {
      throw new BadRequestException(
        'Thông tin cửa hàng hoặc người nhận không hợp lệ',
      );
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !UUID_REGEX.test(storeId) ||
      (collaboratorId ? !UUID_REGEX.test(collaboratorId) : false) ||
      (customerId ? !UUID_REGEX.test(customerId) : false)
    ) {
      throw new BadRequestException('ID cửa hàng hoặc đối tác không đúng định dạng UUID');
    }

    // Đảm bảo quan hệ đối tác StoreCollaborator được ghi nhận
    if (collaboratorId) try {
      await this.prisma.storeCollaborator.upsert({
        where: {
          storeId_collaboratorId: {
            storeId,
            collaboratorId,
          },
        },
        update: {},
        create: {
          storeId,
          collaboratorId,
          status: 'APPROVED',
        },
      });
    } catch (e) {
      // Ignored if relation already exists or schema differs
    }

    if (targetStoreOwnerId === userId) {
      const recipientId = customerId || collaboratorId!;
      const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { role: true, isActive: true } });
      if (!recipient?.isActive || recipient.role !== (customerId ? 'CUSTOMER' : 'COLLABORATOR')) {
        throw new BadRequestException('Người nhận không hợp lệ');
      }
    }

    const existing = await this.prisma.conversation.findFirst({
      where: customerId ? { storeId, customerId } : { storeId, collaboratorId },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
        customer: { select: { id: true, fullName: true, role: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            messageText: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
    });
    if (existing) return existing;

    try {
      return await this.prisma.conversation.create({
        data: { storeId, collaboratorId: collaboratorId || null, customerId: customerId || null },
        include: {
          store: { select: { id: true, name: true, logoUrl: true } },
          collaborator: { select: { id: true, fullName: true, role: true } },
          customer: { select: { id: true, fullName: true, role: true } },
          chatMessages: {
            orderBy: { createdAt: 'desc' }, take: 1,
            select: { messageText: true, createdAt: true, senderId: true, isRead: true },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const concurrent = await this.prisma.conversation.findFirst({
          where: customerId ? { storeId, customerId } : { storeId, collaboratorId },
          include: {
            store: { select: { id: true, name: true, logoUrl: true } },
            collaborator: { select: { id: true, fullName: true, role: true } },
            customer: { select: { id: true, fullName: true, role: true } },
            chatMessages: { orderBy: { createdAt: 'desc' }, take: 1,
              select: { messageText: true, createdAt: true, senderId: true, isRead: true } },
          },
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async getConversationsByUser(userId: string) {
    // Lấy danh sách hội thoại mà user tham gia (là shop owner hoặc collaborator)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { collaboratorId: userId },
          { customerId: userId },
          { store: { ownerId: userId } },
        ],
      },
      include: {
        _count: { select: { chatMessages: { where: { isRead: false, senderId: { not: userId } } } } },
        store: { select: { id: true, name: true, logoUrl: true } },
        collaborator: { select: { id: true, fullName: true, role: true } },
        customer: { select: { id: true, fullName: true, role: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            messageText: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return conversations;
  }

  async getConversationById(conversationId: string, userId: string) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      throw new BadRequestException('Mã hội thoại không đúng định dạng UUID');
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        store: {
          select: { id: true, name: true, logoUrl: true, ownerId: true },
        },
        collaborator: { select: { id: true, fullName: true, role: true } },
        customer: { select: { id: true, fullName: true, role: true } },
      },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy hội thoại');

    const isParticipant =
      conv.collaboratorId === userId ||
      conv.customerId === userId ||
      conv.store.ownerId === userId;
    if (!isParticipant)
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');

    return conv;
  }

  // ---- Messages ----

  async getMessages(
    conversationId: string,
    userId: string,
    take = 50,
    cursor?: string,
  ) {
    // Xác nhận user là thành viên
    await this.getConversationById(conversationId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
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
    return messages.reverse(); // Trả về theo thứ tự thời gian cũ -> mới
  }

  async markRead(conversationId: string, userId: string) {
    await this.getConversationById(conversationId, userId);
    return this.prisma.chatMessage.updateMany({
      where: { conversationId, isRead: false, senderId: { not: userId } },
      data: { isRead: true },
    });
  }

  async normalizeProductInquiry(card: any, storeId: string) {
    if (!card?.productId || typeof card.message !== 'string' || !card.message.trim()) {
      throw new BadRequestException('Sản phẩm hoặc nội dung chat không hợp lệ');
    }
    const product = await this.prisma.product.findFirst({
      where: { id: card.productId, storeId, isDeleted: false, isActive: true },
      select: { id: true, sku: true, title: true, imageUrl: true, price: true },
    });
    if (!product) throw new BadRequestException('Sản phẩm không thuộc Shop này');
    return JSON.stringify({
      type: 'PRODUCT_INQUIRY', productId: product.id, productSku: product.sku,
      productTitle: product.title, productImage: product.imageUrl,
      productPrice: Number(product.price), message: card.message.trim(),
    });
  }

  async saveMessage(
    conversationId: string,
    senderId: string,
    messageText: string,
    mediaUrl?: string,
    messageId?: string,
  ) {
    if (messageId) {
      const existing = await this.prisma.chatMessage.findUnique({ where: { id: messageId },
        include: { sender: { select: { id: true, fullName: true, role: true } } },
      });
      if (existing) {
        if (existing.senderId !== senderId || existing.conversationId !== conversationId) {
          throw new ForbiddenException('Mã tin nhắn không hợp lệ');
        }
        return existing;
      }
    }
    let message;
    try {
      [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { ...(messageId ? { id: messageId } : {}), conversationId, senderId, messageText, mediaUrl },
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
    } catch (error: any) {
      if (messageId && error?.code === 'P2002') {
        const existing = await this.prisma.chatMessage.findUnique({ where: { id: messageId },
          include: { sender: { select: { id: true, fullName: true, role: true } } },
        });
        if (existing?.senderId === senderId && existing.conversationId === conversationId) return existing;
      }
      throw error;
    }
    return message;
  }

  async countUnread(userId: string) {
    return this.prisma.chatMessage.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [
            { collaboratorId: userId },
            { customerId: userId },
            { store: { ownerId: userId } },
          ],
        },
      },
    });
  }

  // ---- Shop tìm kiếm KOL/CTV để bắt đầu chat ----
  async searchCollaborators(q?: string) {
    const trimmed = (q || '').trim();
    const list = await this.prisma.user.findMany({
      where: {
        role: 'COLLABORATOR',
        isActive: true,
        isDeleted: false,
        ...(trimmed
          ? {
              OR: [
                { fullName: { contains: trimmed, mode: 'insensitive' } },
                { email: { contains: trimmed, mode: 'insensitive' } },
                { phoneNumber: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        collaboratorProfile: {
          select: {
            avatarUrl: true,
            tier: true,
            kycStatus: true,
            totalFollowers: true,
            totalOrdersReferred: true,
            totalEarnedCommission: true,
          },
        },
        socialChannels: {
          select: {
            id: true,
            platformName: true,
            channelName: true,
            channelUrl: true,
            followerCount: true,
            isPrimary: true,
          },
        },
      },
      take: 50,
    });

    return list.map((u) => ({
      ...u,
      avatarUrl: u.collaboratorProfile?.avatarUrl || null,
    }));
  }

  // ---- KOL tìm kiếm Shop để bắt đầu chat ----
  async searchStores(q?: string) {
    const trimmed = (q || '').trim();
    return this.prisma.store.findMany({
      where: {
        isDeleted: false,
        ...(trimmed
          ? {
              OR: [
                { name: { contains: trimmed, mode: 'insensitive' } },
                { description: { contains: trimmed, mode: 'insensitive' } },
                { slug: { contains: trimmed, mode: 'insensitive' } },
                {
                  owner: {
                    fullName: { contains: trimmed, mode: 'insensitive' },
                  },
                },
                {
                  owner: { email: { contains: trimmed, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        owner: { select: { id: true, fullName: true, email: true } },
      },
      take: 20,
    });
  }
}

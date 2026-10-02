import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { CreateConversationDto } from './dto/send-message.dto';
import {
  ChatAttachmentType,
  sanitizeChatAttachmentName,
  validateChatAttachment,
} from './chat-attachment.utils';
import { CouponStatus, Prisma } from '@prisma/client';

function isExclusiveDealMessage(messageText?: string): boolean {
  if (!messageText) return false;
  try {
    const type = JSON.parse(messageText)?.type;
    return type === 'EXCLUSIVE_DEAL_PROPOSAL' || type === 'EXCLUSIVE_DEAL_DECISION';
  } catch {
    return false;
  }
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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

    // Đảm bảo quan hệ đối tác StoreCollaborator được ghi nhận nếu là collaborator
    if (collaboratorId) {
      try {
        await this.prisma.storeCollaborator.upsert({
          where: { storeId_collaboratorId: { storeId, collaboratorId } },
          update: {},
          create: { storeId, collaboratorId, status: 'APPROVED' },
        });
      } catch {}
    }

    if (targetStoreOwnerId === userId) {
      const recipientId = customerId || collaboratorId!;
      const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { role: true, isActive: true } });
      if (!recipient?.isActive || recipient.role !== (customerId ? 'CUSTOMER' : 'COLLABORATOR')) {
        throw new BadRequestException('Người nhận không hợp lệ');
      }
    }

    const convInclude = {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          owner: { select: { fullName: true, avatarUrl: true } },
        },
      },
      collaborator: {
        select: {
          id: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          collaboratorProfile: { select: { avatarUrl: true } },
        },
      },
      customer: { select: { id: true, fullName: true, role: true } },
      chatMessages: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: {
          id: true,
          messageText: true,
          mediaUrl: true,
          mediaType: true,
          mediaName: true,
          createdAt: true,
          senderId: true,
          isRead: true,
        },
      },
    };

    const existing = await this.prisma.conversation.findFirst({
      where: customerId ? { storeId, customerId } : { storeId, collaboratorId },
      include: convInclude,
    });
    if (existing) return existing;

    try {
      return await this.prisma.conversation.create({
        data: { storeId, collaboratorId: collaboratorId || null, customerId: customerId || null },
        include: convInclude,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const concurrent = await this.prisma.conversation.findFirst({
          where: customerId ? { storeId, customerId } : { storeId, collaboratorId },
          include: convInclude,
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async getConversationsByUser(userId: string) {
    // Lấy danh sách hội thoại mà user tham gia (là shop owner hoặc collaborator)
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isCustomer = requester?.role === 'CUSTOMER';
    const conversationWhere: Prisma.ConversationWhereInput = isCustomer
      ? {
          OR: [
            { customerId: userId },
            { collaboratorId: userId, collaborator: { is: { role: 'CUSTOMER' } } },
          ],
        }
      : {
          OR: [
            { collaboratorId: userId },
            { customerId: userId },
            { store: { ownerId: userId } },
          ],
        };
    const conversations = await this.prisma.conversation.findMany({
      where: conversationWhere,
      include: {
        _count: { select: { chatMessages: { where: { isRead: false, senderId: { not: userId } } } } },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            owner: { select: { fullName: true, avatarUrl: true } },
          },
        },
        collaborator: {
          select: {
            id: true,
            fullName: true,
            role: true,
            avatarUrl: true,
            collaboratorProfile: { select: { avatarUrl: true } },
          },
        },
        customer: { select: { id: true, fullName: true, role: true } },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            messageText: true,
            mediaType: true,
            mediaName: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    if (!isCustomer) return conversations;

    // Protect against legacy/malformed customer conversations that contain a
    // private deal card, including the conversation-list preview payload.
    return conversations.map((conversation) => ({
      ...conversation,
      chatMessages: conversation.chatMessages.map((message) =>
        isExclusiveDealMessage(message.messageText)
          ? { ...message, messageText: 'Shop đã gửi tin nhắn.' }
          : message,
      ),
    }));
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
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            ownerId: true,
            owner: { select: { fullName: true, avatarUrl: true } },
          },
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

    // A customer may chat with a Shop, but must never be able to enter a
    // Shop–KOL thread even if a stale or malformed participant link exists.
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (
      requester?.role === 'CUSTOMER' &&
      conv.customerId !== userId &&
      (conv.collaboratorId !== userId || conv.collaborator?.role !== 'CUSTOMER')
    ) {
      throw new ForbiddenException('Khách hàng không có quyền truy cập trao đổi nội bộ Shop–KOL.');
    }

    return conv;
  }

  async normalizeShareCardMessage(storeId: string, messageText: string) {
    let card: any;
    try {
      card = JSON.parse(messageText);
    } catch {
      return messageText;
    }

    if (card?.type === 'PRODUCT_INQUIRY') {
      const productId = typeof card.productId === 'string' ? card.productId : '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
        throw new BadRequestException('Sản phẩm được chia sẻ không hợp lệ.');
      }

      const product = await this.prisma.product.findFirst({
        where: {
          id: productId,
          storeId,
          isDeleted: false,
          isActive: true,
          store: { isDeleted: false, isActive: true, owner: { isActive: true } },
        },
        select: {
          id: true,
          sku: true,
          title: true,
          imageUrl: true,
          price: true,
        },
      });
      if (!product) {
        throw new BadRequestException(
          'Sản phẩm không còn được bán tại gian hàng này.',
        );
      }

      return JSON.stringify({
        type: 'PRODUCT_INQUIRY',
        productId: product.id,
        productTitle: product.title,
        productImage: product.imageUrl || undefined,
        productPrice: Number(product.price),
        productSku: product.sku,
        message:
          typeof card.message === 'string'
            ? card.message.trim().slice(0, 500)
            : 'Khách đang quan tâm sản phẩm này.',
      });
    }

    if (card?.type === 'COUPON_VOUCHER') {
      const couponId = typeof card.couponId === 'string' ? card.couponId : '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(couponId)) {
        throw new BadRequestException('Mã giảm giá được chia sẻ không hợp lệ.');
      }

      const now = new Date();
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          id: couponId,
          storeId,
          status: CouponStatus.ACTIVE,
          deletedAt: null,
          store: {
            isDeleted: false,
            isActive: true,
            owner: { isActive: true, isDeleted: false },
          },
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        select: {
          id: true,
          displayCode: true,
          discountType: true,
          discountValue: true,
          minimumOrderAmount: true,
          maximumDiscountAmount: true,
          usageLimitTotal: true,
          usageCount: true,
          expiresAt: true,
          scopeType: true,
          couponProducts: {
            where: { product: { isDeleted: false, isActive: true } },
            select: { product: { select: { id: true, title: true } } },
          },
          couponCategories: { select: { categoryName: true } },
          store: { select: { name: true } },
        },
      });
      if (
        !coupon ||
        (coupon.usageLimitTotal !== null &&
          coupon.usageCount >= coupon.usageLimitTotal)
      ) {
        throw new BadRequestException('Mã giảm giá đã hết hạn hoặc hết lượt.');
      }

      return JSON.stringify({
        type: 'COUPON_VOUCHER',
        couponId: coupon.id,
        couponCode: coupon.displayCode,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minimumOrderAmount: coupon.minimumOrderAmount
          ? Number(coupon.minimumOrderAmount)
          : null,
        maximumDiscountAmount: coupon.maximumDiscountAmount
          ? Number(coupon.maximumDiscountAmount)
          : null,
        remainingUses:
          coupon.usageLimitTotal === null
            ? null
            : coupon.usageLimitTotal - coupon.usageCount,
        expiresAt: coupon.expiresAt?.toISOString() || null,
        scopeType: coupon.scopeType,
        products: coupon.couponProducts.map((item) => item.product),
        categories: coupon.couponCategories.map((item) => item.categoryName),
        storeName: coupon.store.name,
      });
    }

    return messageText;
  }

  // ---- Messages ----

  async getMessages(
    conversationId: string,
    userId: string,
    take = 50,
    cursor?: string,
  ) {
    // Xác nhận user là thành viên
    const conversation = await this.getConversationById(conversationId, userId);

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
        mediaType: true,
        mediaName: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true,
            avatarUrl: true,
            collaboratorProfile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    const orderedMessages = messages.reverse();
    const isCustomerConversation =
      (conversation.collaboratorId === userId && conversation.collaborator?.role === 'CUSTOMER') ||
      conversation.customerId === userId;
    return isCustomerConversation
      ? orderedMessages.filter((message) => !isExclusiveDealMessage(message.messageText))
      : orderedMessages;
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
      type: 'PRODUCT_INQUIRY',
      productId: product.id,
      productSku: product.sku,
      productTitle: product.title,
      productImage: product.imageUrl,
      productPrice: Number(product.price),
      message: card.message.trim(),
    });
  }

  async saveMessage(
    conversationId: string,
    senderId: string,
    messageText: string,
    mediaUrl?: string,
    mediaType?: ChatAttachmentType,
    mediaName?: string,
    messageId?: string,
  ) {
    if (messageId) {
      const existing = await this.prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              role: true,
              avatarUrl: true,
              collaboratorProfile: { select: { avatarUrl: true } },
            },
          },
        },
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
          data: {
            ...(messageId ? { id: messageId } : {}),
            conversationId,
            senderId,
            messageText,
            mediaUrl,
            mediaType,
            mediaName,
          },
          select: {
            id: true,
            conversationId: true,
            senderId: true,
            messageText: true,
            mediaUrl: true,
            mediaType: true,
            mediaName: true,
            isRead: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                collaboratorProfile: { select: { avatarUrl: true } },
              },
            },
          },
        }),
        this.prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        }),
      ]);
    } catch (error: any) {
      if (messageId && error?.code === 'P2002') {
        const existing = await this.prisma.chatMessage.findUnique({
          where: { id: messageId },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                role: true,
                avatarUrl: true,
                collaboratorProfile: { select: { avatarUrl: true } },
              },
            },
          },
        });
        if (existing?.senderId === senderId && existing.conversationId === conversationId) return existing;
      }
      throw error;
    }
    return message;
  }

  async uploadAttachment(
    conversationId: string,
    userId: string,
    file?: Express.Multer.File,
  ) {
    await this.getConversationById(conversationId, userId);
    const type = validateChatAttachment(file);
    const safeName = sanitizeChatAttachmentName(file!.originalname);
    const safeFile = { ...file!, originalname: safeName };
    const folder = `scanms/chat/${conversationId}`;
    const uploaded =
      type === 'IMAGE'
        ? await this.cloudinary.uploadImage(safeFile, folder)
        : type === 'VIDEO'
          ? await this.cloudinary.uploadVideo(safeFile, folder)
          : await this.cloudinary.uploadDocument(safeFile, folder);

    return {
      url: uploaded.secureUrl,
      type,
      fileName: safeName,
      size: uploaded.bytes,
      format: uploaded.format,
    };
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
        owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
      take: 20,
    });
  }
}

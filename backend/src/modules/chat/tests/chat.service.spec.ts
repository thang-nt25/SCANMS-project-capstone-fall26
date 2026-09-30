import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ChatService (FR-25)', () => {
  let service: ChatService;
  let prisma: any;

  const mockStoreId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const mockOwnerId = 'b2c3d4e5-f6a1-4b2c-8d3e-4f5a6b7c8d9e';
  const mockCollaboratorId = 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f';
  const mockConversationId = 'd4e5f6a1-b2c3-4d4e-8f5a-6b7c8d9e0f1a';
  const mockIntruderId = 'e5f6a1b2-c3d4-4e5f-8a6b-7c8d9e0f1a2b';
  const mockNonExistentConvId = 'f6a1b2c3-d4e5-4f6a-8b7c-8d9e0f1a2b3c';
  const mockMessageId = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d';

  const mockStore = {
    id: mockStoreId,
    name: 'Cửa hàng Sora',
    ownerId: mockOwnerId,
    isDeleted: false,
  };

  const mockConversation = {
    id: mockConversationId,
    storeId: mockStoreId,
    collaboratorId: mockCollaboratorId,
    lastMessageAt: new Date(),
    store: mockStore,
    collaborator: { id: mockCollaboratorId, fullName: 'KOL Linh', role: 'COLLABORATOR' },
    chatMessages: [],
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findFirst: jest.fn().mockResolvedValue(mockStore),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({
          role: where.id === mockOwnerId ? 'SHOP_MANAGER' : 'COLLABORATOR', isActive: true,
        })),
        findMany: jest.fn(),
      },
      storeCollaborator: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      product: { findFirst: jest.fn() },
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      product: { findFirst: jest.fn() },
      coupon: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: { uploadImage: jest.fn(), uploadVideo: jest.fn(), uploadDocument: jest.fn() } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);

      const res = await service.getOrCreateConversation(
        { storeId: mockStoreId, collaboratorId: mockCollaboratorId },
        mockCollaboratorId,
      );

      expect(res.id).toBe(mockConversationId);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should resolve storeId when shop manager initiates chat with collaboratorId', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ role: 'SHOP_MANAGER', isActive: true })
        .mockResolvedValueOnce({ role: 'COLLABORATOR', isActive: true });
      prisma.store.findFirst.mockResolvedValue(mockStore);
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);

      const res = await service.getOrCreateConversation(
        { collaboratorId: mockCollaboratorId },
        mockOwnerId,
      );

      expect(res.id).toBe(mockConversationId);
      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { ownerId: mockOwnerId, isDeleted: false },
      });
      expect(prisma.conversation.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if shop manager has no store', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ role: 'SHOP_MANAGER' });
      prisma.store.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrCreateConversation({ collaboratorId: mockCollaboratorId }, mockOwnerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not create an affiliate relationship for a customer opening product chat', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER', isActive: true });
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ ...mockConversation, customerId: mockIntruderId });

      const result = await service.getOrCreateConversation(
        { storeId: mockStoreId },
        mockIntruderId,
      );

      expect(result.id).toBe(mockConversationId);
      expect(prisma.storeCollaborator.upsert).not.toHaveBeenCalled();
      expect(prisma.conversation.create).toHaveBeenCalled();
    });

    it('rejects a non-owner attempting to create a conversation for another customer', async () => {
      await expect(service.getOrCreateConversation(
        { storeId: mockStoreId, customerId: mockIntruderId }, mockCollaboratorId,
      )).rejects.toThrow(ForbiddenException);
    });

    it('does not allow a collaborator to impersonate a customer via asCustomer', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);
      await service.getOrCreateConversation({ storeId: mockStoreId, asCustomer: true }, mockCollaboratorId);
      expect(prisma.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ collaboratorId: mockCollaboratorId, customerId: null }),
      }));
    });

    it('routes a customer to their own customerId, ignoring FE asCustomer', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER', isActive: true });
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ ...mockConversation, customerId: mockIntruderId });
      await service.getOrCreateConversation({ storeId: mockStoreId }, mockIntruderId);
      expect(prisma.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ customerId: mockIntruderId, collaboratorId: null }),
      }));
    });
  });

  describe('getConversationById', () => {
    it('should return conversation if user is a valid participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      const res = await service.getConversationById(mockConversationId, mockCollaboratorId);
      expect(res.id).toBe(mockConversationId);
    });

    it('should throw ForbiddenException if user is an outsider', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      await expect(
        service.getConversationById(mockConversationId, mockIntruderId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not let a customer enter a Shop–KOL conversation', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' });

      await expect(
        service.getConversationById(mockConversationId, mockCollaboratorId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationById(mockNonExistentConvId, mockCollaboratorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('customer chat privacy', () => {
    it('limits customer conversation listing to their own Shop chats and redacts deal previews', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' });
      prisma.conversation.findMany.mockResolvedValue([{
        ...mockConversation,
        chatMessages: [{
          messageText: JSON.stringify({
            type: 'EXCLUSIVE_DEAL_PROPOSAL',
            proposedCommissionRate: 30,
          }),
        }],
      }]);

      const conversations = await service.getConversationsByUser(mockCollaboratorId);

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          OR: [
            { customerId: mockCollaboratorId },
            { collaboratorId: mockCollaboratorId, collaborator: { is: { role: 'CUSTOMER' } } },
          ],
        },
      }));
      expect(conversations[0].chatMessages[0].messageText).toBe('Shop đã gửi tin nhắn.');
    });

    it('filters private deal cards from customer message history', async () => {
      const customerConversation = {
        ...mockConversation,
        collaboratorId: mockIntruderId,
        collaborator: { id: mockIntruderId, fullName: 'Khách hàng', role: 'CUSTOMER' },
      };
      prisma.conversation.findUnique.mockResolvedValue(customerConversation);
      prisma.user.findUnique.mockResolvedValue({ role: 'CUSTOMER' });
      prisma.chatMessage.findMany.mockResolvedValue([
        { id: 'deal-message', messageText: JSON.stringify({ type: 'EXCLUSIVE_DEAL_PROPOSAL' }) },
        { id: 'normal-message', messageText: 'Shop chào bạn' },
      ]);

      const messages = await service.getMessages(mockConversationId, mockIntruderId);

      expect(messages.map((message: any) => message.id)).toEqual(['normal-message']);
    });
  });

  describe('saveMessage', () => {
    it('should create message and update conversation lastMessageAt in transaction', async () => {
      const mockSavedMessage = {
        id: mockMessageId,
        conversationId: mockConversationId,
        senderId: mockCollaboratorId,
        messageText: 'Chào shop!',
        mediaUrl: null,
        isRead: false,
        createdAt: new Date(),
        sender: { id: mockCollaboratorId, fullName: 'KOL Linh', role: 'COLLABORATOR' },
      };

      prisma.$transaction.mockResolvedValue([mockSavedMessage, mockConversation]);

      const res = await service.saveMessage(mockConversationId, mockCollaboratorId, 'Chào shop!');
      expect(res.id).toBe(mockMessageId);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('persists attachment URL and metadata with the message', async () => {
      prisma.$transaction.mockResolvedValue([{
        id: mockMessageId,
        conversationId: mockConversationId,
        senderId: mockCollaboratorId,
        messageText: '',
        mediaUrl: 'https://res.cloudinary.com/demo/video/upload/review.mp4',
        mediaType: 'VIDEO',
        mediaName: 'review.mp4',
        isRead: false,
        createdAt: new Date(),
        sender: { id: mockCollaboratorId, fullName: 'KOL Linh', role: 'COLLABORATOR' },
      }, mockConversation]);

      await service.saveMessage(
        mockConversationId,
        mockCollaboratorId,
        '',
        'https://res.cloudinary.com/demo/video/upload/review.mp4',
        'VIDEO',
        'review.mp4',
      );

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          mediaUrl: 'https://res.cloudinary.com/demo/video/upload/review.mp4',
          mediaType: 'VIDEO',
          mediaName: 'review.mp4',
        }),
      }));
    });
  });

  describe('normalizeShareCardMessage', () => {
    it('rebuilds a product inquiry card from the active product in the conversation store', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a',
        sku: 'SERUM-001',
        title: 'Serum phục hồi',
        imageUrl: 'https://cdn.scanms.vn/serum.jpg',
        price: { toString: () => '249000' },
      });

      const result = await service.normalizeShareCardMessage(
        mockStoreId,
        JSON.stringify({
          type: 'PRODUCT_INQUIRY',
          productId: '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a',
          productTitle: 'Forged title',
          productPrice: 1,
          message: 'Mình muốn hỏi về sản phẩm.',
        }),
      );

      expect(JSON.parse(result)).toMatchObject({
        type: 'PRODUCT_INQUIRY',
        productTitle: 'Serum phục hồi',
        productPrice: 249000,
        productSku: 'SERUM-001',
        productImage: 'https://cdn.scanms.vn/serum.jpg',
      });
      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ storeId: mockStoreId }) }),
      );
    });

    it('rebuilds a coupon card with the current active coupon details', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: '8b8b8b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b',
        displayCode: 'SORA20',
        discountType: 'PERCENTAGE',
        discountValue: { toString: () => '20' },
        minimumOrderAmount: { toString: () => '300000' },
        maximumDiscountAmount: null,
        usageLimitTotal: 50,
        usageCount: 12,
        expiresAt: null,
        scopeType: 'STORE_WIDE',
        couponProducts: [],
        couponCategories: [],
        store: { name: 'Sora Skin' },
      });

      const result = await service.normalizeShareCardMessage(
        mockStoreId,
        JSON.stringify({
          type: 'COUPON_VOUCHER',
          couponId: '8b8b8b8b-8b8b-4b8b-8b8b-8b8b8b8b8b8b',
          couponCode: 'FAKE99',
          discountValue: 99,
        }),
      );

      expect(JSON.parse(result)).toMatchObject({
        type: 'COUPON_VOUCHER',
        couponCode: 'SORA20',
        discountValue: 20,
        minimumOrderAmount: 300000,
        remainingUses: 38,
        storeName: 'Sora Skin',
      });
      expect(prisma.coupon.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ storeId: mockStoreId }) }),
      );
    });
  });

  describe('saveMessage idempotency', () => {
    it('returns the existing message for the same client-generated id without inserting again', async () => {
      const existing = { id: mockMessageId, conversationId: mockConversationId, senderId: mockCollaboratorId };
      prisma.chatMessage.findUnique.mockResolvedValue(existing);
      const result = await service.saveMessage(mockConversationId, mockCollaboratorId, 'Xin chào', undefined, undefined, undefined, mockMessageId);
      expect(result).toEqual(existing);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects reuse of another sender’s message id', async () => {
      prisma.chatMessage.findUnique.mockResolvedValue({ id: mockMessageId, conversationId: mockConversationId, senderId: mockIntruderId });
      await expect(service.saveMessage(mockConversationId, mockCollaboratorId, 'Xin chào', undefined, undefined, undefined, mockMessageId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('product inquiry', () => {
    it('rejects a product that does not belong to the conversation Shop', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.normalizeProductInquiry({ productId: mockMessageId, message: 'Cho tôi hỏi sản phẩm này' }, mockStoreId))
        .rejects.toThrow(BadRequestException);
      expect(prisma.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ storeId: mockStoreId }),
      }));
    });
  });

  describe('searchCollaborators & searchStores', () => {
    it('should search collaborators with case-insensitive query', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'kol-1', fullName: 'KOL Linh', email: 'linh@scanms.vn' },
      ]);

      const res = await service.searchCollaborators('Linh');
      expect(res).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should search stores with case-insensitive query', async () => {
      prisma.store.findMany.mockResolvedValue([
        { id: 'store-1', name: 'Sora Skin', logoUrl: null, owner: { id: 'u-1', fullName: 'Sora Owner', email: 'owner@sora.vn' } },
      ]);

      const res = await service.searchStores('Sora');
      expect(res).toHaveLength(1);
      expect(prisma.store.findMany).toHaveBeenCalled();
    });
  });
});

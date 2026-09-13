import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ChatService (FR-25)', () => {
  let service: ChatService;
  let prisma: any;

  const mockStore = {
    id: 'store-1',
    name: 'Cửa hàng Sora',
    ownerId: 'shop-owner-1',
    isDeleted: false,
  };

  const mockConversation = {
    id: 'conv-1',
    storeId: 'store-1',
    collaboratorId: 'kol-1',
    lastMessageAt: new Date(),
    store: mockStore,
    collaborator: { id: 'kol-1', fullName: 'KOL Linh', role: 'COLLABORATOR' },
    chatMessages: [],
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if found', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);

      const res = await service.getOrCreateConversation(
        { storeId: 'store-1', collaboratorId: 'kol-1' },
        'kol-1',
      );

      expect(res.id).toBe('conv-1');
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should resolve storeId when shop manager initiates chat with collaboratorId', async () => {
      prisma.store.findFirst.mockResolvedValue(mockStore);
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue(mockConversation);

      const res = await service.getOrCreateConversation(
        { collaboratorId: 'kol-1' },
        'shop-owner-1',
      );

      expect(res.id).toBe('conv-1');
      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: { ownerId: 'shop-owner-1', isDeleted: false },
      });
      expect(prisma.conversation.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if shop manager has no store', async () => {
      prisma.store.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrCreateConversation({ collaboratorId: 'kol-1' }, 'shop-owner-no-store'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConversationById', () => {
    it('should return conversation if user is a valid participant', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      const res = await service.getConversationById('conv-1', 'kol-1');
      expect(res.id).toBe('conv-1');
    });

    it('should throw ForbiddenException if user is an outsider', async () => {
      prisma.conversation.findUnique.mockResolvedValue(mockConversation);

      await expect(
        service.getConversationById('conv-1', 'intruder-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationById('non-existent-conv', 'kol-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveMessage', () => {
    it('should create message and update conversation lastMessageAt in transaction', async () => {
      const mockSavedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'kol-1',
        messageText: 'Chào shop!',
        mediaUrl: null,
        isRead: false,
        createdAt: new Date(),
        sender: { id: 'kol-1', fullName: 'KOL Linh', role: 'COLLABORATOR' },
      };

      prisma.$transaction.mockResolvedValue([mockSavedMessage, mockConversation]);

      const res = await service.saveMessage('conv-1', 'kol-1', 'Chào shop!');
      expect(res.id).toBe('msg-1');
      expect(prisma.$transaction).toHaveBeenCalled();
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

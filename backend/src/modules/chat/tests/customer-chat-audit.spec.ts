import { ForbiddenException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { ProductsService } from '../../products/products.service';

describe('Shop customer messaging boundaries', () => {
  const storeId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const ownerId = 'b2c3d4e5-f6a1-4b2c-8d3e-4f5a6b7c8d9e';
  const customerId = 'c3d4e5f6-a1b2-4c3d-8e4f-5a6b7c8d9e0f';
  let prisma: any;
  let service: ChatService;
  beforeEach(() => {
    prisma = {
      store: { findFirst: jest.fn().mockResolvedValue({ id: storeId, ownerId }) },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => Promise.resolve({ role: where.id === ownerId ? 'SHOP_MANAGER' : 'CUSTOMER', isActive: true })),
        findFirst: jest.fn().mockResolvedValue({ id: customerId }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      conversation: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'conversation' }) },
      storeCollaborator: { upsert: jest.fn() },
      product: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new ChatService(prisma, {} as any);
  });

  it('searches only active customers who bought from or contacted the owner store', async () => {
    await service.searchCustomers(ownerId, ' Hà ');
    expect(prisma.store.findFirst).toHaveBeenCalledWith({ where: { ownerId, isDeleted: false }, select: { id: true } });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: 'CUSTOMER', isDeleted: false, isActive: true,
        OR: [{ customerOrders: { some: { storeId } } }, { customerConversations: { some: { storeId } } }],
        AND: [{ OR: [
          { fullName: { contains: 'Hà', mode: 'insensitive' } },
          { email: { contains: 'Hà', mode: 'insensitive' } },
          { phoneNumber: { contains: 'Hà', mode: 'insensitive' } },
        ] }],
      }),
      select: { id: true, fullName: true, avatarUrl: true },
    }));
  });
  it('rejects searches by users without an owner store', async () => {
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(service.searchCustomers(customerId, '')).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it('opens customer support without creating a KOL relationship', async () => {
    await service.getOrCreateConversation({ customerId }, ownerId);
    expect(prisma.conversation.create).toHaveBeenCalledWith(expect.objectContaining({ data: { storeId, customerId, collaboratorId: null } }));
    expect(prisma.storeCollaborator.upsert).not.toHaveBeenCalled();
  });
  it('rejects attempts to contact a customer outside the store', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.getOrCreateConversation({ customerId }, ownerId)).rejects.toThrow(ForbiddenException);
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
  it('the product picker excludes hidden/unapproved products while preserving store ownership', async () => {
    await ProductsService.prototype.findAll.call({ prisma, getUserStoreId: jest.fn().mockResolvedValue(null), loadProductEvidence: jest.fn().mockResolvedValue(new Map()) } as any, { storeId, scope: 'chat-share' }, { id: ownerId, role: 'SHOP_MANAGER' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ storeId, isDeleted: false, isActive: true, moderationStatus: 'APPROVED', store: expect.objectContaining({ ownerId }) }) }));
  });
});

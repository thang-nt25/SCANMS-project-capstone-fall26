import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductModerationStatus } from '@prisma/client';
import { ProductsService } from '../products.service';

describe('Product moderation workflow', () => {
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    notification: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const cache: any = { delPrefix: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) =>
      callback(prisma),
    );
    service = new ProductsService(prisma, { get: jest.fn() } as any, cache);
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      title: 'Serum kiểm duyệt',
      moderationStatus: ProductModerationStatus.DRAFT,
      store: { id: 'store-1', name: 'Shop test', ownerId: 'owner-1' },
    });
    prisma.product.update.mockResolvedValue({ id: 'product-1' });
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    cache.delPrefix.mockResolvedValue(undefined);
  });

  it('approves a draft, activates it, notifies the Shop, records audit, and invalidates its landing cache', async () => {
    await service.moderateProduct('manager-1', 'product-1', {
      status: 'APPROVED',
    });

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          moderationStatus: ProductModerationStatus.APPROVED,
          moderationReason: null,
          moderatedById: 'manager-1',
          isActive: true,
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'owner-1',
          type: 'PRODUCT_APPROVED',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(cache.delPrefix).toHaveBeenCalledWith('landing:v2:product-1:');
  });

  it('requires a clear reason to reject a product', async () => {
    await expect(
      service.moderateProduct('manager-1', 'product-1', {
        status: 'REJECTED',
        reason: '  ',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('does not allow a product that has already left the review queue to be reviewed again', async () => {
    prisma.product.findFirst.mockResolvedValueOnce({
      id: 'product-1',
      moderationStatus: ProductModerationStatus.APPROVED,
      store: { id: 'store-1', name: 'Shop test', ownerId: 'owner-1' },
    });

    await expect(
      service.moderateProduct('manager-1', 'product-1', {
        status: 'REJECTED',
        reason: 'Thiếu nhãn',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('returns not found for a missing product', async () => {
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.moderateProduct('manager-1', 'missing', { status: 'APPROVED' }),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['createdById', 'submittedById'])(
    'blocks the %s actor from reviewing their own version',
    async (field) => {
      prisma.product.findFirst.mockResolvedValueOnce({
        id: 'product-1',
        moderationStatus: 'DRAFT',
        [field]: 'maker',
        store: { id: 'store-1', ownerId: 'owner-1' },
      });
      await expect(
        service.moderateProduct('maker', 'product-1', { status: 'APPROVED' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    },
  );

  it('reads the current queue state after obtaining the row lock', async () => {
    const calls: string[] = [];
    prisma.$queryRaw.mockImplementationOnce(async () => {
      calls.push('locked');
    });
    prisma.product.findFirst.mockImplementationOnce(async () => {
      calls.push('read-current');
      return {
        id: 'product-1',
        moderationStatus: 'REJECTED',
        store: { id: 'store-1', ownerId: 'owner-1' },
      };
    });
    await expect(
      service.moderateProduct('checker', 'product-1', { status: 'APPROVED' }),
    ).rejects.toThrow(ConflictException);
    expect(calls).toEqual(['locked', 'read-current']);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

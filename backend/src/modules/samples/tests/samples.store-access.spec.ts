import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { managedStoreWhere } from '../../../common/policies/store-access.policy';
import { SamplesService } from '../samples.service';

describe('sample inbox and badge Shop scope', () => {
  const fixture = () => {
    const prisma = {
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: 'assigned-shop' }),
      },
      sampleProductRequest: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'request',
            status: 'SHIPPED',
            product: { storeId: 'assigned-shop', store: { ownerId: 'owner' } },
          }),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = Object.assign(Object.create(SamplesService.prototype), {
      prisma,
    }) as SamplesService;
    return { service, prisma };
  };

  it.each(['getRequestsForShop', 'getShopStats'] as const)(
    '%s uses current owner/staff membership and scopes samples to the resolved Shop',
    async (method) => {
      const { service, prisma } = fixture();
      await service[method]('staff');
      expect(prisma.store.findFirst).toHaveBeenCalledWith({
        where: managedStoreWhere('staff'),
        select: { id: true },
      });
      expect(prisma.sampleProductRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { storeId: 'assigned-shop' },
          }),
        }),
      );
    },
  );

  it.each(['getRequestsForShop', 'getShopStats'] as const)(
    '%s cannot read samples after assignment is revoked',
    async (method) => {
      const { service, prisma } = fixture();
      prisma.store.findFirst.mockResolvedValueOnce(null);
      await expect(service[method]('revoked')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.sampleProductRequest.findMany).not.toHaveBeenCalled();
      expect(prisma.sampleProductRequest.groupBy).not.toHaveBeenCalled();
    },
  );

  it('uses the requested Shop only inside live assignment scope', async () => {
    const { service, prisma } = fixture();
    await service.getRequestsForShop('staff', undefined, 'assigned-shop');
    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { ...managedStoreWhere('staff'), id: 'assigned-shop' },
      select: { id: true },
    });
  });

  it('allows assigned staff to read a sample detail belonging to the assigned Shop', async () => {
    const { service, prisma } = fixture();
    await expect(
      service.getRequestById('request', 'staff', 'SHOP_MANAGER'),
    ).resolves.toEqual(expect.objectContaining({ id: 'request' }));
    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { ...managedStoreWhere('staff'), id: 'assigned-shop' },
      select: { id: true },
    });
  });

  it('rejects commands/details after assignment is revoked or for another Shop', async () => {
    const { service, prisma } = fixture();
    prisma.store.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getRequestById('request', 'revoked', 'SHOP_MANAGER'),
    ).rejects.toThrow(ForbiddenException);
  });
});

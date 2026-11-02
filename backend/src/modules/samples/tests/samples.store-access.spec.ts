import { NotFoundException } from '@nestjs/common';
import { managedStoreWhere } from '../../../common/policies/store-access.policy';
import { SamplesService } from '../samples.service';

describe('sample inbox and badge Shop scope', () => {
  const fixture = () => {
    const prisma = {
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'assigned-shop' }) },
      sampleProductRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = Object.assign(Object.create(SamplesService.prototype), { prisma }) as SamplesService;
    return { service, prisma };
  };

  it.each(['getRequestsForShop', 'getShopStats'] as const)('%s uses current owner/staff membership and scopes samples to the resolved Shop', async (method) => {
    const { service, prisma } = fixture();
    await service[method]('staff');
    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: managedStoreWhere('staff'), select: { id: true },
    });
    expect(prisma.sampleProductRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ product: { storeId: 'assigned-shop' } }),
    }));
  });

  it.each(['getRequestsForShop', 'getShopStats'] as const)('%s cannot read samples after assignment is revoked', async (method) => {
    const { service, prisma } = fixture();
    prisma.store.findFirst.mockResolvedValueOnce(null);
    await expect(service[method]('revoked')).rejects.toThrow(NotFoundException);
    expect(prisma.sampleProductRequest.findMany).not.toHaveBeenCalled();
    expect(prisma.sampleProductRequest.groupBy).not.toHaveBeenCalled();
  });
});

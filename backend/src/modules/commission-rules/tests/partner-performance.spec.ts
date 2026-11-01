import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoreCollaboratorsService } from '../store-collaborators.service';

describe('Partner performance scope and real metrics', () => {
  const fixture = () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'SHOP_MANAGER' }) },
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'owned-store' }) },
      order: { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2),
        aggregate: jest.fn().mockResolvedValue({ _sum: { finalAmount: 500000 } }),
        findMany: jest.fn().mockResolvedValue([{ id: 'order', externalOrderSn: 'ORDER-1', createdAt: new Date(), finalAmount: 250000, status: 'DELIVERED', orderItems: [{ product: { title: 'Product' } }], commissions: [{ commissionAmount: 17000 }] }]) },
      commission: { aggregate: jest.fn().mockResolvedValue({ _sum: { commissionAmount: 34000 } }) },
      clickTrafficLog: { count: jest.fn().mockResolvedValue(10) },
    };
    return { prisma, service: new StoreCollaboratorsService(prisma as any) };
  };
  it('scopes every query to the owned store and selected creator, uses recorded commission', async () => {
    const { prisma, service } = fixture();
    const result = await service.getPartnerPerformance('owner', 'creator', '30d', 'owned-store');
    expect(prisma.store.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'owned-store', isDeleted: false }) }));
    expect(prisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ storeId: 'owned-store', attributedCollaboratorId: 'creator', status: { in: ['DELIVERED', 'COMPLETED'] } }) }));
    expect(prisma.commission.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ collaboratorId: 'creator', order: expect.objectContaining({ storeId: 'owned-store' }), status: { in: ['APPROVED', 'PAID'] } }) }));
    expect(prisma.clickTrafficLog.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ referralLink: { storeId: 'owned-store', collaboratorId: 'creator' } }) }));
    expect(result).toMatchObject({ revenue: 500000, commission: 34000, conversionRate: 40, completionRate: 50 });
    expect(result.orders[0].commission).toBe(17000);
  });
  it('rejects an unowned store before reading orders', async () => {
    const { prisma, service } = fixture(); prisma.store.findFirst.mockResolvedValue(null);
    await expect(service.getPartnerPerformance('owner', 'creator', '30d', 'other-store')).rejects.toThrow(NotFoundException);
    expect(prisma.order.count).not.toHaveBeenCalled();
  });
  it('validates ranges and uses Vietnam month boundaries', async () => {
    const { prisma, service } = fixture();
    await expect(service.getPartnerPerformance('owner', 'creator', 'invalid')).rejects.toThrow(BadRequestException);
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T18:00:00Z'));
    try {
      await service.getPartnerPerformance('owner', 'creator', 'month');
      expect(prisma.order.count.mock.calls[0][0].where.createdAt.gte).toEqual(new Date('2026-10-31T17:00:00Z'));
    } finally { jest.useRealTimers(); }
  });
  it('keeps zero-click conversion unknown and all-time unbounded', async () => {
    const { prisma, service } = fixture(); prisma.clickTrafficLog.count.mockResolvedValue(0);
    const result = await service.getPartnerPerformance('owner', 'creator', 'all');
    expect(result.conversionRate).toBeNull();
    expect(prisma.order.count.mock.calls[0][0].where.createdAt.gte).toBeUndefined();
  });
});

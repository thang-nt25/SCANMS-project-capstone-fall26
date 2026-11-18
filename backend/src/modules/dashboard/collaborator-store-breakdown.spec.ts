import { DashboardService } from './dashboard.service';

describe('Collaborator store reporting', () => {
  it('aggregates every eligible order independently of the ten displayed orders and keeps owner scope', async () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ storeId: index < 20 ? 'store-a' : 'store-b', finalAmount: 100000, store: { name: index < 20 ? 'A' : 'B', logoUrl: '/store.png' }, orderItems: [{ calculatedCommissionAmount: index < 20 ? 11000 : 16000 }] }));
    const prisma = { order: { count: jest.fn().mockResolvedValue(25), findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(rows) } };
    const service = new DashboardService(prisma as any);
    const result = await service.getCollaboratorReferralOrders('creator', { page: 2, limit: 10, storeId: 'store-a' });
    expect(result.stores).toHaveLength(2);
    expect(result.stores[0]).toMatchObject({ storeId: 'store-a', ordersCount: 20, totalRevenue: 2000000, totalCommission: 220000 });
    expect(result.stores[1]).toMatchObject({ storeId: 'store-b', ordersCount: 5, totalCommission: 80000 });
    expect(result.stores.reduce((sum, store) => sum + store.percentage, 0)).toBeCloseTo(100);
    expect(prisma.order.findMany.mock.calls[0][0]).toMatchObject({ where: { attributedCollaboratorId: 'creator', storeId: 'store-a' }, skip: 10, take: 10 });
    const aggregateQuery = prisma.order.findMany.mock.calls[1][0];
    expect(aggregateQuery.where).toEqual({ attributedCollaboratorId: 'creator', status: { in: ['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED'] } });
    expect(aggregateQuery.take).toBeUndefined();
  });
  it('does not invent stores or commission when no eligible orders exist', async () => {
    const prisma = { order: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) } };
    const result = await new DashboardService(prisma as any).getCollaboratorReferralOrders('creator', {});
    expect(result.stores).toEqual([]);
  });
});

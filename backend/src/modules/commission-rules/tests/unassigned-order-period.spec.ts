import { CommissionRulesService } from '../commission-rules.service';

describe('legacy orders without a completion period', () => {
  it('exposes recorded legacy order values without treating them as monthly revenue', async () => {
    const service: any = Object.create(CommissionRulesService.prototype);
    const tx = { $queryRaw: jest.fn(), commissionRule: { findMany: jest.fn().mockResolvedValue([]) } };
    service.prisma = {
      order: { findMany: jest.fn().mockResolvedValue([
        { externalOrderSn: 'OLD-1', status: 'COMPLETED', completedAt: null, createdAt: new Date('2026-10-01T00:00:00Z'), finalAmount: '280000.10' },
        { externalOrderSn: 'OLD-2', status: 'COMPLETED', completedAt: null, createdAt: new Date('2026-09-01T00:00:00Z'), finalAmount: '180000.20' },
      ]) },
      $transaction: jest.fn(fn => fn(tx)),
      store: { findUnique: jest.fn().mockResolvedValue({ name: 'Sora' }) },
      monthlyBonusResult: { findUnique: jest.fn().mockResolvedValue(null) },
      bonusAdjustment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service.verifyStoreExists = jest.fn();
    service.calculateValidMonthlyRevenue = jest.fn().mockResolvedValue({ validRevenue: '100.00', validOrdersCount: 1 });
    const result = await service.getKolProgress('store', 'kol', '2026-10');
    expect(result.validRevenue).toBe('100.00');
    expect(result.validOrdersCount).toBe(1);
    expect(result.unassignedRecordedValue).toBe('460000.30');
    expect(result.unassignedOrderDetails).toHaveLength(2);
    expect(result.unassignedOrderDetails[1].purchasedAt.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(Number(result.estimatedTotalBonus)).toBe(0);
  });
  it('blocks financial processing when completed orders are undated', async () => {
    const service: any = Object.create(CommissionRulesService.prototype);
    const client = { order: { count: jest.fn().mockResolvedValue(17) } };
    await expect(service.assertCompletionDatesResolved(client, 'store', 'kol')).rejects.toThrow('Chưa đủ dữ liệu kỳ');
    expect(client.order.count).toHaveBeenCalledWith({ where: { storeId: 'store', attributedCollaboratorId: 'kol', status: 'COMPLETED', completedAt: null } });
    client.order.count.mockResolvedValue(0);
    await expect(service.assertCompletionDatesResolved(client, 'store', 'kol')).resolves.toBeUndefined();
  });
  it('reports undated completed orders separately without adding revenue or bonus', async () => {
    const service: any = Object.create(CommissionRulesService.prototype);
    const missing = [{ id: 'old', externalOrderSn: 'OLD-1', attributedCollaboratorId: 'kol' }];
    const findMany = jest.fn().mockResolvedValueOnce([{ attributedCollaboratorId: 'kol' }]).mockResolvedValueOnce(missing);
    service.prisma = {
      store: { findUnique: jest.fn().mockResolvedValue({ name: 'Sora' }) },
      storeCollaborator: { findMany: jest.fn().mockResolvedValue([{ collaborator: { id: 'kol', fullName: 'Creator' } }]) },
      order: { findMany },
    };
    service.cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    service.verifyStoreExists = jest.fn();
    service.getKolProgress = jest.fn().mockResolvedValue({ validRevenue: '0', validOrdersCount: 0, estimatedTotalBonus: '0' });
    const result = await service.getTeamProgress('store', '2026-10');
    expect(result.summary).toMatchObject({ totalRevenue: '0.00', totalEstimatedBonus: '0.00', unassignedCompletedOrdersCount: 1 });
    expect(result.members[0].unassignedCompletedOrders).toEqual(['OLD-1']);
    expect(findMany.mock.calls[1][0].where).toMatchObject({ storeId: 'store', status: 'COMPLETED', completedAt: null });
    expect(service.getKolProgress).toHaveBeenCalledWith('store', 'kol', '2026-10');
  });
});

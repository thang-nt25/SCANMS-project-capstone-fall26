import { CouponsService } from '../coupons.service';
import { UserRole } from '@prisma/client';

describe('KOL coupon oversight', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  function fixture() {
    const coupon = { id, storeId: 'store', approver: { fullName: 'Người duyệt' } };
    const prisma = {
      store: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'owner' }) },
      coupon: { findFirst: jest.fn().mockResolvedValue(coupon) },
      $queryRaw: jest.fn().mockReturnValue(Promise.resolve([])),
      $transaction: jest.fn().mockResolvedValue([[{ total: 21 }], [{ orderId: 'order', status: 'USED' }]]),
    };
    return { prisma, service: new CouponsService(prisma as any) };
  }
  it('limits Shop to its assigned store before reading coupon/history', async () => {
    const { service, prisma } = fixture();
    await expect(service.couponOversight(id, 'other', UserRole.SHOP_MANAGER, 'store')).rejects.toThrow();
    expect(prisma.coupon.findFirst).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    await expect(service.couponOversight(id, 'owner', UserRole.SHOP_MANAGER, 'store')).resolves.toMatchObject({ meta: { total: 21, totalPages: 2 } });
    expect(prisma.coupon.findFirst.mock.calls[0][0].where.storeId).toBe('store');
  });
  it('only permits operational roles and validates page before reading', async () => {
    const { service, prisma } = fixture();
    await expect(service.couponOversight(id, 'buyer', UserRole.CUSTOMER)).rejects.toThrow();
    await expect(service.couponOversight(id, 'owner', UserRole.SHOP_MANAGER)).rejects.toThrow();
    await expect(service.couponOversight(id, 'admin', UserRole.SYSTEM_ADMIN, undefined, 0)).rejects.toThrow();
    expect(prisma.coupon.findFirst).not.toHaveBeenCalled();
  });
  it('returns real approval/history, deduplicates primary and stacked uses with bound IDs', async () => {
    const { service, prisma } = fixture();
    const result = await service.couponOversight(id, 'admin', UserRole.SYSTEM_MANAGER, undefined, 2);
    expect(result.coupon.approver?.fullName).toBe('Người duyệt');
    expect(result.history).toHaveLength(1);
    const sql = prisma.$queryRaw.mock.calls[1][0];
    expect(sql.text).toContain('NOT EXISTS');
    expect(sql.text).toContain('LIMIT 20 OFFSET');
    expect(sql.values).toContain(id);
    expect(sql.values.at(-1)).toBe(20);
  });
  it('does not query history when the coupon is outside the allowed scope', async () => {
    const { service, prisma } = fixture(); prisma.coupon.findFirst.mockResolvedValue(null as any);
    await expect(service.couponOversight(id, 'admin', UserRole.SYSTEM_ADMIN)).rejects.toThrow();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

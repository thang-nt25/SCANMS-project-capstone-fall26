import { CouponsService } from '../coupons.service';

describe('KOL coupon usage history', () => {
  const setup = (coupon: unknown) => {
    const prisma = {
      coupon: { findFirst: jest.fn().mockResolvedValue(coupon) },
      couponRedemption: {
        findMany: jest.fn().mockResolvedValue([{ id: 'redemption', status: 'USED', discountAmount: 50000 }]),
        count: jest.fn().mockResolvedValue(12),
      },
    };
    const service = Object.create(CouponsService.prototype) as CouponsService;
    Object.assign(service, { prisma });
    return { service, prisma };
  };
  it('only reads history after verifying ownership and limits the response to ten safe records', async () => {
    const { service, prisma } = setup({ id: 'own-coupon', status: 'ACTIVE' });
    const result = await service.getCouponDetailForKol('kol', 'own-coupon');
    expect(prisma.coupon.findFirst.mock.calls[0][0].where).toEqual({ id: 'own-coupon', collaboratorId: 'kol' });
    expect(prisma.couponRedemption.findMany).toHaveBeenCalledWith({ where: { couponId: 'own-coupon' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10, select: { id: true, status: true, discountAmount: true, createdAt: true } });
    expect(result.usageHistoryTotal).toBe(12);
  });
  it.each([null, { id: 'deleted', status: 'DELETED' }])('does not expose history for unavailable coupons', async coupon => {
    const { service, prisma } = setup(coupon);
    await expect(service.getCouponDetailForKol('kol', 'other')).rejects.toThrow();
    expect(prisma.couponRedemption.findMany).not.toHaveBeenCalled();
  });
});

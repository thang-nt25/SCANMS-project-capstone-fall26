import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from '../coupons.service';

describe('Saved expired voucher history', () => {
  const current = new Date('2026-10-18T04:30:00Z');
  const coupon = (id: string, expiresAt: Date | null, extra: object = {}) => ({
    id, displayCode: id.toUpperCase(), discountType: 'FIXED_AMOUNT', discountValue: 15000,
    minimumOrderAmount: 100000, maximumDiscountAmount: null, usageLimitTotal: 100, usageCount: 5,
    expiresAt, status: 'ACTIVE', deletedAt: null, scopeType: 'STORE_WIDE', fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS',
    store: { id: 'shop', name: 'Shop', slug: 'shop' }, ...extra,
  });
  let prisma: any, service: CouponsService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(current);
    const rows = [coupon('expired-a', new Date(current.getTime() - 1000)), coupon('expired-b', new Date(current.getTime() - 1000)),
      coupon('boundary', current), coupon('future', new Date(current.getTime() + 1)), coupon('unlimited', null),
      coupon('deleted', current, { deletedAt: current }), coupon('rejected', current, { status: 'REJECTED' })];
    prisma = {
      customerSavedCoupon: { findMany: jest.fn(async ({ where }) =>
        (where.userId === 'a' ? ['expired-a', 'boundary', 'future', 'unlimited', 'deleted', 'rejected'] : where.userId === 'b' ? ['expired-b'] : []).map(couponId => ({ couponId }))) },
      coupon: {
        findMany: jest.fn(async ({ where }) => rows.filter(row => where.id.in.includes(row.id) && row.expiresAt && row.expiresAt <= where.expiresAt.lte && !row.deletedAt && where.status.in.includes(row.status))),
        findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    service = new CouponsService(prisma, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('returns only this customer’s saved expired coupons, including the exact expiry boundary', async () => {
    const result = await service.getSavedExpiredCoupons('a');
    expect(result.map(item => item.id)).toEqual(['expired-a', 'boundary']);
    expect(result[0]).toMatchObject({ code: 'EXPIRED-A', discountValue: 15000, remainingUses: 95 });
    expect(result[0]).not.toHaveProperty('status');
    expect(prisma.customerSavedCoupon.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'a' } }));
    expect(prisma.coupon.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ expiresAt: { lte: current }, deletedAt: null }),
      orderBy: [{ expiresAt: 'desc' }, { id: 'asc' }],
      select: expect.objectContaining({ store: { select: { id: true, name: true, slug: true } } }),
    }));
    expect(prisma.coupon.findMany.mock.calls[0][0]).not.toHaveProperty('take');
    expect((await service.getSavedExpiredCoupons('b')).map(item => item.id)).toEqual(['expired-b']);
  });

  it('does not query global expired coupons for an account with no saved vouchers', async () => {
    await expect(service.getSavedExpiredCoupons('empty')).resolves.toEqual([]);
    expect(prisma.coupon.findMany).not.toHaveBeenCalled();
  });

  it('cannot save an expired voucher', async () => {
    await expect(service.saveCoupon('a', 'expired-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.coupon.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.arrayContaining([{ OR: [{ expiresAt: null }, { expiresAt: { gt: current } }] }]) }),
    }));
  });

  it('rejects expired shop, platform and shipping vouchers at the apply endpoints', async () => {
    (service as any).checkRateLimit = jest.fn();
    (service as any).recordValidationFailure = jest.fn();
    prisma.coupon.findUnique.mockResolvedValue(coupon('expired-a', current));
    await expect(service.validateCoupon({ code: 'EXPIRED-A' } as any)).rejects.toMatchObject({ response: expect.objectContaining({ errorCode: 'COUPON_EXPIRED' }) });
    for (const benefitType of ['GOODS', 'SHIPPING']) {
      prisma.coupon.findUnique.mockResolvedValue(coupon('expired-a', current, { storeId: 'shop', benefitType, fundingSource: 'PLATFORM_FUNDED' }));
      await expect(service.previewStackedVoucher({ code: 'EXPIRED-A', storeId: 'shop', benefitType, goodsSubtotal: 200000, shippingFee: 20000, shopDiscount: 0 } as any)).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});

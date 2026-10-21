import { CouponsService } from '../coupons.service';

describe('product voucher suggestions use Apply eligibility without its side effects', () => {
  const productId = '00000000-0000-4000-8000-000000000001';
  const variantId = '00000000-0000-4000-8000-000000000002';
  function coupon(id: string, extra: any = {}) {
    return { id, codeNormalized: id, displayCode: id, storeId: 'shop', status: 'ACTIVE',
      scopeType: 'STORE_WIDE', fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS', discountType: 'PERCENTAGE', discountValue: 10,
      minimumOrderAmount: null, maximumDiscountAmount: null, usageLimitTotal: null, usageCount: 0,
      budgetTotal: null, budgetUsed: 0, usageLimitPerCustomer: 1, startsAt: null, expiresAt: null,
      stackableWithProductDiscount: false, store: { id: 'shop', name: 'Shop', isDeleted: false },
      couponProducts: [], couponCategories: [], liveSession: null, ...extra };
  }
  function fixture(coupons: any[]) {
    const product = { id: productId, storeId: 'shop', categoryName: 'Serum', price: 250000, originalPrice: 280000, stockQuantity: 20,
      variants: [{ id: variantId, productId, price: 320000, stockQuantity: 10, isActive: true }] };
    const prisma = { product: { findFirst: jest.fn().mockResolvedValue(product) }, coupon: { findMany: jest.fn().mockResolvedValue(coupons) },
      user: { findUnique: jest.fn().mockResolvedValue({ phoneNumber: '0901234567' }) },
      couponRedemption: { groupBy: jest.fn().mockResolvedValue([]) }, notification: { create: jest.fn() } };
    const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }) };
    return { service: new CouponsService(prisma as any, cache as any), prisma, cache, product };
  }
  const query = { productId, variantId, quantity: 1 };

  it('omits wrong scope, threshold, budget, dates, quota, inactive live and the wrong voucher slot', async () => {
    const rows = [coupon('VALID'), coupon('OTHER', { scopeType: 'PRODUCTS', couponProducts: [{ productId: 'other' }] }),
      coupon('CATEGORY', { scopeType: 'CATEGORIES', couponCategories: [{ categoryName: 'Other' }] }),
      coupon('MINIMUM', { minimumOrderAmount: 500000 }), coupon('BUDGET', { budgetTotal: 10000, budgetUsed: 10000 }),
      coupon('USES', { usageLimitTotal: 1, usageCount: 1 }), coupon('EXPIRED', { expiresAt: new Date('2000-01-01') }),
      coupon('LIVE', { liveSession: { status: 'ENDED', inviteStatus: 'ACCEPTED', products: [] } }),
      coupon('SHIP', { benefitType: 'SHIPPING' }), coupon('PLATFORM', { fundingSource: 'PLATFORM_FUNDED' }),
      coupon('CAMPAIGN', { scopeType: 'CAMPAIGN', campaignId: 'c', campaign: { isActive: true, storeId: 'shop', startDate: new Date('2000-01-01'), endDate: new Date('2099-01-01'), campaignProducts: [{ productId: 'other' }] } }),
    ];
    const { service, prisma, cache } = fixture(rows);
    expect((await service.getEligibleProductCoupons('shop', query, 'buyer')).map(row => row.code)).toEqual(['VALID']);
    expect(prisma.product.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.couponRedemption.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
  });
  it('rechecks actual variant prices and quantity against minimum spend and direct-discount stacking', async () => {
    const { service, product } = fixture([coupon('MINIMUM', { minimumOrderAmount: 500000 }), coupon('STACKABLE', { stackableWithProductDiscount: true })]);
    expect((await service.getEligibleProductCoupons('shop', query)).map(row => row.code)).toEqual(['STACKABLE']);
    expect((await service.getEligibleProductCoupons('shop', { ...query, quantity: 2 })).map(row => row.code)).toEqual(['MINIMUM', 'STACKABLE']);
    product.variants[0].price = 250000;
    expect((await service.getEligibleProductCoupons('shop', { ...query, quantity: 2 })).map(row => row.code)).toEqual(['STACKABLE']);
  });
  it('respects per-account usage and requires a valid in-stock variant', async () => {
    const { service, prisma } = fixture([coupon('USED')]);
    prisma.couponRedemption.groupBy.mockResolvedValue([{ couponId: 'USED', _count: { _all: 1 } }] as any);
    expect(await service.getEligibleProductCoupons('shop', query, 'buyer')).toEqual([]);
    expect(prisma.couponRedemption.groupBy.mock.calls[0][0].where.OR).toEqual([{ customerId: 'buyer' }, { customerPhone: '0901234567' }]);
    expect(await service.getEligibleProductCoupons('shop', { productId, quantity: 1 })).toEqual([]);
    expect(await service.getEligibleProductCoupons('shop', { ...query, variantId: 'other' })).toEqual([]);
    expect(await service.getEligibleProductCoupons('shop', { ...query, quantity: 11 })).toEqual([]);
  });
  it('returns exact discounts, caps and best-first order for current selection', async () => {
    const { service } = fixture([coupon('SMALL', { maximumDiscountAmount: 5000 }), coupon('LARGE')]);
    const result = await service.getEligibleProductCoupons('shop', query);
    expect(result.map(row => [row.code, row.discountAmount])).toEqual([['LARGE', 32000], ['SMALL', 5000]]);
    expect(result[0]).not.toHaveProperty('collaboratorId');
  });
});

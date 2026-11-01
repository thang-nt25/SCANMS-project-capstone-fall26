// Pricing transactions have separate PostgreSQL integration coverage.
jest.mock('../pricing/pricing-policy', () => ({ lockPricingProducts: jest.fn(), reservePromotionBudget: jest.fn(), releasePromotionBudget: jest.fn() }));
import { OrdersService } from './orders.service';
import { allocateDiscount, liveVoucherActive, priceVoucherLines } from '../coupons/voucher-pricing';

describe('Word section 6 checkout margin protection', () => {
  function fixture() {
    const coupons: Record<string, any> = {
      shop: { id: 'shop', codeNormalized: 'KOL50', storeId: 'store', status: 'ACTIVE', benefitType: 'GOODS',
        fundingSource: 'SHOP_FUNDED', scopeType: 'PRODUCTS', couponProducts: [{ productId: 'a' }], couponCategories: [],
        collaborator: { role: 'COLLABORATOR' },
        discountType: 'FIXED_AMOUNT', discountValue: 50000, minimumOrderAmount: null, maximumDiscountAmount: null,
        usageLimitTotal: 20, usageCount: 0, usageLimitPerCustomer: 1, budgetTotal: 1000000, budgetUsed: 0, shopFundingRate: 100 },
      platform: { id: 'platform', codeNormalized: 'SAN20', displayCode: 'SAN20', storeId: 'store', status: 'ACTIVE', benefitType: 'GOODS',
        fundingSource: 'PLATFORM_FUNDED', scopeType: 'STORE_WIDE', discountType: 'FIXED_AMOUNT', discountValue: 20000,
        maximumDiscountAmount: null, usageLimitTotal: 20, usageCount: 0, usageLimitPerCustomer: 1, budgetTotal: 1000000, budgetUsed: 0, shopFundingRate: 0 },
      ship: { id: 'ship', codeNormalized: 'SHIP50', displayCode: 'SHIP50', storeId: 'store', status: 'ACTIVE', benefitType: 'SHIPPING',
        fundingSource: 'SHOP_FUNDED', scopeType: 'STORE_WIDE', discountType: 'FIXED_AMOUNT', discountValue: 50000,
        maximumDiscountAmount: null, usageLimitTotal: 20, usageCount: 0, usageLimitPerCustomer: 1, budgetTotal: 1000000, budgetUsed: 0, shopFundingRate: 100 },
    };
    const store = { id: 'store', name: 'Audit Shop', isActive: true, attributionWindowDays: 30 };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn().mockResolvedValue(1),
      store: { findUnique: jest.fn().mockResolvedValue(store) },
      user: { findUnique: jest.fn().mockResolvedValue({ phoneNumber: '0911111111' }) },
      coupon: { findUnique: jest.fn(async ({ where }: any) => Object.values(coupons).find(c => where.id ? c.id === where.id : c.codeNormalized === where.codeNormalized)), update: jest.fn() },
      couponRedemption: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      stackedVoucherRedemption: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      collaboratorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      exclusiveDealProposal: { findMany: jest.fn().mockResolvedValue([{ id: 'deal-a', collaboratorId: 'kol', storeId: 'store', productId: 'a', approvedCommissionRate: 13 }]) },
      order: { create: jest.fn(async ({ data }: any) => ({ id: 'order', ...data })) },
    };
    const service: any = Object.create(OrdersService.prototype);
    const params: any = {
      dto: { storeId: 'store', items: [{ productId: 'a', quantity: 1 }, { productId: 'b', quantity: 1 }],
        couponCode: 'KOL50', paymentMethod: 'COD', policyAccepted: true, customerPhone: '0900000000' },
      store, dbProducts: [{ id: 'a', price: 250000 }, { id: 'b', price: 250000 }], variantMap: new Map(),
      rawSubtotalAmount: 500000, anyProductHasDirectDiscount: false,
      couponValidationResult: { couponId: 'shop', collaboratorId: 'kol', storeId: 'store', code: 'KOL50', discountType: 'FIXED_AMOUNT', discountValue: 50000, eligibleSubtotal: 250000 },
      customerName: 'Test', customerPhone: '0900000000', shippingAddress: 'Audit address', shippingQuote: { totalFee: 25000 },
      cleanIdempotencyKey: 'audit', currentPayloadHash: 'audit', jwtSecret: 'audit-secret',
    };
    return { coupons, tx, params, run: () => service.executeStoreOrderInTransaction(tx, params) };
  }

  it('applies a product-scoped coupon only to that product before its distinct commission rate', async () => {
    const { tx, run } = fixture();
    await run();
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.orderItems.create).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId: 'a', appliedCommissionRate: 13, calculatedCommissionAmount: 26000 }),
      expect.objectContaining({ productId: 'b', appliedCommissionRate: 10, calculatedCommissionAmount: 25000 }),
    ]));
    expect(Number(data.finalAmount)).toBe(475000);
  });

  it.each([undefined, null, -1, '25000', NaN])('rejects missing or invalid shipping before writing an order: %p', async (totalFee) => {
    const { params, tx, run } = fixture(); params.shippingQuote = { totalFee };
    await expect(run()).rejects.toThrow('cước GHN hợp lệ');
    expect(tx.order.create).not.toHaveBeenCalled(); expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('keeps a genuine zero quote and never adds the freight twice', async () => {
    const { params, tx, run } = fixture(); params.shippingQuote = { totalFee: 0 };
    await run();
    expect(Number(tx.order.create.mock.calls[0][0].data.finalAmount)).toBe(450000);
  });

  it('accepts goods + platform + shipping, caps freeship and leaves it out of commission GMV', async () => {
    const { params, tx, run } = fixture();
    params.dto.platformCouponCode = 'SAN20'; params.dto.shippingCouponCode = 'SHIP50';
    await run();
    const data = tx.order.create.mock.calls[0][0].data;
    expect(Number(data.finalAmount)).toBe(430000);
    expect(Number(data.couponDiscountAmount)).toBe(70000);
    expect(Number(data.discountAmount)).toBe(95000);
    const pricing = data.rawPayload.goodsPricing;
    expect(pricing.reduce((sum: number, row: any) => sum + row.netGoods, 0)).toBe(430000);
    expect(pricing[0].shopDiscount).toBe(50000);
    expect(pricing[1].shopDiscount).toBe(0);
    expect(tx.stackedVoucherRedemption.create).toHaveBeenCalledWith({ data: expect.objectContaining({ benefitType: 'SHIPPING', discountAmount: 25000 }) });
  });

  it('rejects placing a second Shop goods voucher in the platform slot even when legacy flags allow stacking', async () => {
    const { coupons, params, tx, run } = fixture();
    coupons.platform.fundingSource = 'SHOP_FUNDED'; coupons.platform.stackableWithShopVoucher = true;
    params.dto.platformCouponCode = 'SAN20';
    await expect(run()).rejects.toThrow('không áp dụng');
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects a shipping voucher in the primary goods slot inside the transaction', async () => {
    const { coupons, tx, run } = fixture(); coupons.shop.benefitType = 'SHIPPING';
    await expect(run()).rejects.toThrow('ô tiền hàng');
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('does not create an order when the locked voucher budget or quota is exhausted', async () => {
    const first = fixture(); first.coupons.platform.budgetUsed = 999999; first.params.dto.platformCouponCode = 'SAN20';
    await expect(first.run()).rejects.toThrow('ngân sách');
    expect(first.tx.order.create).not.toHaveBeenCalled();
    const second = fixture(); second.coupons.ship.usageCount = 20; second.params.dto.shippingCouponCode = 'SHIP50';
    await expect(second.run()).rejects.toThrow('lượt');
    expect(second.tx.order.create).not.toHaveBeenCalled();
  });

  it('allocates rounding remainders exactly without negative or over-discounted lines', () => {
    for (let count = 1; count <= 20; count++) {
      const bases = Array.from({ length: count }, (_, index) => (index + 1) * 11.11);
      const allocated = allocateDiscount(bases, 25.37);
      expect(Math.round(allocated.reduce((sum, value) => sum + value, 0) * 100)).toBe(Math.min(2537, Math.round(bases.reduce((sum, value) => sum + value, 0) * 100)));
      allocated.forEach((value, index) => { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(bases[index]); });
    }
    expect(priceVoucherLines([250000, 250000], [true, false], 50000, 0).map(row => row.netGoods)).toEqual([200000, 250000]);
  });

  it('denies an ended time window even while a delayed status update still says LIVE', () => {
    const now = new Date('2026-10-16T12:00:00Z');
    const live = { status: 'LIVE', inviteStatus: 'ACCEPTED', startsAt: new Date('2026-10-16T11:00:00Z'), endsAt: now };
    expect(liveVoucherActive(live, now)).toBe(false);
    expect(liveVoucherActive({ ...live, endsAt: new Date(now.getTime() + 1000) }, now)).toBe(true);
    expect(liveVoucherActive({ ...live, startsAt: new Date(now.getTime() + 1000), endsAt: new Date(now.getTime() + 2000) }, now)).toBe(false);
  });
});

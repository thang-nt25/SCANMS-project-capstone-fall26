import { BadRequestException, GoneException } from '@nestjs/common';
import {
  assertNoRetailVoucherSelection,
  isKolExclusiveCoupon,
} from '../kol-coupon.policy';
import { CouponsService } from '../coupons.service';

describe('KOL exclusive coupon policy', () => {
  it('requires a KOL owner, goods benefit and Shop-funded budget', () => {
    const valid = {
      collaborator: { role: 'COLLABORATOR' },
      benefitType: 'GOODS',
      fundingSource: 'SHOP_FUNDED',
    };
    expect(isKolExclusiveCoupon(valid)).toBe(true);
    for (const row of [
      undefined,
      null,
      { ...valid, collaborator: { role: 'SHOP_MANAGER' } },
      { ...valid, benefitType: 'SHIPPING' },
      { ...valid, fundingSource: 'PLATFORM_FUNDED' },
      { ...valid, fundingSource: 'CO_FUNDED' },
    ])
      expect(isKolExclusiveCoupon(row)).toBe(false);
  });
  it.each([
    'platformCouponCode',
    'shippingCouponCode',
    'platformCouponsByStore',
    'shippingCouponsByStore',
  ])('rejects legacy checkout field %s before creating orders', (field) => {
    expect(() =>
      assertNoRetailVoucherSelection({
        [field]: field.endsWith('ByStore') ? { shop: 'LEGACY10' } : 'LEGACY10',
      }),
    ).toThrow(BadRequestException);
  });
  it('accepts checkout with no retail voucher selection', () => {
    expect(() => assertNoRetailVoucherSelection({})).not.toThrow();
  });
  it('preserves only the explicitly approved new-customer shipping exception', () => {
    expect(() => assertNoRetailVoucherSelection({
      shippingCouponCode: 'SCANMSFREESHIP',
      shippingCouponsByStore: { shop: 'SCANMSFREESHIP' },
    })).not.toThrow();
    expect(() => assertNoRetailVoucherSelection({ platformCouponCode: 'SCANMSFREESHIP' })).toThrow();
  });
  it.each([0, 2, 3])('validates global freeship against the three-use limit: %s uses', async (used) => {
    const db = {
      coupon: { findUnique: jest.fn(async () => ({
        id: 'shipping', storeId: 'original-store', codeNormalized: 'SCANMSFREESHIP', displayCode: 'SCANMSFREESHIP',
        benefitType: 'SHIPPING', fundingSource: 'PLATFORM_FUNDED', scopeType: 'STORE_WIDE', status: 'ACTIVE',
        usageLimitTotal: null, usageLimitPerCustomer: 3, usageCount: used,
        discountType: 'PERCENTAGE', discountValue: 100, maximumDiscountAmount: 100000,
        minimumOrderAmount: 0, budgetTotal: null,
      })) },
      order: { count: jest.fn(async () => 0) },
      stackedVoucherRedemption: { count: jest.fn(async () => used) },
    };
    const service = new CouponsService(db as never);
    const attempt = service.previewStackedVoucher({ code: 'SCANMSFREESHIP', storeId: 'another-store',
      benefitType: 'SHIPPING', goodsSubtotal: 100000, shippingFee: 25000, shopDiscount: 0, customerPhone: '0903000001' });
    if (used < 3) await expect(attempt).resolves.toMatchObject({ code: 'SCANMSFREESHIP', discountAmount: 25000 });
    else await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
  });
  it('cannot reactivate a blocked legacy retail coupon through Admin oversight', async () => {
    const db = {
      coupon: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'retail',
          status: 'BLOCKED',
          fundingSource: 'SHOP_FUNDED',
          benefitType: 'GOODS',
          collaborator: { role: 'SHOP_MANAGER' },
        }),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const service = new CouponsService(db as never);
    await expect(
      service.adminUnblockCoupon('retail', 'admin'),
    ).rejects.toBeInstanceOf(GoneException);
    expect(db.coupon.updateMany).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });
  it('retires saving and generic issuance without accessing the database', async () => {
    const db = new Proxy(
      {},
      {
        get() {
          throw new Error('Unexpected database access');
        },
      },
    );
    const service = new CouponsService(db as never);
    await expect(
      service.saveCoupon('customer', 'coupon'),
    ).rejects.toBeInstanceOf(GoneException);
    await expect(
      service.createStoreCoupon(
        'shop',
        'owner',
        'SHOP_MANAGER' as never,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(GoneException);
    await expect(
      service.createPlatformCoupon('admin', {} as never),
    ).rejects.toBeInstanceOf(GoneException);
    await expect(service.getSavedAvailableCoupons('customer')).resolves.toEqual(
      [],
    );
  });
});

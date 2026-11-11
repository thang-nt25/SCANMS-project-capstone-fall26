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
  it('rejects any retail platform or shipping voucher selection', () => {
    expect(() => assertNoRetailVoucherSelection({ platformCouponCode: 'SCANMSFREESHIP' })).toThrow();
    expect(() => assertNoRetailVoucherSelection({ shippingCouponCode: 'SCANMSFREESHIP' })).toThrow();
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

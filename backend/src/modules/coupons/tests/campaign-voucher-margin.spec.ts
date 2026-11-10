import { ForbiddenException } from '@nestjs/common';
import { CouponsService } from '../coupons.service';

describe('Exclusive KOL coupon issuance', () => {
  function fixture(approved = false) {
    const prisma: any = {
      exclusiveDealProposal: { findFirst: jest.fn().mockResolvedValue(approved ? { id: 'deal-1' } : null) },
      coupon: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'coupon-1', displayCode: 'KOL16' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((callback: (client: any) => unknown) => callback(prisma)),
    };
    const service: any = new CouponsService(prisma, { del: jest.fn(), delPrefix: jest.fn() } as any);
    service.verifyStoreAccess = jest.fn();
    service.checkRateLimit = jest.fn();
    return { service, prisma };
  }

  it('rejects public and campaign vouchers from a Shop', async () => {
    const { service, prisma } = fixture();
    await expect(service.createStoreCoupon('shop', 'owner', 'SHOP_MANAGER', {
      code: 'PUBLIC20', discountType: 'PERCENTAGE', discountValue: 20,
      scopeType: 'CAMPAIGN', campaignId: 'campaign-1',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.coupon.create).not.toHaveBeenCalled();
  });

  it('requires an approved store-wide deal for the named KOL', async () => {
    const { service, prisma } = fixture();
    await expect(service.createStoreCoupon('shop', 'owner', 'SHOP_MANAGER', {
      code: 'KOL16', collaboratorId: 'kol-1', discountType: 'PERCENTAGE', discountValue: 5,
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.exclusiveDealProposal.findFirst).toHaveBeenCalledWith({
      where: { storeId: 'shop', collaboratorId: 'kol-1', status: 'APPROVED', scopeType: 'STORE_WIDE' },
      select: { id: true },
    });
    expect(prisma.coupon.create).not.toHaveBeenCalled();
  });

  it('issues only a KOL code after a store-wide deal is approved', async () => {
    const { service, prisma } = fixture(true);
    await service.createStoreCoupon('shop', 'owner', 'SHOP_MANAGER', {
      code: 'KOL16', collaboratorId: 'kol-1', discountType: 'PERCENTAGE', discountValue: 5,
    });
    expect(prisma.coupon.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ collaboratorId: 'kol-1', storeId: 'shop', benefitType: 'GOODS', scopeType: 'STORE_WIDE' }),
    }));
  });
});

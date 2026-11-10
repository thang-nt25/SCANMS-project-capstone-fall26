import { CouponsService } from '../coupons.service';

describe('Campaign voucher creation and immutable stacking policy', () => {
  function fixture() {
    const prisma: any = { coupon: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'voucher' }) },
      campaign: { findFirst: jest.fn().mockResolvedValue({ isActive: true, startDate: new Date(Date.now() - 10000), endDate: new Date(Date.now() + 86400000) }) },
      $transaction: jest.fn((callback: any) => callback(prisma)) };
    const service: any = new CouponsService(prisma, { del: jest.fn() } as any);
    service.verifyStoreAccess = jest.fn(); service.checkRateLimit = jest.fn();
    const dto: any = { code: 'MEGASALE20', scopeType: 'CAMPAIGN', campaignId: 'campaign',
      discountType: 'FIXED_AMOUNT', discountValue: 20000, minimumOrderAmount: 250000,
      stackableWithShopVoucher: true, stackableWithPlatformVoucher: false };
    return { service, prisma, dto, run: () => service.createStoreCoupon('shop', 'owner', 'SHOP_MANAGER', dto) };
  }

  it("generic Shop campaign issuance is retired without creating coupons", async () => {const {prisma,run}=fixture(); await expect(run()).rejects.toMatchObject({status:410});expect(prisma.coupon.create).not.toHaveBeenCalled();});

  it("retired retail issuance does not query or mutate any campaign", async () => {const {prisma,run}=fixture();await expect(run()).rejects.toMatchObject({status:410});expect(prisma.campaign.findFirst).not.toHaveBeenCalled();expect(prisma.coupon.create).not.toHaveBeenCalled();});
});

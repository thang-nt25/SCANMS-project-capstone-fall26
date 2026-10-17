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

  it('creates a campaign coupon for the selected Shop campaign and cannot re-enable Shop stacking', async () => {
    const { prisma, run } = fixture(); await run();
    expect(prisma.campaign.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'campaign', storeId: 'shop' } }));
    expect(prisma.coupon.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      campaignId: 'campaign', scopeType: 'CAMPAIGN', discountValue: expect.anything(),
      stackableWithShopVoucher: false, stackableWithPlatformVoucher: true,
    }) }));
  });

  it('rejects a missing campaign or a campaign belonging to another Shop before writing', async () => {
    const missing = fixture(); delete missing.dto.campaignId;
    await expect(missing.run()).rejects.toThrow('chọn chiến dịch');
    expect(missing.prisma.coupon.create).not.toHaveBeenCalled();
    const foreign = fixture(); foreign.prisma.campaign.findFirst.mockResolvedValue(null);
    await expect(foreign.run()).rejects.toThrow('hiệu lực');
    expect(foreign.prisma.coupon.create).not.toHaveBeenCalled();
  });
});

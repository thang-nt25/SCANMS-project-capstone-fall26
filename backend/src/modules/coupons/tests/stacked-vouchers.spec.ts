import { BadRequestException, ConflictException, ForbiddenException, GoneException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CouponsService } from '../coupons.service';

describe('Voucher slots and platform funding', () => {
  const storeId = '22222222-2222-4222-8222-222222222222';
  let prisma: any;
  let service: CouponsService;
  beforeEach(() => {
    prisma = {
      coupon: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'coupon-id' }) },
      couponRedemption: { findMany: jest.fn().mockResolvedValue([]) },
      stackedVoucherRedemption: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      platformVoucherReimbursement: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
      customerSavedCoupon: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findUnique: jest.fn() },
      $queryRaw: jest.fn(),
      store: { findFirst: jest.fn().mockResolvedValue({ id: storeId }), findUnique: jest.fn().mockResolvedValue({ id: storeId, ownerId: 'shop-owner' }) },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    service = new CouponsService(prisma, {} as any);
  });

  it("rejects retired shipping vouchers before any pricing or database lookup", async () => {await expect(service.previewStackedVoucher({code:'FREESHIP',benefitType:'SHIPPING',storeId,goodsSubtotal:100000,shippingFee:30000,shopDiscount:0} as any)).rejects.toBeInstanceOf(GoneException); expect(prisma.coupon.findUnique).not.toHaveBeenCalled();});

  it("rejects platform goods stacking regardless of a previously applied KOL coupon", async () => {await expect(service.previewStackedVoucher({code:'PLATFORM10',benefitType:'GOODS',storeId,goodsSubtotal:100000,shippingFee:30000,shopDiscount:10000} as any)).rejects.toBeInstanceOf(GoneException);});

  it("retired stacking never reserves a voucher budget", async () => {await expect(service.previewStackedVoucher({code:'PLATFORM10'} as any)).rejects.toBeInstanceOf(GoneException); expect(prisma.coupon.create).not.toHaveBeenCalled();});

  it("Admin cannot issue a new generic platform voucher", async () => {await expect(service.createPlatformCoupon('admin-id',{storeId,code:'PLATFORM10'} as any)).rejects.toBeInstanceOf(GoneException);expect(prisma.coupon.create).not.toHaveBeenCalled();});

  it('reconciles platform funding from both goods and shipping slots per Shop', async () => {
    const order = { storeId, externalOrderSn: 'SCANMS-1', store: { name: 'Shop A' } };
    prisma.couponRedemption.findMany.mockResolvedValue([{ orderId: 'order-1', platformFundedAmount: 10000, order }]);
    prisma.stackedVoucherRedemption.findMany.mockResolvedValue([{ orderId: 'order-1', platformFundedAmount: 25000, order }]);
    await expect(service.getPlatformSubsidies()).resolves.toEqual([{ storeId, storeName: 'Shop A', amount: 35000, paidAmount: 0, outstandingAmount: 35000, orderCount: 1, reimbursementReady: true, orders: [{ orderId: 'order-1', orderCode: 'SCANMS-1', amount: 35000, paidAmount: 0, outstandingAmount: 35000, payments: [] }] }]);
  });

  it('does not record a reimbursement above the remaining platform funding', async () => {
    prisma.order.findUnique.mockResolvedValue({ storeId, status: 'DELIVERED' });
    prisma.couponRedemption.findMany.mockResolvedValue([{ platformFundedAmount: new Prisma.Decimal(30000) }]);
    prisma.platformVoucherReimbursement.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(10000) } });
    await expect(service.recordPlatformReimbursement('admin-id', 'order-id', { amount: 25000, bankReference: 'BANK-123' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.platformVoucherReimbursement.create).not.toHaveBeenCalled();
  });

  it('records only the unpaid remainder and keeps a bank reference for audit', async () => {
    prisma.order.findUnique.mockResolvedValue({ storeId, status: 'COMPLETED' });
    prisma.couponRedemption.findMany.mockResolvedValue([{ platformFundedAmount: new Prisma.Decimal(30000) }]);
    prisma.stackedVoucherRedemption.findMany.mockResolvedValue([{ platformFundedAmount: new Prisma.Decimal(5000) }]);
    prisma.platformVoucherReimbursement.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(10000) } });
    await service.recordPlatformReimbursement('admin-id', 'order-id', { amount: 25000, bankReference: ' bank-123 ' });
    expect(prisma.platformVoucherReimbursement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order-id', storeId, amount: 25000, bankReference: 'BANK-123' }) });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'PLATFORM_VOUCHER_REIMBURSED' }) });
  });

  it("legacy saved voucher inventory is no longer returned", async () => {await expect(service.getSavedAvailableCoupons('customer-id')).resolves.toEqual([]);expect(prisma.customerSavedCoupon.findMany).not.toHaveBeenCalled();});

  it('does not expose a Shop reimbursement report to another Shop', async () => {
    await expect(service.getStorePlatformSubsidies(storeId, 'other-shop', 'SHOP_MANAGER' as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.couponRedemption.findMany).not.toHaveBeenCalled();
  });
});

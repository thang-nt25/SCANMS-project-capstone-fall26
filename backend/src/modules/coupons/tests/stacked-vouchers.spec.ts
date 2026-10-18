import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
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

  it('caps a shipping voucher at the GHN fee, never the goods subtotal', async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      storeId, benefitType: 'SHIPPING', scopeType: 'STORE_WIDE', status: 'ACTIVE',
      startsAt: null, expiresAt: null, deletedAt: null, usageLimitTotal: 10, usageCount: 0,
      discountType: 'FIXED_AMOUNT', discountValue: 50000, maximumDiscountAmount: null,
      budgetTotal: 100000, budgetUsed: 0, usageLimitPerCustomer: 1, displayCode: 'SHIP50',
    });
    await expect(service.previewStackedVoucher({ code: 'SHIP50', storeId, benefitType: 'SHIPPING', goodsSubtotal: 300000, shippingFee: 25000, shopDiscount: 0 })).resolves.toEqual({ code: 'SHIP50', benefitType: 'SHIPPING', discountAmount: 25000 });
  });

  it('computes platform goods discount on net goods after the Shop voucher', async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      storeId, benefitType: 'GOODS', scopeType: 'STORE_WIDE', status: 'ACTIVE',
      startsAt: null, expiresAt: null, deletedAt: null, fundingSource: 'PLATFORM_FUNDED',
      stackableWithShopVoucher: true, usageLimitTotal: 10, usageCount: 0,
      discountType: 'PERCENTAGE', discountValue: 10, maximumDiscountAmount: 30000,
      budgetTotal: 100000, budgetUsed: 0, usageLimitPerCustomer: 1,
      minimumOrderAmount: 200000, displayCode: 'SAN10',
    });
    await expect(service.previewStackedVoucher({ code: 'SAN10', storeId, benefitType: 'GOODS', goodsSubtotal: 300000, shippingFee: 25000, shopDiscount: 50000 })).resolves.toMatchObject({ discountAmount: 25000 });
  });

  it('refuses a voucher when its budget is exhausted', async () => {
    prisma.coupon.findUnique.mockResolvedValue({
      storeId, benefitType: 'SHIPPING', scopeType: 'STORE_WIDE', status: 'ACTIVE',
      startsAt: null, expiresAt: null, deletedAt: null, usageLimitTotal: 10, usageCount: 0,
      discountType: 'FIXED_AMOUNT', discountValue: 30000, maximumDiscountAmount: null,
      budgetTotal: 50000, budgetUsed: 40000, usageLimitPerCustomer: 1, displayCode: 'SHIP30',
    });
    await expect(service.previewStackedVoucher({ code: 'SHIP30', storeId, benefitType: 'SHIPPING', goodsSubtotal: 300000, shippingFee: 30000, shopDiscount: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('issues an Admin voucher with 100% platform funding and a hard budget', async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);
    await service.createPlatformCoupon('11111111-1111-4111-8111-111111111111', {
      storeId, code: 'SAN50', benefitType: 'GOODS', discountType: 'FIXED_AMOUNT',
      discountValue: 50000, budgetTotal: 500000, usageLimitTotal: 10,
    });
    expect(prisma.coupon.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fundingSource: 'PLATFORM_FUNDED', shopFundingRate: 0, platformFundingRate: 100, budgetTotal: 500000 }) }));
  });

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

  it('lists saved vouchers outside the first public page', async () => {
    prisma.customerSavedCoupon.findMany.mockResolvedValue([{ couponId: 'saved-101' }]);
    prisma.coupon.findMany = jest.fn().mockResolvedValue([{ id: 'saved-101', displayCode: 'SHOP101', discountType: 'FIXED_AMOUNT', discountValue: 10000, minimumOrderAmount: null, maximumDiscountAmount: null, usageLimitTotal: null, usageCount: 0, budgetTotal: null, budgetUsed: 0, expiresAt: null, scopeType: 'STORE_WIDE', fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS', campaign: null, liveSession: null, store: { id: storeId, name: 'Shop A', slug: 'shop-a' } }]);
    const result = await service.getSavedAvailableCoupons('customer-id');
    expect(result).toMatchObject([{ id: 'saved-101', code: 'SHOP101' }]);
    expect(prisma.coupon.findMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ['saved-101'] } } });
    expect(prisma.coupon.findMany.mock.calls[0][0]).not.toHaveProperty('take');
  });

  it('does not expose a Shop reimbursement report to another Shop', async () => {
    await expect(service.getStorePlatformSubsidies(storeId, 'other-shop', 'SHOP_MANAGER' as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.couponRedemption.findMany).not.toHaveBeenCalled();
  });
});

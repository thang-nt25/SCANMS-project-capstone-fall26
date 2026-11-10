import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('Customer cancellation settlement', () => {
  function fixture(paid = true) {
    const order = {
      id: 'order',
      customerId: 'buyer',
      status: 'PENDING',
      externalOrderSn: 'TEST',
      finalAmount: new Prisma.Decimal(100000),
      refundedAmount: new Prisma.Decimal(0),
      rawPayload: {
        paymentMethod: 'WALLET',
        paymentStatus: paid ? 'PAID' : 'UNPAID',
      },
      orderItems: [{ productId: 'product', quantity: 2 }],
      commissions: [],
      attributedCollaboratorId: null,
      paymentTransactions: paid ? [{ status: 'SUCCESS' }] : [],
    };
    const tx = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      order: {
        findUnique: jest.fn(async () => ({ ...order })),
        updateMany: jest.fn(async ({ data }) => {
          Object.assign(order, data);
          return { count: 1 };
        }),
        update: jest.fn(async ({ data }) => {
          order.refundedAmount = order.refundedAmount.add(
            data.refundedAmount.increment,
          );
        }),
      },
      productPromotionUsage: { findMany: jest.fn(async () => []) },
      couponRedemption: { findUnique: jest.fn(async () => null) },
      stackedVoucherRedemption: { findMany: jest.fn(async () => []) },
      auditLog: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const walletsService = { refundToWallet: jest.fn() };
    const service = Object.assign(Object.create(OrdersService.prototype), {
      prisma: { $transaction: async (callback) => callback(tx) },
      walletsService,
      checkoutMetrics: { recordCancellation: jest.fn() },
    }) as OrdersService;
    return { service, tx, order, walletsService };
  }
  it('refunds a paid cancellation and restores stock only once on replay', async () => {
    const f = fixture();
    await f.service.cancelCustomerOrder('order', 'buyer');
    await f.service.cancelCustomerOrder('order', 'buyer');
    expect(f.walletsService.refundToWallet).toHaveBeenCalledTimes(1);
    expect(f.walletsService.refundToWallet).toHaveBeenCalledWith(
      f.tx,
      'buyer',
      new Prisma.Decimal(100000),
      'order',
    );
    expect(f.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(f.tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          overrideReason: 'Khách hàng yêu cầu hủy đơn',
        }),
      }),
    );
  });
  it('does not refund unpaid orders', async () => {
    const f = fixture(false);
    await f.service.cancelCustomerOrder('order', 'buyer');
    expect(f.walletsService.refundToWallet).not.toHaveBeenCalled();
  });
  it('locks products in checkout order before locking the wallet for a refund', async () => {
    const f = fixture();
    f.order.orderItems = [
      { productId: 'z-product', quantity: 1 },
      { productId: 'a-product', quantity: 1 },
      { productId: 'z-product', quantity: 1 },
    ];
    await f.service.cancelCustomerOrder('order', 'buyer');
    const locks = f.tx.$queryRaw.mock.calls.filter(
      (call) => String(call[0]).includes('FROM products'),
    );
    expect(locks.map((call) => call[1])).toEqual(['a-product', 'z-product']);
    const productLock = f.tx.$queryRaw.mock.calls.findIndex((call) =>
      String(call[0]).includes('FROM products'),
    );
    expect(productLock).toBeGreaterThanOrEqual(0);
    expect(f.tx.$queryRaw.mock.invocationCallOrder[productLock]).toBeLessThan(
      f.walletsService.refundToWallet.mock.invocationCallOrder[0],
    );
    expect(f.tx.$queryRaw.mock.invocationCallOrder.at(-1)).toBeLessThan(
      f.walletsService.refundToWallet.mock.invocationCallOrder[0],
    );
  });
  it('restores a used coupon and its budget only once', async () => {
    const f = fixture(false);
    const redemption = Object.assign(f.tx.couponRedemption, {
      findUnique: jest.fn(async () => ({
        id: 'redemption',
        couponId: 'coupon',
        status: 'USED',
        discountAmount: new Prisma.Decimal(5000),
      })),
      update: jest.fn(),
    });
    const tx = Object.assign(f.tx, { coupon: { update: jest.fn() } });
    await f.service.cancelCustomerOrder('order', 'buyer');
    await f.service.cancelCustomerOrder('order', 'buyer');
    expect(redemption.update).toHaveBeenCalledWith({
      where: { id: 'redemption' },
      data: { status: 'CANCELLED' },
    });
    expect(tx.coupon.update).toHaveBeenCalledTimes(1);
    expect(tx.coupon.update).toHaveBeenCalledWith({
      where: { id: 'coupon' },
      data: {
        usageCount: { decrement: 1 },
        budgetUsed: { decrement: new Prisma.Decimal(5000) },
      },
    });
  });
  it('checks ownership before an idempotent reply or any mutation', async () => {
    const f = fixture();
    await expect(
      f.service.cancelCustomerOrder('order', 'stranger'),
    ).rejects.toMatchObject({ status: 403 });
    expect(f.tx.order.updateMany).not.toHaveBeenCalled();
  });
  it('rejects orders already handed to shipping', async () => {
    const f = fixture();
    f.order.status = 'SHIPPING';
    await expect(
      f.service.cancelCustomerOrder('order', 'buyer'),
    ).rejects.toMatchObject({ status: 400 });
  });
});

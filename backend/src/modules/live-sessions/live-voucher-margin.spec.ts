import { Prisma } from '@prisma/client';
import { LiveSessionsService } from './live-sessions.service';

describe('Live voucher expiry preserves other discounts', () => {
  function fixture() {
    const order: any = {
      id: 'order', couponId: 'live-coupon', status: 'PENDING', externalOrderSn: 'AUDIT',
      subtotalAmount: 250000, shippingFee: 25000, couponDiscountAmount: 35000, discountAmount: 60000, finalAmount: 215000,
      rawPayload: { paymentMethod: 'COD', paymentStatus: 'UNPAID', campaignBonusReservations: {} },
      couponRedemption: { id: 'live-use', couponId: 'live-coupon', status: 'USED', discountAmount: 15000 },
      stackedVoucherRedemptions: [
        { benefitType: 'GOODS', status: 'USED', discountAmount: 20000 },
        { benefitType: 'SHIPPING', status: 'USED', discountAmount: 25000 },
      ],
      orderItems: [{ id: 'line', productId: 'a', quantity: 1, unitPrice: new Prisma.Decimal(250000),
        appliedCommissionRate: 15, regularCommissionRate: 12, regularCommissionAmount: 25800 }],
      commissions: [],
    };
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn().mockResolvedValue(1),
      order: { findUnique: jest.fn(async () => order), update: jest.fn(async ({ data }: any) => Object.assign(order, data)) },
      couponRedemption: { update: jest.fn() }, coupon: { update: jest.fn() },
      orderItem: { update: jest.fn() }, auditLog: { create: jest.fn() } };
    const prisma = {
      liveShoppingSession: { findUnique: jest.fn().mockResolvedValue({ id: 'live', title: 'Audit', status: 'ENDED', commissionRate: 3, coupon: { id: 'live-coupon' } }) },
      order: { findMany: jest.fn().mockResolvedValue([{ id: 'order', rawPayload: order.rawPayload }]) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const service: any = new LiveSessionsService(prisma as any, {} as any, {} as any);
    return { order, tx, prisma, run: () => service.repriceUnpaidOrders('live') };
  }

  it('removes only the Live goods discount, retains platform/ship and recalculates net goods commission', async () => {
    const { order, tx, run } = fixture();
    await run();
    expect(Number(order.finalAmount)).toBe(230000);
    expect(Number(order.couponDiscountAmount)).toBe(20000);
    expect(Number(order.discountAmount)).toBe(45000);
    expect(order.couponId).toBeNull();
    const amount = tx.orderItem.update.mock.calls[0][0].data.calculatedCommissionAmount;
    expect(Number(amount)).toBe(27600);
    await run();
    expect(tx.order.update).toHaveBeenCalledTimes(1);
    expect(tx.couponRedemption.update).toHaveBeenCalledTimes(1);
  });

  it('never changes a paid order or an order past pending', async () => {
    const paid = fixture(); paid.order.rawPayload.paymentStatus = 'PAID';
    await paid.run(); expect(paid.tx.order.update).not.toHaveBeenCalled();
    const shipped = fixture(); shipped.order.status = 'SHIPPING';
    await shipped.run(); expect(shipped.tx.order.update).not.toHaveBeenCalled();
  });

  it('reserves any higher Campaign bonus atomically before repricing, and aborts when budget is insufficient', async () => {
    const { order, tx, run } = fixture();
    order.rawPayload.campaignBonusReservations = { campaign: 4300 };
    tx.$executeRaw.mockResolvedValue(0);
    await expect(run()).rejects.toThrow('ngân sách');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.couponRedemption.update).not.toHaveBeenCalled();
    tx.$executeRaw.mockResolvedValue(1);
    await run();
    expect(tx.$executeRaw).toHaveBeenLastCalledWith(expect.anything(), 300, 'campaign', 300);
    expect(order.rawPayload.campaignBonusReservations.campaign).toBe(4600);
  });
});

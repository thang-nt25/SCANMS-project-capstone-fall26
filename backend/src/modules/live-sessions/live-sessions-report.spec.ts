import { LiveSessionsService } from './live-sessions.service';

describe('Livestream purchase report', () => {
  const sessionId = 'live-session';
  let prisma: any;
  let service: any;
  beforeEach(() => {
    prisma = {
      liveShoppingSession: { findUnique: jest.fn().mockResolvedValue({ creatorId: 'kol', coupon: { id: 'coupon', usageLimitTotal: 10, usageCount: 2 }, _count: { claims: 3 } }) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      commission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new LiveSessionsService(prisma, {} as any, {} as any);
  });
  const order = (id: string, extra = {}) => ({ id, status: 'PENDING', customerId: 'buyer', customerPhone: '0900000000', finalAmount: 420000, couponDiscountAmount: 0, rawPayload: { paymentMethod: 'COD', paymentStatus: 'UNPAID' }, ...extra });

  it('counts a COD purchase without a voucher as pending, not settled revenue', async () => {
    prisma.order.findMany.mockResolvedValue([order('one')]);
    expect(await service.getReportData(sessionId)).toMatchObject({ buyers: 1, orders: 1, pendingOrders: 1, grossSales: 0, commission: 0 });
    expect(prisma.order.findMany.mock.calls[0][0].where.OR).toContainEqual({ rawPayload: { path: ['liveSessionIds'], array_contains: [sessionId] } });
  });
  it('deduplicates buyers and excludes cancelled purchases', async () => {
    prisma.order.findMany.mockResolvedValue([order('one'), order('two'), order('cancel', { customerId: 'other', status: 'CANCELLED' })]);
    expect(await service.getReportData(sessionId)).toMatchObject({ buyers: 1, orders: 2, pendingOrders: 2, cancelledOrders: 1 });
  });
  it('only sums paid or delivered COD orders and their KOL commissions', async () => {
    prisma.order.findMany.mockResolvedValue([order('unpaid'), order('paid', { rawPayload: { paymentMethod: 'PAYOS', paymentStatus: 'PAID' }, finalAmount: 357000 }), order('delivered', { status: 'DELIVERED' })]);
    prisma.commission.findMany.mockResolvedValue([{ commissionAmount: 107100 }]);
    expect(await service.getReportData(sessionId)).toMatchObject({ orders: 3, pendingOrders: 1, grossSales: 777000, commission: 107100 });
    expect(prisma.commission.findMany.mock.calls[0][0].where.orderId.in).toEqual(['paid', 'delivered']);
  });
  it('keeps source purchases visible even when the session has no coupon', async () => {
    prisma.liveShoppingSession.findUnique.mockResolvedValue({ creatorId: 'kol', coupon: null, _count: { claims: 0 } });
    prisma.order.findMany.mockResolvedValue([order('one')]);
    expect(await service.getReportData(sessionId)).toMatchObject({ buyers: 1, orders: 1, usedUses: 0, remainingUses: null });
  });
});

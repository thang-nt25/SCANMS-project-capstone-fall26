import { Prisma, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';

function fixture(shipments: unknown[] = [], hasReturn = true) {
  const order = {
    id: 'order-1',
    externalOrderSn: 'DH-2026-99BEC6C5',
    status: 'RETURN_REQUESTED',
    rawPayload: { trackingNumber: 'LYG6D7', carrierName: 'GHN' },
    finalAmount: new Prisma.Decimal(271001),
    refundedAmount: new Prisma.Decimal(0),
    subtotalAmount: new Prisma.Decimal(250000),
    discountAmount: new Prisma.Decimal(0),
    shippingFee: new Prisma.Decimal(21001),
    orderItems: [],
    commissions: [],
    returnRequests: hasReturn
      ? [{ id: 'case-1', status: 'EXCHANGE_SHIPPED', shipments }]
      : [],
  };
  const prisma = {
    store: { findFirst: jest.fn().mockResolvedValue({ id: 'store-1' }) },
    order: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([order]),
    },
  };
  const service = Object.assign(Object.create(OrdersService.prototype), {
    prisma,
    cacheService: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
  }) as OrdersService;
  return { service, prisma };
}

describe('merchant order list exposes the replacement waybill separately', () => {
  it('counts pending return work across pages and shares that condition with the pending tab', async () => {
    const { service, prisma } = fixture();
    prisma.order.count.mockReset()
      .mockResolvedValueOnce(2).mockResolvedValueOnce(40)
      .mockResolvedValueOnce(2).mockResolvedValueOnce(10).mockResolvedValueOnce(28);
    const result = await service.getMyStoreOrders('shop-1', UserRole.SHOP_MANAGER,
      { storeId: 'store-1', status: 'PENDING', page: 2, limit: 1 });
    expect(result.metrics).toEqual({ total: 40, pending: 2, shipping: 10, delivered: 28 });
    const pendingCondition = prisma.order.count.mock.calls[2][0].where.AND[1];
    expect(pendingCondition.OR).toContainEqual(expect.objectContaining({
      returnRequests: { some: { status: { in: expect.arrayContaining(['REQUESTED']) } } },
    }));
    expect(prisma.order.findMany.mock.calls.at(-1)[0].where.AND).toEqual([pendingCondition]);
    expect(prisma.order.count.mock.calls[1][0].where).toEqual({ storeId: 'store-1' });
  });

  it('counts shop return work across pages and uses the same predicate for the pending tab', async () => {
    const { service, prisma } = fixture();
    prisma.order.count.mockImplementation(async ({ where }: any) => {
      if (where.AND?.[1]?.OR) return 2;
      if (where.status === 'SHIPPING') return 3;
      if (where.status?.in) return 8;
      return 20;
    });
    const result = await service.getMyStoreOrders('shop-1', UserRole.SHOP_MANAGER,
      { storeId: 'store-1', status: 'PENDING', page: 2, limit: 1 });
    expect(result.metrics).toEqual({ total: 20, pending: 2, shipping: 3, delivered: 8 });
    const listWhere = prisma.order.findMany.mock.calls.at(-1)?.[0].where;
    const pendingWhere = prisma.order.count.mock.calls.find(([args]: any) => args.where.AND?.[1]?.OR)?.[0].where;
    expect(listWhere.AND[0]).toEqual(pendingWhere.AND[1]);
    expect(listWhere.AND[0].OR).toContainEqual({
      status: { in: ['RETURN_REQUESTED', 'DISPUTED'] }, returnRequests: { some: { status: { in: ['REQUESTED', 'RETURN_RECEIVED', 'INSPECTING', 'EXCHANGE_PENDING'] } } },
    });
    expect(pendingWhere.AND[0]).toEqual({ storeId: 'store-1' });
  });
  it('bypasses stale store cache when a mutation requests a fresh list', async () => {
    const { service } = fixture([], false);
    const cache = (service as any).cacheService;
    cache.get.mockResolvedValue({ items: [{ status: 'PENDING' }] });
    const result = await service.getMyStoreOrders('shop-1', UserRole.SHOP_MANAGER, { storeId: 'store-1' }, true);
    expect(cache.get).not.toHaveBeenCalled();
    expect(result.items[0].trackingNumber).toBe('LYG6D7');
    expect(cache.set).toHaveBeenCalled();
  });

  it('returns the new replacement code without overwriting the original outbound code', async () => {
    const replacement = {
      id: 'shipment-1',
      trackingNumber: 'SIMX12345',
      carrierName: 'SCANMS Demo',
      provider: 'MOCK',
      providerStatus: 'ready_to_pick',
    };
    const { service, prisma } = fixture([replacement]);
    const result = await service.getMyStoreOrders(
      'shop-1',
      UserRole.SHOP_MANAGER,
      { storeId: 'store-1' },
    );
    expect(result.items[0].trackingNumber).toBe('LYG6D7');
    expect(result.items[0].returnRequest).toMatchObject({
      exchangeShipment: replacement,
    });
    expect(result.items[0].returnRequest).not.toHaveProperty('shipments');
    expect(prisma.order.findMany.mock.calls.at(-1)?.[0]).toMatchObject({
      include: {
        returnRequests: {
          include: { shipments: { where: { direction: 'SHOP_TO_CUSTOMER' } } },
        },
      },
    });
  });

  it.each(['booking', 'booking_retry'])(
    'does not publish the temporary reservation code at status %s',
    async (providerStatus) => {
      const { service } = fixture([
        { trackingNumber: 'SC-X-private-reservation', providerStatus },
      ]);
      const result = await service.getMyStoreOrders(
        'shop-1',
        UserRole.SHOP_MANAGER,
        { storeId: 'store-1' },
      );
      expect(result.items[0].returnRequest).toMatchObject({
        exchangeShipment: null,
      });
      expect(result.items[0].trackingNumber).toBe('LYG6D7');
    },
  );

  it('also exposes a replacement waybill that Shop registered manually', async () => {
    const { service } = fixture([
      { trackingNumber: 'GHN-EXTERNAL', providerStatus: null, provider: null },
    ]);
    const result = await service.getMyStoreOrders(
      'shop-1',
      UserRole.SHOP_MANAGER,
      { storeId: 'store-1' },
    );
    expect(result.items[0].returnRequest).toMatchObject({
      exchangeShipment: { trackingNumber: 'GHN-EXTERNAL' },
    });
  });

  it('keeps the ordinary order response when no return case exists', async () => {
    const { service } = fixture([], false);
    const result = await service.getMyStoreOrders(
      'shop-1',
      UserRole.SHOP_MANAGER,
      { storeId: 'store-1' },
    );
    expect(result.items[0].returnRequest).toBeNull();
    expect(result.items[0].trackingNumber).toBe('LYG6D7');
  });
});

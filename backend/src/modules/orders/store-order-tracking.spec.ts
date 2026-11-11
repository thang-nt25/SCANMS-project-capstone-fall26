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

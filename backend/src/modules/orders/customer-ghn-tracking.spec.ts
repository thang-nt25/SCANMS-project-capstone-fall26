import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('public customer GHN tracking data', () => {
  it('returns the saved GHN environment with the order tracking code', async () => {
    const order = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-TEST01',
      status: OrderStatus.SHIPPING,
      rawPayload: {
        ghnOrderCode: 'L8RBUE',
        trackingNumber: 'L8RBUE',
        ghnEnvironment: 'TEST',
      },
      customerName: 'Khách kiểm thử',
      customerPhone: '0912345678',
      shippingAddress: 'Địa chỉ kiểm thử',
      subtotalAmount: 200000,
      discountAmount: 0,
      finalAmount: 229000,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      store: { id: 'store-1', name: 'Shop kiểm thử', slug: 'shop-test' },
      attributedCollaborator: null,
      orderItems: [],
      productReviews: [],
    };
    const prisma = { order: { findMany: jest.fn().mockResolvedValue([order]) } };
    const configService = {
      get: (key: string) => key === 'JWT_SECRET' ? 'test-only-jwt-secret' : 900,
    };
    const service = Object.assign(Object.create(OrdersService.prototype), { prisma, configService }) as OrdersService;

    const result = await service.trackOrderByPhoneOrSn({ phone: '0912345678', orderSn: order.externalOrderSn });

    expect(result.orders[0]).toMatchObject({
      trackingNumber: 'L8RBUE',
      carrierName: 'GHN',
      ghnEnvironment: 'TEST',
    });
  });
});

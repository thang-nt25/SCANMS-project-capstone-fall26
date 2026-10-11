import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('customer order status notifications', () => {
  it('notifies once when the shop confirms/ships and when it marks delivery complete', async () => {
    let status = OrderStatus.PENDING;
    const order = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
      store: { ownerId: 'shop-1' },
      commissions: [],
      rawPayload: {},
      deliveredAt: null,
      completedAt: null,
    };
    const notificationCreate = jest.fn();
    const tx = {
      order: {
        updateMany: jest.fn(async ({ data }: any) => {
          status = data.status;
          return { count: 1 };
        }),
        findUniqueOrThrow: jest.fn(async () => ({ ...order, status })),
      },
      notification: { create: notificationCreate },
    };
    const prisma = {
      order: { findUnique: jest.fn(async () => ({ ...order, status })) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = Object.assign(Object.create(OrdersService.prototype), { prisma }) as OrdersService;

    await service.updateOrderFulfillment('order-1', 'shop-1', 'SHOP_MANAGER', {
      status: OrderStatus.SHIPPING,
      trackingNumber: 'GHN123',
      carrierName: 'GHN Express',
    });
    await service.updateOrderFulfillment('order-1', 'shop-1', 'SHOP_MANAGER', {
      status: OrderStatus.DELIVERED,
    });

    expect(notificationCreate).toHaveBeenCalledTimes(2);
    expect(notificationCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: 'ORDER_SHIPPED',
        title: 'Shop đã xác nhận và bàn giao đơn',
      }),
    });
    expect(notificationCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        type: 'ORDER_DELIVERED',
        title: 'Đơn hàng đã giao thành công',
      }),
    });
  });
});

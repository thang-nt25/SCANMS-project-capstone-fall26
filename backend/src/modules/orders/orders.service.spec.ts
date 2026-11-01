import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('customer order status notifications', () => {
  it('blocks checkout when the shipping dependency is unavailable instead of defaulting to zero', async () => {
    const service = Object.create(OrdersService.prototype) as any;
    await expect(service.quoteCheckoutShipping('Address', 1, 200000, 'store')).rejects.toThrow('Dịch vụ tính cước GHN chưa sẵn sàng');
  });
  it('rejects locally generated test codes as real GHN shipments', async () => {
    const order = {
      id: 'order-test',
      externalOrderSn: 'DH-TEST',
      customerId: 'customer-1',
      store: { ownerId: 'shop-1' },
      commissions: [],
      rawPayload: { shopConfirmedAt: new Date().toISOString() },
      status: OrderStatus.PENDING,
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn(),
    };
    const service = Object.assign(Object.create(OrdersService.prototype), { prisma }) as OrdersService;

    await expect(service.updateOrderFulfillment('order-test', 'shop-1', 'SHOP_MANAGER', {
      status: OrderStatus.SHIPPING,
      trackingNumber: 'TEST-GHN-0ABFBVQ3K',
      carrierName: 'GHN',
    })).rejects.toThrow('Mã thử nội bộ không phải vận đơn GHN');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('notifies once when the shop confirms/ships and when it marks delivery complete', async () => {
    let status = OrderStatus.PENDING;
    const order = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
      store: { ownerId: 'shop-1' },
      commissions: [],
      rawPayload: { shopConfirmedAt: new Date().toISOString() },
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

import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { GhnService } from './ghn.service';

describe('GHN customer order notifications', () => {
  it('notifies once when repeated delivery webhooks arrive', async () => {
    let status = OrderStatus.SHIPPING;
    const order = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
    };
    const notificationCreate = jest.fn();
    const tx = {
      order: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.status !== status) return { count: 0 };
          status = data.status;
          return { count: 1 };
        }),
      },
      notification: { create: notificationCreate },
    };
    const prisma = {
      order: { findFirst: jest.fn(async () => ({ ...order, status })) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);

    await service.handleGhnWebhook({ OrderCode: 'GHN123', Status: 'delivered' });
    await service.handleGhnWebhook({ OrderCode: 'GHN123', Status: 'delivered' });

    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer-1',
        type: 'ORDER_DELIVERED',
      }),
    });
  });
});

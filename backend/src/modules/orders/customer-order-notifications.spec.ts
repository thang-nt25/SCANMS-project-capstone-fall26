import { notifyCustomerOrderEvent } from './customer-order-notifications';

describe('customer order notifications', () => {
  const order = {
    id: 'order-1',
    externalOrderSn: 'DH-2026-ABC123',
    customerId: 'customer-1',
  };

  it('creates a customer-facing shipment update with an order deep link', async () => {
    const create = jest.fn();
    const tx = { notification: { create } } as any;

    await notifyCustomerOrderEvent(tx, order, 'ORDER_SHIPPED', {
      carrierName: 'GHN Express',
      trackingNumber: 'GHN123',
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer-1',
        title: 'Shop đã xác nhận và bàn giao đơn',
        type: 'ORDER_SHIPPED',
        data: expect.objectContaining({
          orderId: 'order-1',
          externalOrderSn: 'DH-2026-ABC123',
          actionUrl: '/customer/orders',
          trackingNumber: 'GHN123',
        }),
      }),
    });
  });

  it('does not create customer notifications for guest orders', async () => {
    const create = jest.fn();
    const tx = { notification: { create } } as any;

    await notifyCustomerOrderEvent(tx, { ...order, customerId: null }, 'ORDER_CREATED');

    expect(create).not.toHaveBeenCalled();
  });
});

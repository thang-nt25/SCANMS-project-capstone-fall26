import { OrdersController } from './orders.controller';
import { confirmationEmailState, combinedConfirmationEmailState, orderConfirmationEmailInput, type OrderConfirmationSnapshot } from './order-confirmation-email';

const order: OrderConfirmationSnapshot = {
  externalOrderSn: 'DH-TEST', createdAt: new Date('2026-10-18T00:00:00Z'), subtotalAmount: '400000', shippingFee: '29001', discountAmount: '15000', finalAmount: '414001',
  rawPayload: { paymentMethod: 'WALLET', paymentStatus: 'PAID' }, store: { name: 'Cocoon' },
  orderItems: [{ quantity: 2, unitPrice: '200000', product: { title: 'Serum B5', sku: 'B5' }, variant: { name: '30 ml', sku: 'B5-30' } }],
};
const recipient = { email: 'customer@example.test', customerName: 'Tuấn Đình', customerPhone: '0901234567', shippingAddress: 'Thủ Đức' };

describe('Post-commit order confirmation delivery', () => {
  it('automatically uses each authenticated buyer email when checkout email is empty', async () => {
    const ordersService = { checkCreateOrderRateLimit: jest.fn(), createOrder: jest.fn().mockResolvedValue({}) };
    const controller = Object.assign(Object.create(OrdersController.prototype), { ordersService });
    const request = { ip: '127.0.0.1', get: () => 'Fixture browser' };
    for (const email of ['buyer-a@gmail.com', 'buyer-b@gmail.com']) {
      await controller.createOrder({ customerPhone: '0901234567', customerEmail: ' ', customerId: 'untrusted-browser-id' }, request, email.split('@')[0], email);
      expect(ordersService.createOrder).toHaveBeenLastCalledWith(expect.objectContaining({ customerEmail: email, customerId: email.split('@')[0] }), expect.any(Object));
    }
    await controller.createOrder({ customerPhone: '0901234567', customerEmail: ' RECEIPT@GMAIL.COM ' }, request, 'buyer-c', 'buyer-c@gmail.com');
    expect(ordersService.createOrder).toHaveBeenLastCalledWith(expect.objectContaining({ customerEmail: 'receipt@gmail.com', customerId: 'buyer-c' }), expect.any(Object));
  });
  it('uses actual committed amounts, variant and items of the correct shop', () => {
    expect(orderConfirmationEmailInput(order, recipient)).toMatchObject({ ...recipient, finalAmount: 414001, shippingFee: 29001, subtotalAmount: 400000, discountAmount: 15000,
      storeName: 'Cocoon', items: [{ title: 'Serum B5', variantName: '30 ml', sku: 'B5-30', quantity: 2, unitPrice: 200000 }] });
    const second = { ...order, externalOrderSn: 'DH-SECOND', store: { name: 'Another shop' }, orderItems: [{ quantity: 1, unitPrice: 100000, product: { title: 'Cleanser' } }] };
    expect(orderConfirmationEmailInput(second, recipient).items).toEqual([{ title: 'Cleanser', quantity: 1, unitPrice: 100000 }]);
  });

  it('reports durable delivery state accurately on replay without sending again', () => {
    expect(confirmationEmailState({ confirmationEmailStatus: 'QUEUED' }, recipient.email)).toEqual({ confirmationEmailStatus: 'QUEUED', confirmationEmailQueued: true });
    expect(confirmationEmailState({ confirmationEmailStatus: 'SENT' }, recipient.email)).toEqual({ confirmationEmailStatus: 'SENT', confirmationEmailQueued: false });
    expect(confirmationEmailState({}, recipient.email).confirmationEmailStatus).toBe('UNKNOWN');
    expect(confirmationEmailState({}, null).confirmationEmailStatus).toBe('NOT_REQUESTED');
    expect(combinedConfirmationEmailState([
      confirmationEmailState({ confirmationEmailStatus: 'SENT' }),
      confirmationEmailState({ confirmationEmailStatus: 'SENDING' }),
    ])).toEqual({ confirmationEmailStatus: 'QUEUED', confirmationEmailQueued: true });
    expect(combinedConfirmationEmailState([
      confirmationEmailState({ confirmationEmailStatus: 'SENT' }),
      confirmationEmailState({ confirmationEmailStatus: 'FAILED' }),
    ]).confirmationEmailStatus).toBe('PARTIAL');
  });
});

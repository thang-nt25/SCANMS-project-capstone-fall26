import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { orderConfirmationEmailInput, type OrderConfirmationSnapshot } from './order-confirmation-email';

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

  function service(mail?: unknown) { return new OrdersService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, mail as any); }

  it('waits for SMTP before returning SENT, and failures do not throw after order commit', async () => {
    let resolve!: (value: boolean) => void;
    const mail = { sendOrderConfirmation: jest.fn(() => new Promise<boolean>(done => { resolve = done; })) };
    let finished = false;
    const delivery = (service(mail) as any).sendConfirmationEmail(order, recipient).then((result: string) => { finished = true; return result; });
    await Promise.resolve();
    expect(finished).toBe(false);
    resolve(true);
    expect(await delivery).toBe('SENT');
    expect(await (service({ sendOrderConfirmation: jest.fn().mockRejectedValue(new Error('SMTP')) }) as any).sendConfirmationEmail(order, recipient)).toBe('FAILED');
    expect(await (service({ sendOrderConfirmation: jest.fn().mockResolvedValue(false) }) as any).sendConfirmationEmail(order, recipient)).toBe('FAILED');
  });

  it('reports missing mail configuration and skips orders without an email', async () => {
    expect(await (service() as any).sendConfirmationEmail(order, recipient)).toBe('FAILED');
    const mail = { sendOrderConfirmation: jest.fn() };
    expect(await (service(mail) as any).sendConfirmationEmail(order, { ...recipient, email: null })).toBe('NOT_REQUESTED');
    expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
  });
});

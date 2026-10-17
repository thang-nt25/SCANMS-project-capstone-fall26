import { CheckoutController } from './checkout.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('Checkout alias uses the full margin-protected order flow', () => {
  it('requires login and forwards vouchers to the canonical service with authenticated customer identity', async () => {
    expect(Reflect.getMetadata('__guards__', CheckoutController.prototype.checkout)).toContain(JwtAuthGuard);
    const orders: any = { checkCreateOrderRateLimit: jest.fn(), createOrder: jest.fn().mockResolvedValue({ id: 'order' }) };
    const payos: any = { assertReady: jest.fn() };
    const controller = new CheckoutController(orders, payos);
    const dto: any = { customerId: 'spoofed', customerPhone: '0900000000', couponCode: 'KOL5', platformCouponCode: 'SAN20',
      shippingCouponCode: 'SHIP25', paymentMethod: 'PAYOS', policyAccepted: true, idempotencyKey: 'once' };
    const req: any = { cookies: { scanms_attr: 'signed-cookie' }, headers: {}, ip: '127.0.0.1', get: () => 'audit' };
    await controller.checkout(dto, req, 'real-customer');
    expect(payos.assertReady).toHaveBeenCalled();
    expect(orders.createOrder).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'real-customer', couponCode: 'KOL5',
      platformCouponCode: 'SAN20', shippingCouponCode: 'SHIP25' }), expect.objectContaining({ cookieAttr: 'signed-cookie' }));
  });
});

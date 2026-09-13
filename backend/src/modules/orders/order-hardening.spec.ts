import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizeCustomerPhone } from './order-input.utils';
import {
  createReviewToken,
  verifyReviewToken,
  verifyWebhookSecret,
} from './order-security.utils';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { ShopifyOrderNormalizer } from './normalizers/shopify-order.normalizer';

describe('Order QA hardening', () => {
  const config = new ConfigService({
    JWT_SECRET: 'qa-local-only',
    ORDER_WEBHOOK_SECRETS: JSON.stringify({
      'shop:shopify': 'qa-webhook-secret-at-least-32-characters',
    }),
  });
  it('canonicalizes VN phones and rejects substring/non-phone searches', () => {
    expect(normalizeCustomerPhone('+84 902-233-445')).toBe('0902233445');
    for (const value of ['0', 'abc', '090223344'])
      expect(() => normalizeCustomerPhone(value)).toThrow();
  });
  it('binds review tokens to order, purpose, expiry and signature', () => {
    const token = createReviewToken(config, 'order');
    expect(() => verifyReviewToken(config, 'order', token)).not.toThrow();
    expect(() => verifyReviewToken(config, 'other', token)).toThrow();
    expect(() =>
      verifyReviewToken(config, 'order', token + 'tampered'),
    ).toThrow();
    const now = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 16 * 60000);
    expect(() => verifyReviewToken(config, 'order', token)).toThrow();
    now.mockRestore();
  });
  it('fails closed on missing, wrong or wrong-store webhook secret', () => {
    expect(() =>
      verifyWebhookSecret(
        config,
        'shop',
        'shopify',
        'qa-webhook-secret-at-least-32-characters',
      ),
    ).not.toThrow();
    expect(() => verifyWebhookSecret(config, 'shop', 'shopify')).toThrow();
    expect(() =>
      verifyWebhookSecret(
        config,
        'other',
        'shopify',
        'qa-webhook-secret-at-least-32-characters',
      ),
    ).toThrow();
  });
  it('rejects numeric booleans and over-precision review input', async () => {
    const manual = plainToInstance(CreateManualOrderDto, {
      customerName: 'QA',
      customerPhone: '0902233445',
      shippingAddress: 'QA',
      items: [{ sku: 'QA', quantity: true, unitPrice: true }],
    });
    expect((await validate(manual)).length).toBeGreaterThan(0);
    const review = plainToInstance(CreateOrderReviewDto, {
      productId: 'not-uuid',
      rating: 5,
      comment: '   ',
      reviewToken: 'token',
    });
    expect((await validate(review)).length).toBeGreaterThan(0);
  });
  it('prioritizes Shopify full refund and preserves address components', () => {
    const normalizer = new ShopifyOrderNormalizer();
    const result = normalizer.normalize({
      id: 'QA',
      financial_status: 'refunded',
      fulfillment_status: 'fulfilled',
      shipping_address: { address1: 'Road', city: 'City', country: 'VN' },
      line_items: [{ title: 'QA', sku: 'QA', quantity: 1, price: '100000' }],
    });
    expect(result.status).toBe('RETURNED');
    expect(result.shippingAddress).toBe('Road, City, VN');
  });
});

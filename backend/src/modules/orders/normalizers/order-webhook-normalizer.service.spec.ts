import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ExternalOrderPlatform } from '../dto/order-webhook.dto';
import { OrderWebhookNormalizerService } from './order-webhook-normalizer.service';

describe('OrderWebhookNormalizerService', () => {
  const service = new OrderWebhookNormalizerService();

  it('normalizes a Shopee order', () => {
    const order = service.normalize(ExternalOrderPlatform.SHOPEE, {
      order_sn: 'SPX-1001',
      order_status: 'SHIPPED',
      recipient_address: {
        name: 'Nguyen Van A',
        phone: '0901234567',
        full_address: 'Quan 1, TP.HCM',
      },
      item_list: [
        {
          item_name: 'Serum B5',
          item_sku: 'SERUM-B5',
          model_quantity: 2,
          model_discounted_price: 150000,
        },
      ],
      total_amount: 300000,
    });

    expect(order).toMatchObject({
      externalOrderId: 'SPX-1001',
      platform: ExternalOrderPlatform.SHOPEE,
      status: OrderStatus.SHIPPING,
      customerPhone: '0901234567',
      totalAmount: 300000,
      items: [
        {
          sku: 'SERUM-B5',
          name: 'Serum B5',
          quantity: 2,
          unitPrice: 150000,
        },
      ],
    });
  });

  it('normalizes a TikTok Shop order', () => {
    const order = service.normalize(ExternalOrderPlatform.TIKTOK, {
      data: {
        order: {
          order_id: 'TT-2001',
          status: 'DELIVERED',
          recipient_address: {
            full_name: 'Tran Thi B',
            phone_number: '0912345678',
            full_address: 'Thu Duc, TP.HCM',
          },
          line_items: [
            {
              product_name: 'Kem chong nang',
              seller_sku: 'SUNSCREEN-01',
              quantity: 1,
              sale_price: { amount: '220000' },
            },
          ],
          payment_info: { total_amount: '220000' },
        },
      },
    });

    expect(order).toMatchObject({
      externalOrderId: 'TT-2001',
      platform: ExternalOrderPlatform.TIKTOK,
      status: OrderStatus.DELIVERED,
      customerName: 'Tran Thi B',
      totalAmount: 220000,
      items: [{ sku: 'SUNSCREEN-01', unitPrice: 220000 }],
    });
  });

  it('normalizes a Shopify order', () => {
    const order = service.normalize(ExternalOrderPlatform.SHOPIFY, {
      id: 3001,
      fulfillment_status: 'fulfilled',
      customer: { first_name: 'Le', last_name: 'C' },
      shipping_address: {
        phone: '0923456789',
        address1: 'Da Nang',
      },
      line_items: [
        {
          title: 'Sua rua mat',
          sku: 'CLEANSER-01',
          quantity: 3,
          price: '99000',
        },
      ],
      total_price: '297000',
    });

    expect(order).toMatchObject({
      externalOrderId: '3001',
      platform: ExternalOrderPlatform.SHOPIFY,
      status: OrderStatus.DELIVERED,
      customerName: 'Le C',
      shippingAddress: 'Da Nang',
      items: [{ sku: 'CLEANSER-01', quantity: 3, unitPrice: 99000 }],
    });
  });

  it('rejects a payload without items', () => {
    expect(() =>
      service.normalize(ExternalOrderPlatform.SHOPEE, {
        order_sn: 'SPX-INVALID',
      }),
    ).toThrow(BadRequestException);
  });
});

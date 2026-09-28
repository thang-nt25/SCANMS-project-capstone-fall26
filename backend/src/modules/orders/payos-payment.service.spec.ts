import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayosPaymentService } from './payos-payment.service';

const mockCreate = jest.fn();
const mockVerify = jest.fn();
jest.mock('@payos/node', () => ({
  PayOS: jest.fn().mockImplementation(() => ({
    paymentRequests: { create: (...args: unknown[]) => mockCreate(...args) },
    webhooks: { verify: (...args: unknown[]) => mockVerify(...args) },
  })),
}));

const orderId = '12345678-1234-4234-8234-123456789abc';
const publicCode = 'DH-2026-ABC12345';
const config = { get: (key: string) => ({
  PAYOS_CLIENT_ID: 'client',
  PAYOS_API_KEY: 'api',
  PAYOS_CHECKSUM_KEY: 'checksum',
  PAYOS_STOREFRONT_URL: 'https://scanms.example',
  PAYOS_WEBHOOK_URL: 'https://api.scanms.example/api/orders/payos/webhook',
})[key] } as ConfigService;

describe('PayOS checkout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a payment link for the server-side order amount and its owner', async () => {
    const raw = { paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT' };
    const update = jest.fn();
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: orderId, status: 'PENDING', finalAmount: 125000, rawPayload: raw }),
        update,
      },
      $transaction: jest.fn(async (callback) => callback({
        $queryRaw: jest.fn().mockResolvedValue([{ raw_payload: raw }]),
        order: { update },
      })),
    } as any;
    const code = Number.parseInt(orderId.replace(/-/g, '').slice(0, 12), 16) + 1;
    mockCreate.mockResolvedValue({
      orderCode: code, amount: 125000, paymentLinkId: 'link-1',
      qrCode: '000201', checkoutUrl: 'https://pay.payos.vn/web/link-1',
      bin: '970422', accountNumber: '123', accountName: 'SCANMS',
    });

    const result = await new PayosPaymentService(prisma, config).createLink(publicCode, 'buyer-id');
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { externalOrderSn: publicCode, customerId: 'buyer-id', sourcePlatform: 'INTERNAL' },
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      orderCode: code,
      amount: 125000,
      returnUrl: `https://scanms.example/payment/payos-return?order=${publicCode}`,
    }));
    expect(result.qrCode).toBe('000201');
  });

  it('rejects a webhook with an invalid signature', async () => {
    mockVerify.mockRejectedValue(new Error('invalid signature'));
    const service = new PayosPaymentService({} as any, config);
    await expect(service.handleWebhook({} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not mark an order paid when the signed amount differs', async () => {
    mockVerify.mockResolvedValue({
      orderCode: 123, amount: 1000, currency: 'VND', reference: 'bank-1',
      code: '00', paymentLinkId: 'link-1',
    });
    const createTransaction = jest.fn();
    const prisma = {
      $transaction: jest.fn(async (callback) => callback({
        $queryRaw: jest.fn().mockResolvedValue([{
          id: orderId, external_order_sn: publicCode, status: 'PENDING',
          final_amount: 2000,
          raw_payload: { paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT', payos: { paymentLinkId: 'link-1' } },
        }]),
        paymentTransaction: { create: createTransaction },
      })),
    } as any;
    await expect(new PayosPaymentService(prisma, config).handleWebhook({ success: true, code: '00' } as any))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('records one paid transaction and safely accepts a repeated signed webhook', async () => {
    mockVerify.mockResolvedValue({
      orderCode: 123, amount: 2000, currency: 'VND', reference: 'bank-1',
      code: '00', paymentLinkId: 'link-1',
    });
    const raw = { paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT', payos: { paymentLinkId: 'link-1' } };
    const createTransaction = jest.fn();
    const updateOrder = jest.fn().mockImplementation(async ({ data }) => {
      Object.assign(raw, data.rawPayload);
    });
    const prisma = {
      $transaction: jest.fn(async (callback) => callback({
        $queryRaw: jest.fn().mockImplementation(async () => [{
          id: orderId, external_order_sn: publicCode, status: 'PENDING',
          final_amount: 2000, raw_payload: { ...raw },
        }]),
        paymentTransaction: { create: createTransaction },
        order: { update: updateOrder },
        auditLog: { create: jest.fn() },
      })),
    } as any;
    const service = new PayosPaymentService(prisma, config);
    const signed = { success: true, code: '00' } as any;
    await service.handleWebhook(signed);
    await service.handleWebhook(signed);
    expect(createTransaction).toHaveBeenCalledTimes(1);
    expect(raw.paymentStatus).toBe('PAID');
  });
});

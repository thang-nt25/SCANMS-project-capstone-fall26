import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayosPaymentService } from './payos-payment.service';

const mockCreate = jest.fn();
const mockVerify = jest.fn();
const mockGet = jest.fn();
const mockCancel = jest.fn();
jest.mock('@payos/node', () => ({
  PayOS: jest.fn().mockImplementation(() => ({
    paymentRequests: {
      create: (...args: unknown[]) => mockCreate(...args),
      get: (...args: unknown[]) => mockGet(...args),
      cancel: (...args: unknown[]) => mockCancel(...args),
    },
    webhooks: { verify: (...args: unknown[]) => mockVerify(...args) },
  })),
}));

const orderId = '12345678-1234-4234-8234-123456789abc';
const publicCode = 'DH-2026-ABC12345';
const config = {
  get: (key: string) =>
    ({
      PAYOS_CLIENT_ID: 'client',
      PAYOS_API_KEY: 'api',
      PAYOS_CHECKSUM_KEY: 'checksum',
      PAYOS_STOREFRONT_URL: 'https://scanms.example',
      PAYOS_WEBHOOK_URL: 'https://api.scanms.example/api/orders/payos/webhook',
    })[key],
} as ConfigService;

describe('PayOS checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReset();
    mockVerify.mockReset();
    mockGet.mockReset();
    mockCancel.mockReset();
  });

  it('creates a payment link for the server-side order amount and its owner', async () => {
    const raw = { paymentMethod: 'PAYOS', paymentStatus: 'WAITING_PAYMENT' };
    const update = jest.fn();
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          id: orderId,
          status: 'PENDING',
          finalAmount: 125000,
          rawPayload: raw,
        }),
        update,
      },
      $transaction: jest.fn(async (callback) =>
        callback({
          $queryRaw: jest.fn().mockResolvedValue([{ raw_payload: raw }]),
          order: { update },
        }),
      ),
    } as any;
    const code =
      Number.parseInt(orderId.replace(/-/g, '').slice(0, 12), 16) + 1;
    mockCreate.mockResolvedValue({
      orderCode: code,
      amount: 125000,
      paymentLinkId: 'link-1',
      qrCode: '000201',
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
      bin: '970422',
      accountNumber: '123',
      accountName: 'SCANMS',
    });

    const result = await new PayosPaymentService(prisma, config).createLink(
      publicCode,
      'buyer-id',
    );
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: {
        externalOrderSn: publicCode,
        customerId: 'buyer-id',
        sourcePlatform: 'INTERNAL',
      },
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        orderCode: code,
        amount: 125000,
        returnUrl: `https://scanms.example/payment/payos-return?order=${publicCode}`,
      }),
    );
    expect(result.qrCode).toBe('000201');
  });

  it('rejects a webhook with an invalid signature', async () => {
    mockVerify.mockRejectedValue(new Error('invalid signature'));
    const service = new PayosPaymentService({} as any, config);
    await expect(service.handleWebhook({} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('routes wallet events only after signature verification', async () => {
    const data = {
      orderCode: 123,
      amount: 100000,
      currency: 'VND',
      reference: 'bank-ref',
      code: '00',
      paymentLinkId: 'link-1',
    };
    const wallet = { handleVerifiedWebhook: jest.fn().mockResolvedValue(true) };
    const prisma = { $transaction: jest.fn() };
    const service = new PayosPaymentService(
      prisma as any,
      config,
      wallet as any,
    );
    mockVerify.mockRejectedValueOnce(new Error('invalid signature'));
    await expect(service.handleWebhook({} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(wallet.handleVerifiedWebhook).not.toHaveBeenCalled();
    mockVerify.mockResolvedValueOnce(data);
    expect(
      await service.handleWebhook({ success: true, code: '00' } as any),
    ).toEqual({ success: true });
    expect(wallet.handleVerifiedWebhook).toHaveBeenCalledWith(data);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not mark an order paid when the signed amount differs', async () => {
    mockVerify.mockResolvedValue({
      orderCode: 123,
      amount: 1000,
      currency: 'VND',
      reference: 'bank-1',
      code: '00',
      paymentLinkId: 'link-1',
    });
    const createTransaction = jest.fn();
    const prisma = {
      $transaction: jest.fn(async (callback) =>
        callback({
          $queryRaw: jest.fn().mockResolvedValue([
            {
              id: orderId,
              external_order_sn: publicCode,
              status: 'PENDING',
              final_amount: 2000,
              raw_payload: {
                paymentMethod: 'PAYOS',
                paymentStatus: 'WAITING_PAYMENT',
                payos: { paymentLinkId: 'link-1' },
              },
            },
          ]),
          paymentTransaction: { create: createTransaction },
        }),
      ),
    } as any;
    await expect(
      new PayosPaymentService(prisma, config).handleWebhook({
        success: true,
        code: '00',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('records one paid transaction and safely accepts a repeated signed webhook', async () => {
    mockVerify.mockResolvedValue({
      orderCode: 123,
      amount: 2000,
      currency: 'VND',
      reference: 'bank-1',
      code: '00',
      paymentLinkId: 'link-1',
    });
    const raw = {
      paymentMethod: 'PAYOS',
      paymentStatus: 'WAITING_PAYMENT',
      payos: { paymentLinkId: 'link-1' },
    };
    const createTransaction = jest.fn();
    const createNotification = jest.fn();
    const updateOrder = jest.fn().mockImplementation(async ({ data }) => {
      Object.assign(raw, data.rawPayload);
    });
    const prisma = {
      $transaction: jest.fn(async (callback) =>
        callback({
          $queryRaw: jest.fn().mockImplementation(async () => [
            {
              id: orderId,
              external_order_sn: publicCode,
              status: 'PENDING',
              final_amount: 2000,
              raw_payload: { ...raw },
              customer_id: 'customer-1',
            },
          ]),
          paymentTransaction: { create: createTransaction },
          order: { update: updateOrder },
          notification: { create: createNotification },
          auditLog: { create: jest.fn() },
        }),
      ),
    } as any;
    const service = new PayosPaymentService(prisma, config);
    const signed = { success: true, code: '00' } as any;
    await service.handleWebhook(signed);
    await service.handleWebhook(signed);
    expect(createTransaction).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer-1',
        type: 'ORDER_PAYMENT_CONFIRMED',
      }),
    });
    expect(raw.paymentStatus).toBe('PAID');
  });

  function fixture(status = 'PENDING') {
    const order = {
      id: orderId,
      externalOrderSn: publicCode,
      customerId: 'buyer-id',
      status,
      finalAmount: 2000,
      rawPayload: {
        paymentMethod: 'PAYOS',
        paymentStatus: 'WAITING_PAYMENT',
        payos: {
          orderCode: 123,
          paymentLinkId: 'link-1',
          amount: 2000,
          qrCode: 'QR',
          checkoutUrl: 'https://pay.payos.vn/web/link-1',
        },
      } as any,
    };
    const tx = {
      $queryRaw: jest.fn(async () => [
        {
          id: order.id,
          external_order_sn: publicCode,
          customer_id: 'buyer-id',
          status: order.status,
          final_amount: order.finalAmount,
          raw_payload: structuredClone(order.rawPayload),
        },
      ]),
      order: {
        update: jest.fn(async ({ data }) => {
          order.rawPayload = data.rawPayload;
        }),
      },
      paymentTransaction: { create: jest.fn() },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    let queue = Promise.resolve();
    const prisma = {
      order: {
        findFirst: jest.fn(async ({ where }) =>
          where.customerId === 'buyer-id' ? structuredClone(order) : null,
        ),
        findUnique: jest.fn(async () => structuredClone(order)),
        update: tx.order.update,
      },
      $transaction: jest.fn((callback) => {
        const result = queue.then(() => callback(tx));
        queue = result.catch(() => undefined);
        return result;
      }),
    } as any;
    const provider = {
      id: 'link-1',
      orderCode: 123,
      amount: 2000,
      amountPaid: 2000,
      amountRemaining: 0,
      status: 'PAID',
      transactions: [],
    };
    mockGet.mockResolvedValue(provider);
    return {
      order,
      tx,
      prisma,
      provider,
      service: new PayosPaymentService(prisma, config),
    };
  }

  it('allows real provider reconciliation without a public webhook', () => {
    const localConfig = {
      get: (key: string) =>
        key === 'PAYOS_WEBHOOK_URL' ? undefined : config.get(key),
    } as ConfigService;
    expect(
      new PayosPaymentService({} as any, localConfig).isAvailable(),
    ).toEqual({ available: true });
  });

  it('still rejects missing payment credentials', () => {
    const missing = { get: () => undefined } as any;
    expect(new PayosPaymentService({} as any, missing).isAvailable()).toEqual({
      available: false,
    });
  });

  it('reconciles a paid provider response and a racing webhook exactly once', async () => {
    const { service, order, tx } = fixture();
    mockVerify.mockResolvedValue({
      orderCode: 123,
      amount: 2000,
      currency: 'VND',
      reference: 'bank-1',
      code: '00',
      paymentLinkId: 'link-1',
    });
    await Promise.all([
      service.getStatus(publicCode, 'buyer-id'),
      service.handleWebhook({ success: true, code: '00' } as any),
    ]);
    expect(order.rawPayload.paymentStatus).toBe('PAID');
    expect(tx.paymentTransaction.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(
      (await service.getStatus(publicCode, 'buyer-id')).paymentStatus,
    ).toBe('PAID');
  });

  it.each([
    { orderCode: 999 },
    { amount: 900 },
    { id: 'foreign-link' },
    { amountPaid: 1000 },
    { amountRemaining: 1 },
  ])(
    'rejects mismatched provider data %j without financial writes',
    async (changes) => {
      const { service, provider, tx } = fixture();
      mockGet.mockResolvedValue({ ...provider, ...changes });
      await expect(
        service.getStatus(publicCode, 'buyer-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    },
  );

  it('retains an underpaid order as unpaid', async () => {
    const { service, provider, tx } = fixture();
    mockGet.mockResolvedValue({
      ...provider,
      status: 'UNDERPAID',
      amountPaid: 1000,
      amountRemaining: 1000,
    });
    expect(await service.getStatus(publicCode, 'buyer-id')).toMatchObject({
      paymentStatus: 'WAITING_PAYMENT',
      providerStatus: 'UNDERPAID',
    });
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('checks ownership before contacting PayOS', async () => {
    const { service } = fixture();
    await expect(
      service.getStatus(publicCode, 'foreign-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.createLink(publicCode, 'foreign-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not reconcile cancelled orders on a customer status request', async () => {
    const { service, tx } = fixture('CANCELLED');
    expect(
      (await service.getStatus(publicCode, 'buyer-id')).paymentStatus,
    ).toBe('WAITING_PAYMENT');
    await expect(
      service.createLink(publicCode, 'buyer-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockGet).not.toHaveBeenCalled();
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects payment confirmation for an order cancelled during the provider check', async () => {
    const { service, order, provider, tx } = fixture();
    mockGet.mockImplementation(async () => {
      order.status = 'CANCELLED';
      return provider;
    });
    await expect(
      service.getStatus(publicCode, 'buyer-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('reports a provider outage without claiming a payment', async () => {
    const { service, tx } = fixture();
    mockGet.mockRejectedValue(new Error('provider timeout'));
    await expect(
      service.getStatus(publicCode, 'buyer-id'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(tx.paymentTransaction.create).not.toHaveBeenCalled();
  });

  it('refreshes an expired QR using a new numeric code and the current amount', async () => {
    const { service, provider } = fixture();
    mockGet.mockResolvedValue({
      ...provider,
      status: 'EXPIRED',
      amountPaid: 0,
      amountRemaining: 2000,
    });
    mockCreate.mockImplementation(async (request) => ({
      ...request,
      paymentLinkId: 'new-link',
      qrCode: 'NEW QR',
      checkoutUrl: 'https://pay.payos.vn/web/new-link',
    }));
    const result = await service.createLink(publicCode, 'buyer-id');
    expect(result.qrCode).toBe('NEW QR');
    expect(result.orderCode).not.toBe(123);
    expect(result.amount).toBe(2000);
  });

  it('shares concurrent link creation for the same owned order', async () => {
    const { service, provider } = fixture();
    mockGet.mockResolvedValue({
      ...provider,
      status: 'PENDING',
      amountPaid: 0,
      amountRemaining: 2000,
    });
    const result = await Promise.all([
      service.createLink(publicCode, 'buyer-id'),
      service.createLink(publicCode, 'buyer-id'),
    ]);
    expect(result[0]).toEqual(result[1]);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('recovers a provider-created link whose original response was interrupted', async () => {
    const { service, order, provider } = fixture();
    order.rawPayload.payos = { orderCode: 123 };
    mockGet.mockResolvedValue({
      ...provider,
      status: 'PENDING',
      amountPaid: 0,
      amountRemaining: 2000,
    });
    mockCancel.mockResolvedValue({
      ...provider,
      status: 'CANCELLED',
      amountPaid: 0,
    });
    mockCreate
      .mockRejectedValueOnce(new Error('Duplicate order code'))
      .mockImplementationOnce(async (request) => ({
        ...request,
        paymentLinkId: 'new-link',
        qrCode: 'RECOVERED QR',
        checkoutUrl: 'https://pay.payos.vn/web/new-link',
      }));
    const result = await service.createLink(publicCode, 'buyer-id');
    expect(result.qrCode).toBe('RECOVERED QR');
    expect(result.orderCode).not.toBe(123);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(order.rawPayload.payos.paymentLinkId).toBe('new-link');
  });

  it('does not cancel or reprice a QR that has already received partial funds', async () => {
    const { service, provider } = fixture();
    mockGet.mockResolvedValue({
      ...provider,
      status: 'UNDERPAID',
      amountPaid: 1000,
      amountRemaining: 1000,
    });
    expect(await service.cancelPendingLinkForLivePriceReset(orderId)).toBe(
      false,
    );
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

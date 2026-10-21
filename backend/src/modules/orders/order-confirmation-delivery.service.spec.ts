import { Logger } from '@nestjs/common';
import { OrderConfirmationDeliveryService } from './order-confirmation-delivery.service';

describe('durable order confirmation delivery', () => {
  const order = {
    id: '00000000-0000-4000-8000-000000000001', externalOrderSn: 'DH-EMAIL',
    customerEmail: 'buyer@example.test', customerName: 'Khách mua', customerPhone: '0901234567', shippingAddress: 'Thủ Đức',
    createdAt: new Date('2026-10-20T00:00:00Z'), subtotalAmount: 320000, discountAmount: 32000, shippingFee: 21001, finalAmount: 309001,
    rawPayload: { paymentMethod: 'WALLET', paymentStatus: 'PAID', confirmationEmailStatus: 'QUEUED' }, store: { name: 'Sora Skin' },
    orderItems: [{ quantity: 1, unitPrice: 320000, product: { title: 'Serum C', sku: 'SEED-001' }, variant: { name: '50 ml', sku: 'SEED-001-50' } }],
  };
  function fixture(attempts = 1) {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: order.id, attempts }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
      order: { findUnique: jest.fn().mockResolvedValue(order), update: jest.fn() },
    };
    const mail = { sendOrderConfirmation: jest.fn().mockResolvedValue(true) };
    return { prisma, mail, worker: new OrderConfirmationDeliveryService(prisma as any, mail as any) };
  }
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends the committed shop receipt and marks SENT only after SMTP accepts it', async () => {
    const { worker, prisma, mail } = fixture();
    let accept!: (value: boolean) => void;
    mail.sendOrderConfirmation.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
    const pending = worker.deliverQueued();
    await Promise.resolve(); await Promise.resolve();
    expect(mail.sendOrderConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      email: order.customerEmail, publicOrderCode: 'DH-EMAIL', finalAmount: 309001, paymentStatus: 'PAID',
      items: [{ title: 'Serum C', variantName: '50 ml', sku: 'SEED-001-50', quantity: 1, unitPrice: 320000 }],
    }));
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    await worker.deliverQueued();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    accept(true); await pending;
    expect(prisma.$executeRaw.mock.calls[0].slice(1)).toContain('SENT');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'throws'])('retries SMTP failures (%s) without altering order/payment data', async failure => {
    const { worker, prisma, mail } = fixture();
    if (failure === 'throws') mail.sendOrderConfirmation.mockRejectedValue(new Error('SMTP unavailable'));
    else mail.sendOrderConfirmation.mockResolvedValue(false);
    await worker.deliverQueued();
    const values = prisma.$executeRaw.mock.calls[0].slice(1);
    expect(values).toContain('QUEUED');
    const metadata = JSON.parse(values.find(value => typeof value === 'string' && value.startsWith('{')));
    expect(metadata.attempts).toBe(1);
    expect(Date.parse(metadata.nextAttemptAt)).toBeGreaterThan(Date.now());
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('bounds retries and retains a FAILED receipt status after the final attempt', async () => {
    const { worker, prisma, mail } = fixture(3);
    mail.sendOrderConfirmation.mockResolvedValue(false);
    await worker.deliverQueued();
    expect(prisma.$executeRaw.mock.calls[0].slice(1)).toContain('FAILED');
  });

  it('does not send anything when another worker already claimed the jobs', async () => {
    const { worker, prisma, mail } = fixture();
    prisma.$queryRaw.mockResolvedValue([]);
    await worker.deliverQueued();
    expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });

  it('keeps the worker available after a database outage', async () => {
    const { worker, prisma, mail } = fixture();
    prisma.$queryRaw.mockRejectedValueOnce(new Error('database offline'));
    await worker.deliverQueued();
    expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    await worker.deliverQueued();
    expect(mail.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });
});

import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentLink, WebhookData } from '@payos/node';
import { SponsorshipPayosService } from './sponsorship-payos.service';
import { SPONSORSHIP_PAYOS_CODE_BASE } from './sponsorship-pricing';

const orderCode = SPONSORSHIP_PAYOS_CODE_BASE + 42;
const now = Date.now();
const transactionDateTime = new Date(now - 1000).toISOString();

function setup() {
  let row = {
    id: 'booking', storeId: 'shop', requestedById: 'owner', status: 'AWAITING_PAYMENT',
    startsAt: new Date(now + 3600_000), endsAt: new Date(now + 7200_000),
    reviewedAt: new Date(now - 60_000), paymentDeadline: new Date(now + 60_000),
    paymentStartedAt: new Date(now - 5000), payosOrderCode: String(orderCode), payosLinkId: 'link',
    amount: 100000, receivedAmount: null, paymentIssue: null, paidAt: null,
  };
  const tx = {
    $executeRaw: jest.fn(),
    sponsoredPlacement: {
      findUnique: jest.fn(async () => row),
      findUniqueOrThrow: jest.fn(async () => row),
      findFirst: jest.fn(async (_?: unknown) => row),
      findMany: jest.fn(async (): Promise<unknown[]> => []),
      update: jest.fn(async ({ data }) => (row = { ...row, ...data })),
      updateMany: jest.fn(async ({ data }) => { row = { ...row, ...data }; return { count: 1 }; }),
    },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn(async fn => fn(tx)) };
  const service = new SponsorshipPayosService(prisma as never, new ConfigService());
  const get = jest.fn();
  const create = jest.fn();
  jest.spyOn(service as any, 'client').mockReturnValue({ paymentRequests: { get, create } });
  return { service, tx, get, create, booking: () => row };
}

function providerPayment(amount: number, time = transactionDateTime): PaymentLink {
  return {
    id: 'link', orderCode, amount: 100000, amountPaid: amount,
    amountRemaining: Math.max(0, 100000 - amount), status: amount < 100000 ? 'UNDERPAID' : 'PAID',
    transactions: [{ amount, reference: 'BANK-REF', transactionDateTime: time }],
  } as PaymentLink;
}

function receipt(amount: number): WebhookData {
  return { orderCode, paymentLinkId: 'link', amount, currency: 'VND', reference: 'BANK-REF' } as WebhookData;
}

describe('Sponsorship payOS', () => {
  it('reuses the reserved checkout and scopes it to its store owner', async () => {
    const { service, tx, create } = setup();
    await expect(service.createLink('booking', 'owner')).resolves.toEqual({ checkoutUrl: 'https://pay.payos.vn/web/link' });
    expect(tx.sponsoredPlacement.findFirst).toHaveBeenCalledWith({ where: { id: 'booking', store: { ownerId: 'owner' } } });
    expect(create).not.toHaveBeenCalled();
    tx.sponsoredPlacement.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.createLink('booking', 'other')).rejects.toThrow(NotFoundException);
  });

  it('refuses checkout after the hold ends', async () => {
    const { service, booking } = setup();
    booking().paymentDeadline = new Date(now - 1000);
    await expect(service.createLink('booking', 'owner')).rejects.toThrow(ConflictException);
  });

  it('creates a provider request for the locked booking amount and deadline', async () => {
    const { service, create, booking } = setup();
    Object.assign(booking(), { payosLinkId: null, paymentStartedAt: null });
    create.mockResolvedValue({ orderCode, amount: 100000, currency: 'VND', status: 'PENDING', paymentLinkId: 'new-link' });
    await expect(service.createLink('booking', 'owner')).resolves.toMatchObject({ checkoutUrl: 'https://pay.payos.vn/web/new-link' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      orderCode, amount: 100000, expiredAt: Math.floor(booking().paymentDeadline.getTime() / 1000),
    }));
    expect(booking().paymentStartedAt).toBeInstanceOf(Date);
    expect(booking().status).toBe('AWAITING_PAYMENT');
  });

  it('records exact verified payments once even when a notification is repeated', async () => {
    const { service, get, booking, tx } = setup();
    get.mockResolvedValue(providerPayment(100000));
    expect(await service.handleVerifiedWebhook(receipt(100000))).toBe(true);
    expect(await service.handleVerifiedWebhook(receipt(100000))).toBe(true);
    expect(booking()).toMatchObject({ status: 'APPROVED', receivedAmount: 100000, paymentReference: 'payos:BANK-REF', paidAt: new Date(transactionDateTime) });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });

  it('does not approve a receipt with the wrong link identifier', async () => {
    const { service, get, booking } = setup();
    get.mockResolvedValue(providerPayment(100000));
    await expect(service.handleVerifiedWebhook({ ...receipt(100000), paymentLinkId: 'wrong' })).rejects.toThrow(ServiceUnavailableException);
    expect(booking().status).toBe('AWAITING_PAYMENT');
  });

  it.each([[99999, transactionDateTime], [100001, transactionDateTime], [100000, new Date(now + 120_000).toISOString()]])(
    'routes exceptional receipt %s at %s to reconciliation', async (amount, time) => {
      const { service, get, booking, tx } = setup();
      get.mockResolvedValue(providerPayment(amount, time));
      await service.handleVerifiedWebhook(receipt(amount));
      expect(booking()).toMatchObject({ status: 'PAYMENT_REVIEW', receivedAmount: amount, paidAt: null });
      expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SPONSORSHIP_PAYOS_REVIEW' }) });
    },
  );

  it('does not reclaim a slot booked by another request while confirmation was delayed', async () => {
    const { service, get, booking, tx } = setup();
    booking().paymentDeadline = new Date(now - 500);
    const { startsAt, endsAt } = booking();
    tx.sponsoredPlacement.findMany.mockResolvedValue([{ storeId: 'shop', startsAt, endsAt }]);
    get.mockResolvedValue(providerPayment(100000));
    await service.handleVerifiedWebhook(receipt(100000));
    expect(booking().status).toBe('PAYMENT_REVIEW');
  });
});

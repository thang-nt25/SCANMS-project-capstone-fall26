import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { WalletPayosService } from './wallet-payos.service';

const create = jest.fn();
const get = jest.fn();
const cancel = jest.fn();
jest.mock('@payos/node', () => ({ PayOS: jest.fn().mockImplementation(() => ({ paymentRequests: { create, get, cancel } })) }));
const config = { get: (key: string) => ({ PAYOS_CLIENT_ID: 'client', PAYOS_API_KEY: 'api', PAYOS_CHECKSUM_KEY: 'checksum', PAYOS_STOREFRONT_URL: 'http://localhost:5173' })[key] } as ConfigService;
const id = '11111111-1111-4111-8111-111111111111';

function fixture() {
  const row: any = { id, userId: 'buyer', orderCode: 123n, amount: new Prisma.Decimal(100000), status: 'PENDING', paymentLinkId: 'link-1',
    expiresAt: new Date(Date.now() + 60000), accountNumber: 'provider-account', accountName: 'Provider account name', bin: '970422',
    description: 'provider-description', qrCode: 'provider-qr', checkoutUrl: 'https://pay.payos.vn/web/link-1' };
  const table = {
    findFirst: jest.fn().mockResolvedValue(row), findUnique: jest.fn().mockResolvedValue(row), findUniqueOrThrow: jest.fn().mockImplementation(async () => row),
    create: jest.fn().mockImplementation(async ({ data }) => { Object.assign(row, data); return row; }),
    update: jest.fn().mockImplementation(async ({ data }) => { Object.assign(row, data); return row; }),
    updateMany: jest.fn().mockImplementation(async ({ where, data }) => { if (where.status === undefined || where.status === row.status || where.status.in?.includes(row.status)) Object.assign(row, data); return { count: 1 }; }),
  };
  const tx = { walletTopUp: table, $queryRaw: jest.fn() };
  const prisma = { walletTopUp: table, $transaction: jest.fn(async fn => fn(tx)) };
  const wallets = { creditAvailableBalance: jest.fn().mockResolvedValue({}) };
  const service = new WalletPayosService(prisma as any, config, wallets as any);
  return { row, table, prisma, wallets, service };
}
const paidLink = { id: 'link-1', orderCode: 123, amount: 100000, amountPaid: 100000, amountRemaining: 0, status: 'PAID', transactions: [] };

describe('Wallet payOS top-ups', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([0, -1, 9999, 50000001, 10000.5, NaN])('rejects invalid amount %s before contacting payOS', async amount => {
    const { service } = fixture();
    await expect(service.create('buyer', amount)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a persisted owned request and returns provider QR and bank data', async () => {
    const { service, table } = fixture(); table.findFirst.mockResolvedValue(null);
    create.mockImplementation(async input => ({ ...input, currency: 'VND', paymentLinkId: 'new-link', qrCode: 'real-provider-qr',
      bin: '970436', accountNumber: 'real-provider-account', accountName: 'Provider Name', checkoutUrl: 'https://pay.payos.vn/web/new-link' }));
    const result = await service.create('buyer', 100000);
    expect(table.create.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100000, returnUrl: `http://localhost:5173/customer/wallet?topup=${id}`, description: 'NAP VI' }));
    expect(result).toEqual(expect.objectContaining({ qrCode: 'real-provider-qr', accountNumber: 'real-provider-account', status: 'PENDING' }));
    expect(result).not.toHaveProperty('userId');
  });

  it('does not let another user check a payment', async () => {
    const { service, table } = fixture();table.findFirst.mockResolvedValue(null);
    await expect(service.status('another-buyer', id)).rejects.toBeInstanceOf(NotFoundException);
    expect(table.findFirst).toHaveBeenCalledWith({ where: { id, userId: 'another-buyer' } });
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects provider QR with the wrong amount or currency', async () => {
    const { service, table, wallets } = fixture(); table.findFirst.mockResolvedValue(null);
    create.mockImplementation(async input => ({ ...input, amount: 99000, currency: 'USD', qrCode: 'wrong-qr' }));
    await expect(service.create('buyer', 100000)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });

  it('acknowledges partial transfers without credit until the provider reports the full total', async () => {
    const { service, wallets } = fixture();
    get.mockResolvedValue({ ...paidLink, status: 'UNDERPAID', amountPaid: 40000, amountRemaining: 60000 });
    const event = { orderCode: 123, amount: 40000, currency: 'VND', reference: 'partial-1', paymentLinkId: 'link-1' } as any;
    expect(await service.handleVerifiedWebhook(event)).toBe(true);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
    get.mockResolvedValue(paidLink);
    expect(await service.handleVerifiedWebhook({ ...event, amount: 60000, reference: 'partial-2' })).toBe(true);
    expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...paidLink, amount: 99000 }, { ...paidLink, amountPaid: 99000 },
    { ...paidLink, amountRemaining: 1 }, { ...paidLink, orderCode: 456 }, { ...paidLink, id: 'different-link' },
  ])('rejects a paid response that does not match the persisted payment', async link => {
    const { service, wallets } = fixture();get.mockResolvedValue(link);
    await expect(service.status('buyer', id)).rejects.toBeInstanceOf(BadRequestException);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });

  it('never credits a pending payment, even when the user checks it', async () => {
    const { service, wallets } = fixture();get.mockResolvedValue({ ...paidLink, status: 'PENDING', amountPaid: 0, amountRemaining: 100000 });
    expect((await service.status('buyer', id)).status).toBe('PENDING');
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });

  it('credits once, with the persisted owner and ledger reference, across retries', async () => {
    const { service, wallets } = fixture();get.mockResolvedValue(paidLink);
    expect((await service.status('buyer', id)).status).toBe('PAID');
    await service.status('buyer', id);
    await service.handleVerifiedWebhook({ orderCode: 123, amount: 100000, currency: 'VND', reference: 'bank-ref', paymentLinkId: 'link-1' } as any);
    expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
    expect(wallets.creditAvailableBalance).toHaveBeenCalledWith(expect.anything(), 'buyer', new Prisma.Decimal(100000), { id, type: 'TOPUP_PAYOS' });
  });

  it('keeps provider failures from becoming wallet credits', async () => {
    const { service, wallets } = fixture();get.mockRejectedValue(new Error('provider failure'));
    await expect(service.status('buyer', id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });

  it('does not overwrite an early webhook settlement during link creation', async () => {
    const { service, table, row } = fixture();table.findFirst.mockResolvedValue(null);
    create.mockImplementation(async input => { row.status = 'PAID';return { ...input, currency: 'VND', paymentLinkId: 'link-1', qrCode: 'qr', bin: '970422', accountNumber: 'account', accountName: 'name', checkoutUrl: 'https://pay.payos.vn/web/link-1' }; });
    expect((await service.create('buyer', 100000)).status).toBe('PAID');
  });

  describe('changing the amount', () => {
    const pendingLink = { ...paidLink, status: 'PENDING', amountPaid: 0, amountRemaining: 100000 };

    it('cancels an unpaid provider link and does not credit the wallet', async () => {
      const { service, wallets } = fixture();
      get.mockResolvedValue(pendingLink);
      cancel.mockResolvedValue({ ...pendingLink, status: 'CANCELLED' });
      expect((await service.cancel('buyer', id)).status).toBe('CANCELLED');
      expect(cancel).toHaveBeenCalledWith(123, 'Khach hang doi so tien nap vi');
      expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
      await service.cancel('buyer', id);
      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('rejects cancellation by another account before calling payOS', async () => {
      const { service, table } = fixture(); table.findFirst.mockResolvedValue(null);
      await expect(service.cancel('another-buyer', id)).rejects.toBeInstanceOf(NotFoundException);
      expect(table.findFirst).toHaveBeenCalledWith({ where: { id, userId: 'another-buyer' } });
      expect(cancel).not.toHaveBeenCalled(); expect(get).not.toHaveBeenCalled();
    });

    it('settles a payment received before cancellation instead of cancelling it', async () => {
      const { service, wallets } = fixture(); get.mockResolvedValue(paidLink);
      expect((await service.cancel('buyer', id)).status).toBe('PAID');
      expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
      expect(cancel).not.toHaveBeenCalled();
    });

    it('settles a payment received while cancellation is in flight', async () => {
      const { service, wallets } = fixture(); get.mockResolvedValue(pendingLink); cancel.mockResolvedValue(paidLink);
      expect((await service.cancel('buyer', id)).status).toBe('PAID');
      expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
    });

    it('keeps an underpaid request instead of cancelling received funds', async () => {
      const { service, wallets } = fixture();get.mockResolvedValue({ ...pendingLink, status: 'UNDERPAID', amountPaid: 40000, amountRemaining: 60000 });
      await expect(service.cancel('buyer', id)).rejects.toBeInstanceOf(BadRequestException);
      expect(cancel).not.toHaveBeenCalled(); expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
    });

    it('keeps the old QR request if payOS cannot cancel it', async () => {
      const { service, row } = fixture();get.mockResolvedValue(pendingLink); cancel.mockRejectedValue(new Error('network'));
      await expect(service.cancel('buyer', id)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(row.status).toBe('PENDING');expect(row.qrCode).toBe('provider-qr');
    });

    it('rejects a cancellation response for another payment', async () => {
      const { service, row } = fixture();get.mockResolvedValue(pendingLink);cancel.mockResolvedValue({ ...pendingLink, status: 'CANCELLED', id: 'wrong-link' });
      await expect(service.cancel('buyer', id)).rejects.toBeInstanceOf(BadRequestException);
      expect(row.status).toBe('PENDING');
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletSummaryService } from './wallet-summary.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';

describe('wallet account and ledger access', () => {
  function setup() {
    const prisma = {
      collaboratorProfile: { upsert: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      financialLedger: { findMany: jest.fn(), count: jest.fn() },
      commission: { findMany: jest.fn().mockResolvedValue([]) },
      payoutRequest: { findMany: jest.fn().mockResolvedValue([]) },
      monthlyBonusResult: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      orderRefund: { findMany: jest.fn().mockResolvedValue([]) },
      store: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    };
    const service = new WalletSummaryService(prisma as unknown as PrismaService, {} as WithdrawalPolicyService);
    return { service, prisma };
  }

  it('normalizes bank fields and updates only the authenticated owner', async () => {
    const { service, prisma } = setup();
    await service.updateBankAccount('owner-a', { bankName: ' MBBank ', bankAccountNumber: ' 123456789 ', bankAccountName: ' nguyen van a ' });
    expect(prisma.collaboratorProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'owner-a' },
      create: { userId: 'owner-a', idCardNumber: '', bankName: 'MBBank', bankAccountNumber: '123456789', bankAccountName: 'NGUYEN VAN A' },
      update: { bankName: 'MBBank', bankAccountNumber: '123456789', bankAccountName: 'NGUYEN VAN A', kycStatus: 'UNVERIFIED' },
    });
  });

  it.each(['bankName', 'bankAccountNumber', 'bankAccountName'] as const)('rejects a blank %s without writing', async field => {
    const { service, prisma } = setup();
    const details = { bankName: 'MBBank', bankAccountNumber: '123456789', bankAccountName: 'NGUYEN VAN A', [field]: '   ' };
    await expect(service.updateBankAccount('owner-a', details)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.collaboratorProfile.upsert).not.toHaveBeenCalled();
  });

  it('disconnects only the authenticated owner without changing balances or KYC', async () => {
    const { service, prisma } = setup();
    await service.disconnectBankAccount('owner-a');
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 'owner-a' }, data: { bankName: '', bankAccountNumber: '', bankAccountName: '', kycStatus: 'UNVERIFIED' },
    });
  });

  it('scopes both ledger queries to the owner and preserves decimal amounts on page two', async () => {
    const { service, prisma } = setup();
    prisma.financialLedger.findMany.mockResolvedValue([{
      id: 'entry', amount: new Prisma.Decimal('-200000.10'), balanceBefore: new Prisma.Decimal('500000.31'), balanceAfter: new Prisma.Decimal('300000.21'),
    }]);
    prisma.financialLedger.count.mockResolvedValue(11);
    const result = await service.getMyLedger('owner-a', { page: 2, limit: 10 });
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith({
      where: { wallet: { collaboratorId: 'owner-a' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 10, take: 10,
    });
    expect(prisma.financialLedger.count).toHaveBeenCalledWith({ where: { wallet: { collaboratorId: 'owner-a' } } });
    expect(result).toMatchObject({ page: 2, limit: 10, total: 11, entries: [{ amount: '-200000.10', balanceBefore: '500000.31', balanceAfter: '300000.21' }] });
  });

  it('resolves shared commission references, payouts and monthly bonuses without exposing unrelated fields', async () => {
    const { service, prisma } = setup();
    const decimal = new Prisma.Decimal('123.45');
    const row = (referenceType: string, referenceId: string, storeId: string | null = null) => ({
      id: `${referenceType}-${referenceId}`, referenceType, referenceId, storeId,
      amount: decimal, balanceBefore: decimal, balanceAfter: decimal,
    });
    prisma.financialLedger.findMany.mockResolvedValue([
      row('COMMISSION', 'c1'), row('COMMISSION', 'c1'), row('PAYOUT_REQUEST', 'p1'),
      row('MONTHLY_BONUS', 'b1'), row('COMMISSION', 'deleted', 's1'), row('COMMISSION', 'missing'),
    ]);
    prisma.financialLedger.count.mockResolvedValue(6);
    prisma.commission.findMany.mockResolvedValue([{ id: 'c1', order: { id: 'o1', externalOrderSn: 'SCANMS-123', store: { name: 'Shop A' } } }]);
    prisma.payoutRequest.findMany.mockResolvedValue([{ id: 'p1', store: { name: 'Shop B' } }]);
    prisma.monthlyBonusResult.findMany.mockResolvedValue([{ id: 'b1', yearMonth: '2026-10', store: { name: 'Shop C' } }]);
    prisma.store.findMany.mockResolvedValue([{ id: 's1', name: 'Historical Shop' }]);
    const result = await service.getMyLedger('owner-a', { page: 1, limit: 10 });
    expect(result.entries[0].referenceDetails).toEqual({ storeName: 'Shop A', orderId: 'o1', orderCode: 'SCANMS-123', period: null });
    expect(result.entries[1].referenceDetails).toEqual(result.entries[0].referenceDetails);
    expect(result.entries[2].referenceDetails?.storeName).toBe('Shop B');
    expect(result.entries[3].referenceDetails?.period).toBe('2026-10');
    expect(result.entries[4].referenceDetails).toEqual({ storeName: 'Historical Shop', orderId: null, orderCode: null, period: null });
    expect(result.entries[5].referenceDetails).toBeNull();
    for (const lookup of [prisma.commission, prisma.payoutRequest, prisma.monthlyBonusResult]) {
      expect(lookup.findMany).toHaveBeenCalledTimes(1);
      expect(lookup.findMany.mock.calls[0][0].where.collaboratorId).toBe('owner-a');
    }
    expect(prisma.commission.findMany.mock.calls[0][0].where.id.in).toEqual(['c1', 'deleted', 'missing']);
  });

  it('resolves both legacy and current refund references using owner-scoped orders', async () => {
    const { service, prisma } = setup();
    const amount = new Prisma.Decimal('10');
    prisma.financialLedger.findMany.mockResolvedValue(['legacy', 'refund', 'order'].map(referenceId => ({
      id: referenceId, referenceType: 'ORDER_REFUND', referenceId, amount, balanceBefore: amount, balanceAfter: amount,
    })));
    prisma.financialLedger.count.mockResolvedValue(3);
    const order = { id: 'o1', externalOrderSn: 'ORDER-99', store: { name: 'Shop' } };
    prisma.commission.findMany.mockResolvedValue([{ id: 'legacy', order }]);
    prisma.orderRefund.findMany.mockResolvedValue([{ id: 'refund', order }]);
    prisma.order.findMany.mockResolvedValue([{ ...order, id: 'order' }]);
    const result = await service.getMyLedger('owner-a', { page: 1, limit: 10 });
    expect(result.entries.every(entry => entry.referenceDetails?.orderCode === 'ORDER-99')).toBe(true);
    expect(prisma.order.findMany.mock.calls[0][0].where.OR).toContainEqual({ commissions: { some: { collaboratorId: 'owner-a' } } });
    expect(prisma.orderRefund.findMany.mock.calls[0][0].where.order.OR).toContainEqual({ customerId: 'owner-a' });
    expect(prisma.commission.findMany.mock.calls[0][0].where.collaboratorId).toBe('owner-a');
  });

  it('does not load unrelated reference tables for an empty ledger', async () => {
    const { service, prisma } = setup();
    prisma.financialLedger.findMany.mockResolvedValue([]);
    prisma.financialLedger.count.mockResolvedValue(0);
    expect((await service.getMyLedger('owner-a', { page: 1, limit: 10 })).entries).toEqual([]);
    for (const lookup of [prisma.commission, prisma.payoutRequest, prisma.monthlyBonusResult, prisma.order, prisma.orderRefund, prisma.store]) {
      expect(lookup.findMany).not.toHaveBeenCalled();
    }
  });
});

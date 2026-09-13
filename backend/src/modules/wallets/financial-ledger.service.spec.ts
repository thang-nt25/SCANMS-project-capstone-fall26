import { Prisma, TransactionType, WalletBalanceBucket } from '@prisma/client';
import { FinancialLedgerService } from './financial-ledger.service';

describe('FinancialLedgerService', () => {
  const service = new FinancialLedgerService();
  const reference = {
    id: '28b2b124-12d2-47f8-881f-c3107ee71084',
    type: 'PAYOUT_REQUEST' as const,
  };
  const change = {
    bucket: WalletBalanceBucket.AVAILABLE,
    transactionType: TransactionType.PAYOUT_WITHDRAW,
    amount: new Prisma.Decimal('-200000.10'),
    balanceBefore: new Prisma.Decimal('500000.31'),
    balanceAfter: new Prisma.Decimal('300000.21'),
  };
  it('appends exact signed money and an object reference using the caller transaction', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'entry-id' });
    await service.appendEntry(
      { financialLedger: { create } } as unknown as Prisma.TransactionClient,
      'wallet-id',
      reference,
      change,
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        walletId: 'wallet-id',
        transactionType: TransactionType.PAYOUT_WITHDRAW,
        balanceBucket: WalletBalanceBucket.AVAILABLE,
        amount: change.amount,
        balanceBefore: change.balanceBefore,
        balanceAfter: change.balanceAfter,
        referenceId: reference.id,
        referenceType: reference.type,
      },
    });
  });
  it.each(['0', 'NaN', 'Infinity', '-0.001'])(
    'rejects invalid ledger amount %s without persistence',
    (amount) => {
      const create = jest.fn();
      expect(() =>
        service.appendEntry(
          {
            financialLedger: { create },
          } as unknown as Prisma.TransactionClient,
          'wallet-id',
          reference,
          { ...change, amount: new Prisma.Decimal(amount) },
        ),
      ).toThrow('invariant');
      expect(create).not.toHaveBeenCalled();
    },
  );
  it('refuses a balance mismatch rather than silently correcting it', () => {
    const create = jest.fn();
    expect(() =>
      service.appendEntry(
        { financialLedger: { create } } as unknown as Prisma.TransactionClient,
        'wallet-id',
        reference,
        { ...change, balanceAfter: new Prisma.Decimal('1') },
      ),
    ).toThrow('invariant');
    expect(create).not.toHaveBeenCalled();
  });
});

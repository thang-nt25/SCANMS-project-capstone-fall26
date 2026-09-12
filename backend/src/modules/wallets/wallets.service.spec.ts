import { Prisma } from '@prisma/client';
import { WalletBalanceInvariantError, WalletsService } from './wallets.service';
import { BadRequestException } from '@nestjs/common';

describe('WalletsService', () => {
  const collaboratorId = '28b2b124-12d2-47f8-881f-c3107ee71084';

  function createTransaction(pending: string, available: string) {
    let walletUpdateInput: unknown;
    const wallet = {
      id: 'wallet-id',
      collaboratorId,
      pendingBalance: new Prisma.Decimal(pending),
      availableBalance: new Prisma.Decimal(available),
      version: 1,
    };
    return {
      wallet,
      tx: {
        wallet: {
          upsert: jest.fn().mockResolvedValue(wallet),
          findUniqueOrThrow: jest.fn().mockResolvedValue(wallet),
          update: jest.fn((input: unknown) => {
            walletUpdateInput = input;
            return Promise.resolve(wallet);
          }),
        },
        $queryRaw: jest.fn((query: Prisma.Sql) => {
          void query;
          return Promise.resolve([{ id: wallet.id }]);
        }),
      },
      getWalletUpdateInput: () => walletUpdateInput,
    };
  }

  it('moves a mature commission from pending to available under a row lock', async () => {
    const service = new WalletsService();
    const { tx, getWalletUpdateInput } = createTransaction('500000', '100000');

    await service.releasePendingBalance(
      tx as unknown as Prisma.TransactionClient,
      collaboratorId,
      new Prisma.Decimal('150000'),
    );

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const update = getWalletUpdateInput() as {
      data: {
        pendingBalance: Prisma.Decimal;
        availableBalance: Prisma.Decimal;
        version: { increment: number };
      };
    };
    expect(update.data.pendingBalance.toString()).toBe('350000');
    expect(update.data.availableBalance.toString()).toBe('250000');
    expect(update.data.version).toEqual({ increment: 1 });
  });

  it('rejects a pending balance mismatch without updating the wallet', async () => {
    const service = new WalletsService();
    const { tx } = createTransaction('10000', '100000');

    await expect(
      service.reversePendingBalance(
        tx as unknown as Prisma.TransactionClient,
        collaboratorId,
        new Prisma.Decimal('15000'),
      ),
    ).rejects.toBeInstanceOf(WalletBalanceInvariantError);
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it('records approved clawback debt when available funds were already used', async () => {
    const service = new WalletsService();
    const { tx, getWalletUpdateInput } = createTransaction('0', '50000');

    await service.reverseAvailableBalance(
      tx as unknown as Prisma.TransactionClient,
      collaboratorId,
      new Prisma.Decimal('75000'),
    );

    const update = getWalletUpdateInput() as {
      data: { availableBalance: Prisma.Decimal };
    };
    expect(update.data.availableBalance.toString()).toBe('-25000');
  });

  it('locks before reading the balance and debits exact decimal money', async () => {
    const { tx, getWalletUpdateInput } = createTransaction(
      '500000',
      '300000.31',
    );
    await new WalletsService().debitAvailableBalanceForWithdrawal(
      tx as unknown as Prisma.TransactionClient,
      collaboratorId,
      new Prisma.Decimal('200000.10'),
    );
    const sql = tx.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain('FOR UPDATE');
    expect(sql.values).toEqual([collaboratorId]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.wallet.findUniqueOrThrow.mock.invocationCallOrder[0],
    );
    const update = getWalletUpdateInput() as {
      data: {
        availableBalance: Prisma.Decimal;
        pendingBalance?: Prisma.Decimal;
      };
    };
    expect(update.data.availableBalance.toFixed(2)).toBe('100000.21');
    expect(update.data.pendingBalance).toBeUndefined();
  });

  it('allows withdrawing the exact available balance without going negative', async () => {
    const { tx, getWalletUpdateInput } = createTransaction('0', '200000');
    await new WalletsService().debitAvailableBalanceForWithdrawal(
      tx as unknown as Prisma.TransactionClient,
      collaboratorId,
      new Prisma.Decimal('200000'),
    );
    const update = getWalletUpdateInput() as {
      data: { availableBalance: Prisma.Decimal };
    };
    expect(update.data.availableBalance.toFixed(2)).toBe('0.00');
  });

  it.each(['100000', '0', '-25000'])(
    'blocks insufficient or clawback-debt balance %s without an update',
    async (available) => {
      const { tx } = createTransaction('1000000', available);
      await expect(
        new WalletsService().debitAvailableBalanceForWithdrawal(
          tx as unknown as Prisma.TransactionClient,
          collaboratorId,
          new Prisma.Decimal('200000'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.wallet.update).not.toHaveBeenCalled();
    },
  );

  it.each(['0', '-1', 'NaN', 'Infinity', '0.001', '10000000000000'])(
    'rejects invalid monetary amount %s before touching the wallet',
    async (amount) => {
      const { tx } = createTransaction('0', '500000');
      await expect(
        new WalletsService().debitAvailableBalanceForWithdrawal(
          tx as unknown as Prisma.TransactionClient,
          collaboratorId,
          new Prisma.Decimal(amount),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.wallet.update).not.toHaveBeenCalled();
    },
  );
});

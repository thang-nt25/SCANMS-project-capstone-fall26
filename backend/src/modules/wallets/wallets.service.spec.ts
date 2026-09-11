import { Prisma } from '@prisma/client';
import { WalletBalanceInvariantError, WalletsService } from './wallets.service';

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
        $queryRaw: jest.fn().mockResolvedValue([{ id: wallet.id }]),
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
});

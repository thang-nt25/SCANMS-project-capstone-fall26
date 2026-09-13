import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  TransactionType,
  WalletBalanceBucket,
  Wallet,
  FinancialLedger,
} from '@prisma/client';
import { FinancialLedgerService } from './financial-ledger.service';
import type {
  LedgerReference,
  LedgerBalanceChange,
} from './financial-ledger.service';

export class WalletBalanceInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = WalletBalanceInvariantError.name;
  }
}

@Injectable()
export class WalletsService {
  constructor(private readonly ledgerService: FinancialLedgerService) {}

  /** The caller must create the payout request in this same transaction. */
  async debitAvailableBalanceForWithdrawal(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    if (
      !amount.isFinite() ||
      amount.lessThanOrEqualTo(0) ||
      amount.decimalPlaces() > 2 ||
      amount.greaterThan('9999999999999.99')
    ) {
      throw new BadRequestException('Số tiền rút không hợp lệ');
    }

    // lockWallet reads the balance only AFTER SELECT ... FOR UPDATE.
    // Competing withdrawals must wait and then see the committed balance.
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.availableBalance.lessThan(amount)) {
      throw new BadRequestException(
        'Số dư khả dụng không đủ để thực hiện rút tiền',
      );
    }

    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.AVAILABLE,
            TransactionType.PAYOUT_WITHDRAW,
            wallet.availableBalance,
            amount.negated(),
          ),
        ],
        storeId,
      )
    ).wallet;
  }

  async creditPendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.PENDING,
            TransactionType.COMMISSION_PENDING,
            wallet.pendingBalance,
            amount,
          ),
        ],
        storeId,
      )
    ).wallet;
  }

  async releasePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để duyệt hoa hồng`,
      );
    }

    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.PENDING,
            TransactionType.COMMISSION_APPROVED,
            wallet.pendingBalance,
            amount.negated(),
          ),
          this.buildChange(
            WalletBalanceBucket.AVAILABLE,
            TransactionType.COMMISSION_APPROVED,
            wallet.availableBalance,
            amount,
          ),
        ],
        storeId,
      )
    ).wallet;
  }

  async reversePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để thu hồi hoa hồng`,
      );
    }

    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.PENDING,
            TransactionType.REVERSAL,
            wallet.pendingBalance,
            amount.negated(),
          ),
        ],
        storeId,
      )
    ).wallet;
  }

  async reverseAvailableBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    // Keep FR-21's recoverable clawback debt behavior; withdrawals remain blocked.
    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.AVAILABLE,
            TransactionType.REVERSAL,
            wallet.availableBalance,
            amount.negated(),
          ),
        ],
        storeId,
      )
    ).wallet;
  }

  async creditAvailableBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    const result = await this.applyBalanceChanges(
      tx,
      wallet,
      reference,
      [
        this.buildChange(
          WalletBalanceBucket.AVAILABLE,
          TransactionType.COMMISSION_APPROVED,
          wallet.availableBalance,
          amount,
        ),
      ],
      storeId,
    );
    return { wallet: result.wallet, ledger: result.entries[0] };
  }

  private buildChange(
    bucket: WalletBalanceBucket,
    transactionType: TransactionType,
    balanceBefore: Prisma.Decimal,
    amount: Prisma.Decimal,
  ): LedgerBalanceChange {
    return {
      bucket,
      transactionType,
      balanceBefore,
      amount,
      balanceAfter: balanceBefore.plus(amount),
    };
  }

  private async applyBalanceChanges(
    tx: Prisma.TransactionClient,
    wallet: Wallet,
    reference: LedgerReference,
    changes: LedgerBalanceChange[],
    storeId?: string,
  ) {
    // Consistent lock order: global wallet first, then store wallet.
    const storeWallet = storeId
      ? await this.lockStoreWallet(tx, wallet.id, storeId)
      : null;
    const storeData: Prisma.StoreWalletUpdateInput = {
      version: { increment: 1 },
    };
    const storeBalances = changes.map((change) => {
      if (!storeWallet) return undefined;
      const before =
        change.bucket === WalletBalanceBucket.PENDING
          ? storeWallet.pendingBalance
          : storeWallet.availableBalance;
      const after = before.plus(change.amount);
      if (after.lessThan(0) && change.bucket === WalletBalanceBucket.PENDING) {
        throw new WalletBalanceInvariantError('Ví shop không đủ số dư chờ');
      }
      if (
        after.lessThan(0) &&
        change.transactionType === TransactionType.PAYOUT_WITHDRAW
      ) {
        throw new BadRequestException(
          'Số dư khả dụng tại shop không đủ để rút tiền',
        );
      }
      if (change.bucket === WalletBalanceBucket.PENDING)
        storeData.pendingBalance = after;
      else storeData.availableBalance = after;
      return {
        storeId: storeWallet.storeId,
        storeBalanceBefore: before,
        storeBalanceAfter: after,
      };
    });
    const data: Prisma.WalletUpdateInput = { version: { increment: 1 } };
    for (const change of changes) {
      if (change.bucket === WalletBalanceBucket.PENDING)
        data.pendingBalance = change.balanceAfter;
      else data.availableBalance = change.balanceAfter;
    }
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data,
    });
    if (storeWallet) {
      await tx.storeWallet.update({
        where: { id: storeWallet.id },
        data: storeData,
      });
    }
    const entries: FinancialLedger[] = [];
    for (const [index, change] of changes.entries()) {
      entries.push(
        await this.ledgerService.appendEntry(
          tx,
          wallet.id,
          reference,
          change,
          storeBalances[index],
        ),
      );
    }
    return { wallet: updatedWallet, entries };
  }

  private async lockWallet(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
  ) {
    await tx.wallet.upsert({
      where: { collaboratorId },
      update: {},
      create: {
        collaboratorId,
        availableBalance: new Prisma.Decimal(0),
        pendingBalance: new Prisma.Decimal(0),
      },
    });

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM wallets WHERE collaborator_id = ${collaboratorId}::uuid FOR UPDATE`,
    );

    return tx.wallet.findUniqueOrThrow({ where: { collaboratorId } });
  }

  private assertPositiveAmount(amount: Prisma.Decimal): void {
    if (
      !amount.isFinite() ||
      amount.lessThanOrEqualTo(0) ||
      amount.decimalPlaces() > 2
    ) {
      throw new WalletBalanceInvariantError(
        'Số tiền thay đổi số dư ví phải lớn hơn 0',
      );
    }
  }

  private async lockStoreWallet(
    tx: Prisma.TransactionClient,
    walletId: string,
    storeId: string,
  ) {
    await tx.storeWallet.upsert({
      where: { walletId_storeId: { walletId, storeId } },
      update: {},
      create: { walletId, storeId },
    });
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM store_wallets WHERE wallet_id = ${walletId}::uuid AND store_id = ${storeId}::uuid FOR UPDATE`,
    );
    return tx.storeWallet.findUniqueOrThrow({
      where: { walletId_storeId: { walletId, storeId } },
    });
  }

  async refundRejectedWithdrawal(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
    storeId: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        reference,
        [
          this.buildChange(
            WalletBalanceBucket.AVAILABLE,
            TransactionType.PAYOUT_REJECT_REFUND,
            wallet.availableBalance,
            amount,
          ),
        ],
        storeId,
      )
    ).wallet;
  }
}

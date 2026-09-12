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
      await this.applyBalanceChanges(tx, wallet, reference, [
        this.buildChange(
          WalletBalanceBucket.AVAILABLE,
          TransactionType.PAYOUT_WITHDRAW,
          wallet.availableBalance,
          amount.negated(),
        ),
      ])
    ).wallet;
  }

  async creditPendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    return (
      await this.applyBalanceChanges(tx, wallet, reference, [
        this.buildChange(
          WalletBalanceBucket.PENDING,
          TransactionType.COMMISSION_PENDING,
          wallet.pendingBalance,
          amount,
        ),
      ])
    ).wallet;
  }

  async releasePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để duyệt hoa hồng`,
      );
    }

    return (
      await this.applyBalanceChanges(tx, wallet, reference, [
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
      ])
    ).wallet;
  }

  async reversePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để thu hồi hoa hồng`,
      );
    }

    return (
      await this.applyBalanceChanges(tx, wallet, reference, [
        this.buildChange(
          WalletBalanceBucket.PENDING,
          TransactionType.REVERSAL,
          wallet.pendingBalance,
          amount.negated(),
        ),
      ])
    ).wallet;
  }

  async reverseAvailableBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    // Keep FR-21's recoverable clawback debt behavior; withdrawals remain blocked.
    return (
      await this.applyBalanceChanges(tx, wallet, reference, [
        this.buildChange(
          WalletBalanceBucket.AVAILABLE,
          TransactionType.REVERSAL,
          wallet.availableBalance,
          amount.negated(),
        ),
      ])
    ).wallet;
  }

  async creditAvailableBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
    reference: LedgerReference,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    const result = await this.applyBalanceChanges(tx, wallet, reference, [
      this.buildChange(
        WalletBalanceBucket.AVAILABLE,
        TransactionType.COMMISSION_APPROVED,
        wallet.availableBalance,
        amount,
      ),
    ]);
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
  ) {
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
    const entries: FinancialLedger[] = [];
    for (const change of changes) {
      entries.push(
        await this.ledgerService.appendEntry(tx, wallet.id, reference, change),
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
}

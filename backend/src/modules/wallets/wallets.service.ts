import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export class WalletBalanceInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = WalletBalanceInvariantError.name;
  }
}

@Injectable()
export class WalletsService {
  /** The caller must create the payout request in this same transaction. */
  async debitAvailableBalanceForWithdrawal(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
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

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: wallet.availableBalance.minus(amount),
        version: { increment: 1 },
      },
    });
  }

  async creditPendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: wallet.pendingBalance.plus(amount),
        version: { increment: 1 },
      },
    });
  }

  async releasePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để duyệt hoa hồng`,
      );
    }

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: wallet.pendingBalance.minus(amount),
        availableBalance: wallet.availableBalance.plus(amount),
        version: { increment: 1 },
      },
    });
  }

  async reversePendingBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (wallet.pendingBalance.lessThan(amount)) {
      throw new WalletBalanceInvariantError(
        `Ví ${wallet.id} không đủ số dư chờ để thu hồi hoa hồng`,
      );
    }

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: wallet.pendingBalance.minus(amount),
        version: { increment: 1 },
      },
    });
  }

  async reverseAvailableBalance(
    tx: Prisma.TransactionClient,
    collaboratorId: string,
    amount: Prisma.Decimal,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);

    return tx.wallet.update({
      where: { id: wallet.id },
      data: {
        // An approved commission can be clawed back after other payouts.
        // A negative available balance represents recoverable debt and blocks
        // future withdrawals until subsequent earnings offset it in FR-22.
        availableBalance: wallet.availableBalance.minus(amount),
        version: { increment: 1 },
      },
    });
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
    if (!amount.isPositive()) {
      throw new WalletBalanceInvariantError(
        'Số tiền thay đổi số dư ví phải lớn hơn 0',
      );
    }
  }
}

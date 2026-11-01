import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Prisma,
  TransactionType,
  WalletBalanceBucket,
  Wallet,
  FinancialLedger,
} from '@prisma/client';
import { FinancialLedgerService } from './financial-ledger.service';
import { PrismaService } from '../../core/database/prisma.service';
import { postFinance } from '../payouts/finance-posting';
import { walletBalanceConsistency } from './wallet-balance-consistency';
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
  constructor(
    private readonly ledgerService: FinancialLedgerService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

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
    if (wallet.earningsReviewRequired) {
      throw new BadRequestException('Số dư cũ cần được kế toán đối soát nguồn tiền trước khi rút');
    }
    const stores = await tx.storeWallet.findMany({
      where: { walletId: wallet.id },
      orderBy: { storeId: 'asc' },
    });
    if (walletBalanceConsistency(wallet, stores).requiresReview) {
      throw new BadRequestException('Số dư tổng và phân bổ gian hàng chưa khớp. Cần đối soát trước khi rút tiền.');
    }
    if (wallet.availableBalance.lessThan(amount)) {
      throw new BadRequestException(
        'Số dư khả dụng không đủ để thực hiện rút tiền',
      );
    }

    if (!storeId) {
      const allocated = stores.reduce(
        (sum, row) => sum.plus(row.availableBalance),
        new Prisma.Decimal(0),
      );
      let remaining = amount;
      let current = wallet;
      const unallocated = Prisma.Decimal.max(
        0,
        wallet.availableBalance.minus(allocated),
      );
      const chunks = [
        {
          storeId: undefined as string | undefined,
          availableBalance: unallocated,
        },
        ...stores,
      ];
      for (const chunk of chunks) {
        const debit = Prisma.Decimal.min(
          remaining,
          Prisma.Decimal.max(0, chunk.availableBalance),
        );
        if (debit.isZero()) continue;
        const result = await this.applyBalanceChanges(
          tx,
          current,
          reference,
          [
            this.buildChange(
              WalletBalanceBucket.AVAILABLE,
              TransactionType.PAYOUT_WITHDRAW,
              current.availableBalance,
              debit.negated(),
            ),
          ],
          chunk.storeId,
        );
        current = result.wallet;
        remaining = remaining.minus(debit);
        if (remaining.isZero()) return current;
      }
      throw new WalletBalanceInvariantError(
        'Không phân bổ được nguồn tiền chi trả',
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
    if (reference.type === 'TOPUP_PAYOS' || reference.type === 'TOPUP_DEMO')
      return this.creditShoppingBalance(tx, collaboratorId, amount, reference);
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
      else if (change.bucket === WalletBalanceBucket.SHOPPING)
        data.shoppingBalance = change.balanceAfter;
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
      const entry = await this.ledgerService.appendEntry(
          tx,
          wallet.id,
          reference,
          change,
          storeBalances[index],
        );
      entries.push(entry);
      // Every earnings movement has a balanced accounting counterpart. The
      // immutable ledger row supplies a unique key for partial refunds/deltas.
      let debit: string | undefined;
      let credit: string | undefined;
      if (change.bucket === WalletBalanceBucket.SHOPPING) {
        debit = change.amount.gt(0) ? (reference.type === 'ORDER_REFUND' ? 'CUSTOMER_REFUND_CLEARING' : 'CORPORATE_BANK') : 'CUSTOMER_FUNDS';
        credit = change.amount.gt(0) ? 'CUSTOMER_FUNDS' : 'SALES_CLEARING';
      } else if (change.transactionType === TransactionType.COMMISSION_PENDING) {
        debit = 'AFFILIATE_MARKETING_EXPENSE'; credit = 'AFFILIATE_ESCROW';
      } else if (change.transactionType === TransactionType.REVERSAL) {
        debit = change.bucket === WalletBalanceBucket.PENDING ? 'AFFILIATE_ESCROW' : 'PARTNER_EARNINGS_PAYABLE';
        credit = 'AFFILIATE_MARKETING_EXPENSE';
      } else if (change.transactionType === TransactionType.COMMISSION_APPROVED && reference.type !== 'MONTHLY_BONUS') {
        if (change.bucket === WalletBalanceBucket.PENDING) {
          debit = 'AFFILIATE_ESCROW'; credit = 'PARTNER_EARNINGS_PAYABLE';
        } else if (!changes.some(c => c.bucket === WalletBalanceBucket.PENDING)) {
          debit = 'AFFILIATE_MARKETING_EXPENSE'; credit = 'PARTNER_EARNINGS_PAYABLE';
        }
      }
      if (debit && credit) await postFinance(tx, entry.id, 'WALLET_MOVEMENT', debit, credit, change.amount.abs(), reference.type);
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
    storeId?: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, collaboratorId);
    if (!storeId) {
      const debits = await tx.financialLedger.findMany({
        where: {
          walletId: wallet.id,
          referenceId: reference.id,
          referenceType: 'PAYOUT_REQUEST',
          transactionType: TransactionType.PAYOUT_WITHDRAW,
        },
        orderBy: { createdAt: 'asc' },
      });
      if (
        !debits.length ||
        !debits
          .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0))
          .equals(amount.negated())
      )
        throw new WalletBalanceInvariantError(
          'Không khớp nguồn tiền yêu cầu hoàn',
        );
      let current = wallet;
      for (const debit of debits) {
        current = (
          await this.applyBalanceChanges(
            tx,
            current,
            reference,
            [
              this.buildChange(
                WalletBalanceBucket.AVAILABLE,
                TransactionType.PAYOUT_REJECT_REFUND,
                current.availableBalance,
                debit.amount.negated(),
              ),
            ],
            debit.storeId ?? undefined,
          )
        ).wallet;
      }
      return current;
    }
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

  /**
   * Trừ số dư ví khi khách hàng thanh toán đơn hàng (1-Click Wallet Checkout)
   */
  async debitAvailableBalanceForOrder(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
    orderId: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, userId);
    if (wallet.shoppingBalance.lessThan(amount)) {
      throw new BadRequestException(
        'Số dư ví SCANMS không đủ để thanh toán đơn hàng.',
      );
    }

    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        { id: orderId, type: 'ORDER_PAYMENT' },
        [
          this.buildChange(
            WalletBalanceBucket.SHOPPING,
            TransactionType.PAYOUT_WITHDRAW,
            wallet.shoppingBalance,
            amount.negated(),
          ),
        ],
      )
    ).wallet;
  }

  /**
   * Hoàn tiền siêu tốc vào ví SCANMS khi duyệt đổi trả / tranh chấp
   */
  async refundToWallet(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
    orderId: string,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, userId);
    return (
      await this.applyBalanceChanges(
        tx,
        wallet,
        { id: orderId, type: 'ORDER_REFUND' },
        [
          this.buildChange(
            WalletBalanceBucket.SHOPPING,
            TransactionType.COMMISSION_APPROVED,
            wallet.shoppingBalance,
            amount,
          ),
        ],
      )
    ).wallet;
  }

  async creditShoppingBalance(tx: Prisma.TransactionClient, userId: string, amount: Prisma.Decimal, reference: LedgerReference) {
    this.assertPositiveAmount(amount);
    const wallet = await this.lockWallet(tx, userId);
    const result = await this.applyBalanceChanges(tx, wallet, reference, [
      this.buildChange(WalletBalanceBucket.SHOPPING, TransactionType.COMMISSION_APPROVED, wallet.shoppingBalance, amount),
    ]);
    return { wallet: result.wallet, ledger: result.entries[0] };
  }

  /**
   * Nạp tiền giả lập Sandbox / Demo (Phục vụ kiểm thử & trải nghiệm thanh toán giỏ hàng)
   */
  demoTopUpAvailability() {
    return { available: process.env.ALLOW_DEMO_WALLET_TOPUP === 'true' && process.env.NODE_ENV !== 'production' };
  }

  async topUpDemo(userId: string, amountNum: number) {
    if (!this.demoTopUpAvailability().available)
      throw new ForbiddenException('Nạp tiền thử nghiệm đã bị vô hiệu hóa');
    if (!this.prisma) {
      throw new Error('PrismaService is required for topUpDemo');
    }
    if (amountNum <= 0 || amountNum > 50000000) {
      throw new BadRequestException(
        'Số tiền nạp thử nghiệm phải lớn hơn 0 và tối đa 50.000.000đ',
      );
    }
    const amount = new Prisma.Decimal(amountNum);
    return this.prisma.$transaction(async (tx) => {
      const res = await this.creditAvailableBalance(tx, userId, amount, {
        id: randomUUID(),
        type: 'TOPUP_DEMO',
      });
      return {
        success: true,
        message: `Nạp thành công ${amountNum.toLocaleString('vi-VN')} ₫ vào Ví SCANMS!`,
        availableBalance: res.wallet.shoppingBalance.toFixed(2),
        walletId: res.wallet.id,
      };
    });
  }
}

import {
  Prisma,
  type TransactionType,
  type WalletBalanceBucket,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PayoutTaxService } from '../../src/modules/payouts/payout-tax.service';
import type { SeedContext, SeedDataset } from './seed.types';
import { amount, assetUrl, assertSeed, daysFrom, seedId } from './seed.helpers';

interface BalanceEvent {
  key: string;
  userId: string;
  storeId?: string;
  bucket: WalletBalanceBucket;
  type: TransactionType;
  referenceId: string;
  referenceType: string;
  amount: number;
  at: Date;
}

export function buildFinance(data: SeedDataset, context: SeedContext): void {
  const events: BalanceEvent[] = [];
  data.users
    .filter((user) => user.role === 'CUSTOMER')
    .forEach((user, index) => {
      events.push({
        key: `topup:${index}`,
        userId: user.id!,
        bucket: 'AVAILABLE',
        type: 'COMMISSION_APPROVED',
        referenceId: seedId(`topup:${index}`),
        referenceType: 'TOPUP_DEMO',
        amount: index < 4 ? 100_000_000 : 10_000_000,
        at: daysFrom(context, -46),
      });
    });
  data.payments
    .filter((payment) => payment.status === 'SUCCESS')
    .forEach((payment) => {
      const order = data.orders.find((row) => row.id === payment.orderId)!;
      events.push({
        key: `payment:${order.id!}`,
        userId: order.customerId!,
        bucket: 'AVAILABLE',
        type: 'PAYOUT_WITHDRAW',
        referenceId: order.id!,
        referenceType: 'ORDER_PAYMENT',
        amount: -amount(payment.amount),
        at: new Date(order.createdAt!),
      });
    });
  data.commissions.forEach((commission) => {
    const order = data.orders.find((row) => row.id === commission.orderId)!;
    const pending: BalanceEvent = {
      key: `commission:${commission.id!}:pending`,
      userId: commission.collaboratorId,
      storeId: order.storeId,
      bucket: 'PENDING',
      type: 'COMMISSION_PENDING',
      referenceId: commission.id!,
      referenceType: 'COMMISSION',
      amount: amount(commission.commissionAmount),
      at: new Date(commission.createdAt!),
    };
    events.push(pending);
    if (commission.status === 'APPROVED') {
      const at = new Date(commission.approvedAt!);
      events.push(
        {
          ...pending,
          key: `commission:${commission.id!}:release`,
          type: 'COMMISSION_APPROVED',
          amount: -pending.amount,
          at,
        },
        {
          ...pending,
          key: `commission:${commission.id!}:available`,
          bucket: 'AVAILABLE',
          type: 'COMMISSION_APPROVED',
          at,
        },
      );
    }
  });

  const tax = new PayoutTaxService();
  for (let index = 0; index < 2; index++) {
    const id = seedId(`payout:${index}`);
    const profile = data.profiles[index];
    const processedAt = daysFrom(context, -5);
    const gross = 2_000_000;
    const taxResult = tax.calculateTax(new Prisma.Decimal(gross));
    data.payouts.push({
      id,
      collaboratorId: profile.userId,
      storeId: seedId(`store:${index}`),
      amount: gross,
      taxAmount: taxResult.taxAmount,
      netAmount: taxResult.netAmount,
      status: 'APPROVED',
      bankName: profile.bankName,
      bankAccountNumber: profile.bankAccountNumber,
      bankAccountName: profile.bankAccountName,
      bankRefCode: `DEMO-PAYOUT-${index + 1}`,
      approvedById: seedId(`shop-owner:${index}`),
      proofImageUrl: assetUrl(context, 'seed/payout-demo.svg'),
      proofImageFormat: 'svg',
      proofImagePublicId: `seed-demo/not-a-bank-receipt/${id}`,
      proofImageSha256: createHash('sha256')
        .update(`SYNTHETIC_CAPSTONE:${id}`)
        .digest('hex'),
      processedAt,
      createdAt: daysFrom(context, -6),
    });
    events.push({
      key: `payout:${index}`,
      userId: profile.userId,
      storeId: seedId(`store:${index}`),
      bucket: 'AVAILABLE',
      type: 'PAYOUT_WITHDRAW',
      referenceId: id,
      referenceType: 'PAYOUT_REQUEST',
      amount: -gross,
      at: processedAt,
    });
  }

  const balances = new Map<string, number>();
  const storeBalances = new Map<string, number>();
  const versions = new Map<string, number>();
  events.sort(
    (a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key),
  );
  for (const event of events) {
    const walletId = seedId(`wallet:${event.userId}`);
    const balanceKey = `${walletId}:${event.bucket}`;
    const balanceBefore = balances.get(balanceKey) ?? 0;
    const balanceAfter = new Prisma.Decimal(balanceBefore)
      .plus(event.amount)
      .toNumber();
    assertSeed(
      balanceAfter >= 0,
      `insufficient ${event.bucket} funds at ${event.key}`,
    );
    balances.set(balanceKey, balanceAfter);
    versions.set(walletId, (versions.get(walletId) ?? 0) + 1);
    const storeKey = event.storeId
      ? `${walletId}:${event.storeId}:${event.bucket}`
      : null;
    const storeBalanceBefore = storeKey
      ? (storeBalances.get(storeKey) ?? 0)
      : undefined;
    const storeBalanceAfter =
      storeBalanceBefore !== undefined
        ? new Prisma.Decimal(storeBalanceBefore).plus(event.amount).toNumber()
        : undefined;
    if (storeKey && storeBalanceAfter !== undefined) {
      assertSeed(
        storeBalanceAfter >= 0,
        `insufficient store funds at ${event.key}`,
      );
      storeBalances.set(storeKey, storeBalanceAfter);
    }
    data.ledgers.push({
      id: seedId(`ledger:${event.key}`),
      walletId,
      transactionType: event.type,
      balanceBucket: event.bucket,
      amount: event.amount,
      balanceBefore,
      balanceAfter,
      storeId: event.storeId,
      storeBalanceBefore,
      storeBalanceAfter,
      referenceId: event.referenceId,
      referenceType: event.referenceType,
      createdAt: event.at,
    });
  }

  data.users.forEach((user) => {
    const walletId = seedId(`wallet:${user.id!}`);
    data.wallets.push({
      id: walletId,
      collaboratorId: user.id!,
      availableBalance: balances.get(`${walletId}:AVAILABLE`) ?? 0,
      pendingBalance: balances.get(`${walletId}:PENDING`) ?? 0,
      version: 1 + (versions.get(walletId) ?? 0),
    });
  });
  data.collaborations.forEach((collaboration) => {
    const walletId = seedId(`wallet:${collaboration.collaboratorId}`);
    data.storeWallets.push({
      id: seedId(`store-wallet:${collaboration.id!}`),
      walletId,
      storeId: collaboration.storeId,
      availableBalance:
        storeBalances.get(`${walletId}:${collaboration.storeId}:AVAILABLE`) ??
        0,
      pendingBalance:
        storeBalances.get(`${walletId}:${collaboration.storeId}:PENDING`) ?? 0,
      version: 1,
    });
  });
  data.profiles.forEach((profile) => {
    const commissions = data.commissions.filter(
      (row) => row.collaboratorId === profile.userId,
    );
    profile.totalEarnedCommission = commissions.reduce(
      (total, row) => total + amount(row.commissionAmount),
      0,
    );
    profile.totalOrdersReferred = data.orders.filter(
      (row) => row.attributedCollaboratorId === profile.userId,
    ).length;
  });
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { KycStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import {
  PAYOUT_TAX_RATE,
  PAYOUT_TAX_THRESHOLD,
  PAYOUT_TAX_BRACKETS,
  PAYOUT_TAX_POLICY,
  payoutTaxMonth,
} from '../payouts/payout-tax.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';
import { walletBalanceConsistency } from './wallet-balance-consistency';
import { isUUID } from 'class-validator';

@Injectable()
export class WalletSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: WithdrawalPolicyService,
  ) {}

  async getMyWallet(collaboratorId: string) {
    const taxPeriod = payoutTaxMonth();
    const monthlyWithdrawals = await this.prisma.payoutRequest.aggregate({
      where: { collaboratorId, status: { in: ['PENDING', 'PROCESSING', 'APPROVED'] }, createdAt: { gte: taxPeriod.start, lt: taxPeriod.end } },
      _sum: { amount: true },
    });
    const [wallet, profile, partnerships, activeDeals, heldDealCommissions] = await Promise.all([
      this.prisma.wallet.upsert({
        where: { collaboratorId },
        update: {},
        create: {
          collaboratorId,
          availableBalance: new Prisma.Decimal(0),
          pendingBalance: new Prisma.Decimal(0),
        },
        include: {
          storeWallets: {
            include: {
              store: {
                select: {
                  name: true,
                  isDeleted: true,
                  owner: { select: { isActive: true, isDeleted: true } },
                },
              },
            },
            orderBy: { storeId: 'asc' },
          },
        },
      }),
      this.prisma.collaboratorProfile.findUnique({
        where: { userId: collaboratorId },
        select: {
          kycStatus: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      }),
      this.prisma.storeCollaborator.findMany({
        where: { collaboratorId, store: { isDeleted: false } },
        select: { storeId: true, status: true, requestedByKol: true,
          store: { select: { name: true, logoUrl: true } } },
        orderBy: { store: { name: 'asc' } },
      }),
      (this.prisma as any).exclusiveDealProposal?.findMany
        ? (this.prisma as any).exclusiveDealProposal.findMany({
            where: { collaboratorId, status: 'APPROVED' },
            select: {
              id: true,
              storeId: true,
              store: { select: { id: true, name: true, logoUrl: true } },
              product: { select: { id: true, title: true, imageUrl: true } },
              proposedCommissionRate: true,
              approvedCommissionRate: true,
              targetOrders: true,
              targetRevenue: true,
              commitmentStartedAt: true,
              commitmentEndsAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      this.prisma.commission?.findMany
        ? this.prisma.commission.findMany({
            where: { collaboratorId, dealBonusStatus: 'PENDING_KPI', dealBonusAmount: { gt: 0 } },
            select: { dealBonusAmount: true, order: { select: { storeId: true } } },
          })
        : Promise.resolve(null),
    ]);
    const heldDealByStore = new Map<string, Prisma.Decimal>();
    for (const commission of heldDealCommissions ?? []) {
      const storeId = commission.order.storeId;
      heldDealByStore.set(storeId, (heldDealByStore.get(storeId) ?? new Prisma.Decimal(0)).plus(commission.dealBonusAmount ?? 0));
    }
    const allocatedDealBalance = [...heldDealByStore.values()].reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));

    const hasBankAccount = Boolean(
      profile?.bankName.trim() &&
      profile.bankAccountNumber.trim() &&
      profile.bankAccountName.trim(),
    );

    const balanceConsistency = walletBalanceConsistency(wallet, wallet.storeWallets);
    const earningsReviewRequired = Boolean(wallet.earningsReviewRequired || balanceConsistency.requiresReview);

    let lockedPayoutBalance = '0.00';
    if (this.prisma.payoutRequest && typeof this.prisma.payoutRequest.aggregate === 'function') {
      const pendingPayoutAggregate = await this.prisma.payoutRequest.aggregate({
        where: {
          collaboratorId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
        _sum: {
          amount: true,
        },
      });
      lockedPayoutBalance = pendingPayoutAggregate._sum?.amount?.toFixed(2) ?? '0.00';
    }

    return {
      lockedPayoutBalance,
      balanceConsistency,
      cooperationStores: partnerships.map((partnership) => {
        const balance = wallet.storeWallets.find((item) => item.storeId === partnership.storeId);
        return {
          storeId: partnership.storeId,
          storeName: partnership.store.name,
          logoUrl: partnership.store.logoUrl,
          status: partnership.status,
          requestedByKol: partnership.requestedByKol,
          availableBalance: balance?.availableBalance.toFixed(2) ?? '0.00',
          pendingBalance: balance?.pendingBalance.toFixed(2) ?? '0.00',
          hasWallet: Boolean(balance),
          conditionalDealEscrowBalance: heldDealCommissions === null ? undefined : (heldDealByStore.get(partnership.storeId) ?? new Prisma.Decimal(0)).toFixed(2),
        };
      }),
      pendingBalance: wallet?.pendingBalance.toFixed(2) ?? '0.00',
      availableBalance: wallet?.availableBalance.toFixed(2) ?? '0.00',
      shoppingBalance: wallet?.shoppingBalance?.toFixed(2) ?? '0.00',
      conditionalDealEscrowBalance: (wallet as any)?.conditionalDealEscrowBalance?.toFixed(2) ?? '0.00',
      dealBalanceConsistency: heldDealCommissions === null ? undefined : {
        allocatedBalance: allocatedDealBalance.toFixed(2),
        requiresReview: !allocatedDealBalance.equals((wallet as any)?.conditionalDealEscrowBalance ?? 0),
      },
      earningsReviewRequired,
      stores: (wallet?.storeWallets ?? []).map((balance) => ({
        storeId: balance.storeId,
        storeName: balance.store.name,
        availableBalance: Prisma.Decimal.min(
          balance.availableBalance,
          wallet?.availableBalance ?? new Prisma.Decimal(0),
        ).toFixed(2),
        pendingBalance: balance.pendingBalance.toFixed(2),
        conditionalDealEscrowBalance: heldDealCommissions === null ? undefined : (heldDealByStore.get(balance.storeId) ?? new Prisma.Decimal(0)).toFixed(2),
        isActive:
          !balance.store.isDeleted &&
          balance.store.owner.isActive &&
          !balance.store.owner.isDeleted,
      })),
      unallocatedAvailableBalance: (
        wallet?.availableBalance ?? new Prisma.Decimal(0)
      )
        .minus(
          (wallet?.storeWallets ?? []).reduce(
            (sum, item) => sum.plus(item.availableBalance),
            new Prisma.Decimal(0),
          ),
        )
        .toFixed(2),
      unallocatedPendingBalance: (
        wallet?.pendingBalance ?? new Prisma.Decimal(0)
      )
        .minus(
          (wallet?.storeWallets ?? []).reduce(
            (sum, item) => sum.plus(item.pendingBalance),
            new Prisma.Decimal(0),
          ),
        )
        .toFixed(2),
      minimumWithdrawalAmount: this.policy.minimumAmount.toFixed(2),
      withdrawalTaxPolicy: {
        threshold: PAYOUT_TAX_THRESHOLD,
        rate: PAYOUT_TAX_RATE,
        policy: PAYOUT_TAX_POLICY,
        month: taxPeriod.month,
        monthlyGross: (monthlyWithdrawals._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        brackets: PAYOUT_TAX_BRACKETS,
      },
      kycStatus: profile?.kycStatus ?? KycStatus.UNVERIFIED,
      canWithdraw:
        !earningsReviewRequired &&
        profile?.kycStatus === KycStatus.VERIFIED &&
        hasBankAccount &&
        Boolean(
          wallet?.availableBalance.greaterThanOrEqualTo(
            this.policy.minimumAmount,
          ),
        ),
      bankAccount:
        hasBankAccount && profile
          ? {
              bankName: profile.bankName,
              maskedAccountNumber: `••••${profile.bankAccountNumber.slice(-4)}`,
              accountName: profile.bankAccountName,
            }
          : null,
      activeDeals: (activeDeals || []).map((deal: any) => ({
        id: deal.id,
        storeId: deal.storeId,
        store: deal.store,
        product: deal.product,
        proposedCommissionRate: Number(deal.proposedCommissionRate ?? 10),
        approvedCommissionRate: Number(deal.approvedCommissionRate ?? 10),
        bonusRate: Math.max(0, Number(deal.approvedCommissionRate ?? 10) - 10),
        targetOrders: deal.targetOrders ?? null,
        targetRevenue: deal.targetRevenue ? Number(deal.targetRevenue) : null,
        commitmentStartedAt: deal.commitmentStartedAt ? deal.commitmentStartedAt.toISOString() : null,
        commitmentEndsAt: deal.commitmentEndsAt ? deal.commitmentEndsAt.toISOString() : null,
      })),
    };
  }

  async getMyLedger(collaboratorId: string, query: QueryLedgerDto) {
    const where: Prisma.FinancialLedgerWhereInput = { wallet: { collaboratorId },
      ...(query.transactionType ? { transactionType: query.transactionType } : {}),
      ...(query.balanceBucket ? { balanceBucket: query.balanceBucket } : {}),
      ...(query.days ? { createdAt: { gte: new Date(Date.now() - query.days * 86400000) } } : {}),
    };
    const search = query.search?.trim();
    if (search) {
      const matchingOrders = await this.prisma.order.findMany({
        where: { externalOrderSn: { contains: search, mode: 'insensitive' }, OR: [{ customerId: collaboratorId }, { attributedCollaboratorId: collaboratorId }, { commissions: { some: { collaboratorId } } }] },
        select: { id: true },
      });
      const orderIds = matchingOrders.map(order => order.id);
      const commissions = orderIds.length ? await this.prisma.commission.findMany({ where: { collaboratorId, orderId: { in: orderIds } }, select: { id: true } }) : [];
      const references = [...orderIds, ...commissions.map(commission => commission.id)];
      where.OR = [{ referenceId: { in: references } }, ...(isUUID(search) ? [{ id: search }, { referenceId: search }] : [])];
    }
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.financialLedger.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialLedger.count({ where }),
    ]);
    // Resolve only references on this owner's page, in batches. No customer or bank details.
    const referenceIds = (...types: string[]) => [...new Set(entries
      .filter(entry => entry.referenceId && types.includes(entry.referenceType ?? ''))
      .map(entry => entry.referenceId!))];
    const commissionIds = referenceIds('COMMISSION', 'ORDER_REFUND');
    const payoutIds = referenceIds('PAYOUT_REQUEST');
    const bonusIds = referenceIds('MONTHLY_BONUS');
    const orderIds = referenceIds('ORDER_PAYMENT', 'ORDER_REFUND', 'RECONCILIATION_ORDER');
    const refundIds = referenceIds('ORDER_REFUND');
    const topUpIds = referenceIds('TOPUP_PAYOS');
    const withdrawalIds = referenceIds('CUSTOMER_WITHDRAWAL', 'CUSTOMER_WITHDRAWAL_REFUND');
    const storeIds = [...new Set(entries.map(entry => entry.storeId).filter((id): id is string => Boolean(id)))];
    const orderSelect = { id: true, externalOrderSn: true, store: { select: { name: true } } } as const;
    const ownOrder: Prisma.OrderWhereInput = { OR: [
      { customerId: collaboratorId }, { attributedCollaboratorId: collaboratorId },
      { commissions: { some: { collaboratorId } } },
    ] };
    const queryWhen = <T>(ids: string[], query: () => PromiseLike<T[]>): Promise<T[]> =>
      ids.length ? Promise.resolve(query()) : Promise.resolve([]);
    const [commissions, payouts, bonuses, orders, refunds, stores, topUps, withdrawals] = await Promise.all([
      queryWhen(commissionIds, () => this.prisma.commission.findMany({
        where: { id: { in: commissionIds }, collaboratorId },
        select: { id: true, order: { select: orderSelect } },
      })),
      queryWhen(payoutIds, () => this.prisma.payoutRequest.findMany({
        where: { id: { in: payoutIds }, collaboratorId },
        select: { id: true, store: { select: { name: true } } },
      })),
      queryWhen(bonusIds, () => this.prisma.monthlyBonusResult.findMany({
        where: { id: { in: bonusIds }, collaboratorId },
        select: { id: true, yearMonth: true, store: { select: { name: true } } },
      })),
      queryWhen(orderIds, () => this.prisma.order.findMany({
        where: { id: { in: orderIds }, ...ownOrder }, select: orderSelect,
      })),
      queryWhen(refundIds, () => this.prisma.orderRefund.findMany({
        where: { id: { in: refundIds }, order: ownOrder },
        select: { id: true, order: { select: orderSelect } },
      })),
      queryWhen(storeIds, () => this.prisma.store.findMany({
        where: { id: { in: storeIds } }, select: { id: true, name: true },
      })),
      queryWhen(topUpIds, () => this.prisma.walletTopUp.findMany({
        where: { id: { in: topUpIds }, userId: collaboratorId },
        select: { id: true, orderCode: true },
      })),
      queryWhen(withdrawalIds, () => this.prisma.customerWithdrawal.findMany({
        where: { id: { in: withdrawalIds }, userId: collaboratorId },
        select: { id: true, status: true, processedAt: true },
      })),
    ]);
    type ReferenceDetails = { storeName: string | null; orderId: string | null; orderCode: string | null; period: string | null; topUpCode?: string; withdrawalStatus?: string; processedAt?: Date | null };
    const details = new Map<string, ReferenceDetails>();
    withdrawals.forEach(withdrawal => {
      const value: ReferenceDetails = { storeName: null, orderId: null, orderCode: null, period: null, withdrawalStatus: withdrawal.status, processedAt: withdrawal.processedAt };
      details.set(`CUSTOMER_WITHDRAWAL:${withdrawal.id}`, value);
      details.set(`CUSTOMER_WITHDRAWAL_REFUND:${withdrawal.id}`, value);
    });
    topUps.forEach(topUp => details.set(`TOPUP_PAYOS:${topUp.id}`, {
      storeName: null, orderId: null, orderCode: null, period: null, topUpCode: topUp.orderCode.toString(),
    }));
    const forOrder = (order: { id: string; externalOrderSn: string; store: { name: string } }): ReferenceDetails => ({
      storeName: order.store.name, orderId: order.id, orderCode: order.externalOrderSn, period: null,
    });
    orders.forEach(order => {
      details.set(`ORDER_PAYMENT:${order.id}`, forOrder(order));
      details.set(`RECONCILIATION_ORDER:${order.id}`, forOrder(order));
      details.set(`ORDER_REFUND:${order.id}`, forOrder(order));
    });
    commissions.forEach(commission => {
      details.set(`COMMISSION:${commission.id}`, forOrder(commission.order));
      // Older refund entries reference the commission instead of an OrderRefund.
      details.set(`ORDER_REFUND:${commission.id}`, forOrder(commission.order));
    });
    refunds.forEach(refund => details.set(`ORDER_REFUND:${refund.id}`, forOrder(refund.order)));
    payouts.forEach(payout => details.set(`PAYOUT_REQUEST:${payout.id}`, {
      storeName: payout.store?.name ?? null, orderId: null, orderCode: null, period: null,
    }));
    bonuses.forEach(bonus => details.set(`MONTHLY_BONUS:${bonus.id}`, {
      storeName: bonus.store.name, orderId: null, orderCode: null, period: bonus.yearMonth,
    }));
    const storeNames = new Map(stores.map(store => [store.id, store.name] as const));
    return {
      entries: entries.map((entry) => ({
        ...entry,
        referenceDetails: details.get(`${entry.referenceType}:${entry.referenceId}`) ??
          (entry.storeId && storeNames.has(entry.storeId) ? {
            storeName: storeNames.get(entry.storeId)!, orderId: null, orderCode: null, period: null,
          } : null),
        amount: entry.amount.toFixed(2),
        balanceBefore: entry.balanceBefore.toFixed(2),
        balanceAfter: entry.balanceAfter.toFixed(2),
        storeBalanceBefore: entry.storeBalanceBefore?.toFixed(2) ?? null,
        storeBalanceAfter: entry.storeBalanceAfter?.toFixed(2) ?? null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateBankAccount(
    collaboratorId: string,
    dto: { bankName: string; bankAccountNumber: string; bankAccountName: string },
  ) {
    if (
      !dto.bankName?.trim() ||
      !dto.bankAccountNumber?.trim() ||
      !dto.bankAccountName?.trim()
    ) {
      throw new BadRequestException('Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.');
    }
    await this.prisma.collaboratorProfile.upsert({
      where: { userId: collaboratorId },
      create: {
        userId: collaboratorId,
        idCardNumber: '',
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
      },
      update: {
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
        kycStatus: KycStatus.UNVERIFIED,
      },
    });
    return { success: true, message: 'Đã cập nhật tài khoản nhận tiền. Vui lòng nộp lại hồ sơ eKYC để xác minh trước khi rút thu nhập.' };
  }

  async disconnectBankAccount(collaboratorId: string) {
    await this.prisma.collaboratorProfile.updateMany({
      where: { userId: collaboratorId },
      data: {
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
        kycStatus: KycStatus.UNVERIFIED,
      },
    });
    return { success: true, message: 'Đã ngừng sử dụng tài khoản nhận tiền.' };
  }
}


import { Injectable, BadRequestException } from '@nestjs/common';
import { KycStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import {
  PAYOUT_TAX_RATE,
  PAYOUT_TAX_THRESHOLD,
} from '../payouts/payout-tax.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';

@Injectable()
export class WalletSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: WithdrawalPolicyService,
  ) {}

  async getMyWallet(collaboratorId: string) {
    const [wallet, profile, partnerships] = await Promise.all([
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
    ]);

    const hasBankAccount = Boolean(
      profile?.bankName.trim() &&
      profile.bankAccountNumber.trim() &&
      profile.bankAccountName.trim(),
    );

    return {
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
        };
      }),
      pendingBalance: wallet?.pendingBalance.toFixed(2) ?? '0.00',
      availableBalance: wallet?.availableBalance.toFixed(2) ?? '0.00',
      stores: (wallet?.storeWallets ?? []).map((balance) => ({
        storeId: balance.storeId,
        storeName: balance.store.name,
        availableBalance: balance.availableBalance.toFixed(2),
        pendingBalance: balance.pendingBalance.toFixed(2),
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
      },
      kycStatus: profile?.kycStatus ?? KycStatus.UNVERIFIED,
      canWithdraw:
        profile?.kycStatus === KycStatus.VERIFIED &&
        hasBankAccount &&
        Boolean(
          wallet?.storeWallets.some(
            (balance) =>
              !balance.store.isDeleted &&
              balance.store.owner.isActive &&
              !balance.store.owner.isDeleted &&
              balance.availableBalance.greaterThanOrEqualTo(
                this.policy.minimumAmount,
              ),
          ),
        ) &&
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
    };
  }

  async getMyLedger(collaboratorId: string, query: QueryLedgerDto) {
    const where = { wallet: { collaboratorId } };
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
    const orderIds = referenceIds('ORDER_PAYMENT', 'ORDER_REFUND');
    const refundIds = referenceIds('ORDER_REFUND');
    const storeIds = [...new Set(entries.map(entry => entry.storeId).filter((id): id is string => Boolean(id)))];
    const orderSelect = { id: true, externalOrderSn: true, store: { select: { name: true } } } as const;
    const ownOrder: Prisma.OrderWhereInput = { OR: [
      { customerId: collaboratorId }, { attributedCollaboratorId: collaboratorId },
      { commissions: { some: { collaboratorId } } },
    ] };
    const queryWhen = <T>(ids: string[], query: () => PromiseLike<T[]>): Promise<T[]> =>
      ids.length ? Promise.resolve(query()) : Promise.resolve([]);
    const [commissions, payouts, bonuses, orders, refunds, stores] = await Promise.all([
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
    ]);
    type ReferenceDetails = { storeName: string | null; orderId: string | null; orderCode: string | null; period: string | null };
    const details = new Map<string, ReferenceDetails>();
    const forOrder = (order: { id: string; externalOrderSn: string; store: { name: string } }): ReferenceDetails => ({
      storeName: order.store.name, orderId: order.id, orderCode: order.externalOrderSn, period: null,
    });
    orders.forEach(order => {
      details.set(`ORDER_PAYMENT:${order.id}`, forOrder(order));
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
      },
    });
    return { success: true, message: 'Đã cập nhật thông tin tài khoản nhận tiền thành công.' };
  }

  async disconnectBankAccount(collaboratorId: string) {
    await this.prisma.collaboratorProfile.updateMany({
      where: { userId: collaboratorId },
      data: {
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
      },
    });
    return { success: true, message: 'Đã ngừng sử dụng tài khoản nhận tiền.' };
  }
}


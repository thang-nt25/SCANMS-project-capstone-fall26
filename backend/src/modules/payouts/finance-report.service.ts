import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { COMMISSION_HOLD_DAYS } from '../commissions/commission.constants';
import { cleanGoodsRevenue } from './finance-revenue';

@Injectable()
export class FinanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  async storePnl(storeId: string, userId: string, role: UserRole) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, isDeleted: false },
      select: { id: true, ownerId: true, name: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy nhãn hàng');
    if (role === UserRole.SHOP_MANAGER) {
      const staff = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { storeId: true },
      });
      if (store.ownerId !== userId && staff?.storeId !== storeId)
        throw new ForbiddenException('Không được xem tài chính nhãn hàng khác');
    }
    const [
      orders,
      commissions,
      bonuses,
      samples,
      costs,
      sampleRequests,
      bonusClawbacks,
      unrecognizedCommissions,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId, status: 'COMPLETED' },
      }),
      this.prisma.commission.aggregate({
        where: { order: { storeId, status: 'COMPLETED' }, status: { not: 'REVERSED' } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.monthlyBonusResult.aggregate({
        where: { storeId, status: 'PAID' },
        _sum: { bonusAmount: true },
      }),
      this.prisma.sampleShippingCharge.aggregate({
        where: { storeId, payer: 'SHOP' },
        _sum: { amount: true },
      }),
      this.prisma.financeCostEntry.findMany({ where: { storeId } }),
      this.prisma.sampleProductRequest.findMany({
        where: { product: { storeId }, trackingNumber: { not: null } },
        select: { id: true },
      }),
      this.prisma.bonusAdjustment.aggregate({
        where: {
          storeId,
          status: 'APPLIED',
          originalSettlement: { status: 'PAID' },
        },
        _sum: { adjustmentAmount: true },
      }),
      this.prisma.commission.aggregate({
        where: { order: { storeId, status: { not: 'COMPLETED' } }, status: { not: 'REVERSED' } },
        _sum: { commissionAmount: true },
      }),
    ]);
    const zero = new Prisma.Decimal(0);
    const netRevenue = orders.reduce(
      (sum, order) => sum.plus(cleanGoodsRevenue(order)),
      zero,
    );
    const commission = commissions._sum.commissionAmount ?? zero;
    const bonus = (bonuses._sum.bonusAmount ?? zero).plus(
      bonusClawbacks._sum.adjustmentAmount ?? 0,
    );
    const shipping = samples._sum.amount ?? zero;
    const costBySubject = new Map(
      costs.map((row) => [`${row.subjectType}:${row.subjectId}`, row.amount]),
    );
    const cogsComplete = orders.every((order) =>
      costBySubject.has(`ORDER:${order.id}`),
    );
    const samplesComplete = sampleRequests.every((sample) =>
      costBySubject.has(`SAMPLE:${sample.id}`),
    );
    const cogs = orders
      .reduce((sum, order) => {
        const amount = costBySubject.get(`ORDER:${order.id}`) ?? zero;
        const retained = order.finalAmount.gt(0)
          ? Prisma.Decimal.max(
              0,
              order.finalAmount.minus(order.refundedAmount),
            ).div(order.finalAmount)
          : zero;
        return sum.plus(amount.mul(retained));
      }, zero)
      .toDecimalPlaces(2);
    const sampleProductCost = sampleRequests.reduce(
      (sum, sample) => sum.plus(costBySubject.get(`SAMPLE:${sample.id}`) ?? 0),
      zero,
    );
    const marketing = commission
      .plus(bonus)
      .plus(shipping)
      .plus(sampleProductCost);
    return {
      storeId,
      storeName: store.name,
      scope: 'ALL_TIME',
      recognitionBasis: 'COMPLETED_ORDERS',
      unrecognizedCommissions: (unrecognizedCommissions._sum.commissionAmount ?? zero).toFixed(2),
      netRevenue: netRevenue.toFixed(2),
      commissions: commission.toFixed(2),
      monthlyBonuses: bonus.toFixed(2),
      sampleShipping: shipping.toFixed(2),
      knownMarketingExpense: marketing.toFixed(2),
      sampleProductCost: samplesComplete ? sampleProductCost.toFixed(2) : null,
      cogs: cogsComplete ? cogs.toFixed(2) : null,
      contributionProfit:
        cogsComplete && samplesComplete
          ? netRevenue.minus(cogs).minus(marketing).toFixed(2)
          : null,
      missingCostSources: [
        ...(!cogsComplete ? ['COGS'] : []),
        ...(!samplesComplete ? ['SAMPLE_PRODUCT_COST'] : []),
      ],
      ordersMissingCost: orders
        .filter((order) => !costBySubject.has(`ORDER:${order.id}`))
        .map((order) => ({ id: order.id, code: order.externalOrderSn })),
      samplesMissingCost: sampleRequests
        .filter((sample) => !costBySubject.has(`SAMPLE:${sample.id}`))
        .map((sample) => sample.id),
    };
  }

  async executive() {
    return this.prisma.$transaction(
      async (tx) => {
        const [orders, commissions, bonuses, wallets, payouts, bonusClawbacks, unrecognizedCommissions] =
          await Promise.all([
            tx.order.findMany({ where: { status: 'COMPLETED' } }),
            tx.commission.aggregate({
              where: { status: { not: 'REVERSED' }, order: { status: 'COMPLETED' } },
              _sum: { commissionAmount: true },
            }),
            tx.monthlyBonusResult.aggregate({
              where: { status: 'PAID' },
              _sum: { bonusAmount: true },
            }),
            tx.wallet.aggregate({
              where: { collaborator: { role: UserRole.COLLABORATOR } },
              _sum: { pendingBalance: true, availableBalance: true },
            }),
            tx.payoutRequest.aggregate({
              where: { status: 'APPROVED' },
              _sum: { amount: true, taxAmount: true, netAmount: true },
              _count: true,
            }),
            tx.bonusAdjustment.aggregate({
              where: {
                status: 'APPLIED',
                originalSettlement: { status: 'PAID' },
              },
              _sum: { adjustmentAmount: true },
            }),
            tx.commission.aggregate({
              where: { status: { not: 'REVERSED' }, order: { status: { not: 'COMPLETED' } } },
              _sum: { commissionAmount: true },
            }),
          ]);
        const gmv = orders.reduce(
          (sum, order) => sum.plus(order.subtotalAmount),
          new Prisma.Decimal(0),
        );
        const revenue = orders.reduce(
          (sum, order) => sum.plus(cleanGoodsRevenue(order)),
          new Prisma.Decimal(0),
        );
        const expense = (
          commissions._sum.commissionAmount ?? new Prisma.Decimal(0)
        )
          .plus(bonuses._sum.bonusAmount ?? 0)
          .plus(bonusClawbacks._sum.adjustmentAmount ?? 0);
        return {
          asOf: new Date().toISOString(),
          scope: 'ALL_TIME',
          recognitionBasis: 'COMPLETED_ORDERS',
          unrecognizedCommissions: (unrecognizedCommissions._sum.commissionAmount ?? new Prisma.Decimal(0)).toFixed(2),
          holdDays: COMMISSION_HOLD_DAYS,
          gmv: gmv.toFixed(2),
          netRevenue: revenue.toFixed(2),
          ordersCount: orders.length,
          affiliateExpense: expense.toFixed(2),
          affiliateExpenseRatio: revenue.gt(0)
            ? expense.div(revenue).mul(100).toFixed(2)
            : null,
          escrowPending: (
            wallets._sum.pendingBalance ?? new Prisma.Decimal(0)
          ).toFixed(2),
          availableEarnings: (
            wallets._sum.availableBalance ?? new Prisma.Decimal(0)
          ).toFixed(2),
          grossPaid: (payouts._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
          netPaid: (payouts._sum.netAmount ?? new Prisma.Decimal(0)).toFixed(2),
          taxWithheld: (
            payouts._sum.taxAmount ?? new Prisma.Decimal(0)
          ).toFixed(2),
          paidCount: payouts._count,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async recordCost(
    storeId: string,
    actorId: string,
    input: {
      subjectType: string;
      subjectId: string;
      amount: string;
      evidence: string;
    },
  ) {
    if (
      !['ORDER', 'SAMPLE'].includes(input.subjectType) ||
      !/^[0-9a-f-]{36}$/i.test(input.subjectId ?? '') ||
      !/^\d{1,13}(\.\d{1,2})?$/.test(input.amount ?? '') ||
      !input.evidence?.trim() ||
      input.evidence.length > 500
    )
      throw new BadRequestException(
        'Cần loại chi phí, mã đơn/mẫu, số tiền không âm và căn cứ kế toán',
      );
    const subject =
      input.subjectType === 'ORDER'
        ? await this.prisma.order.findFirst({
            where: { id: input.subjectId, storeId },
            select: { id: true },
          })
        : await this.prisma.sampleProductRequest.findFirst({
            where: { id: input.subjectId, product: { storeId } },
            select: { id: true },
          });
    if (!subject)
      throw new NotFoundException('Không tìm thấy đơn/mẫu của nhãn hàng');
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.financeCostEntry.upsert({
        where: {
          subjectType_subjectId: {
            subjectType: input.subjectType,
            subjectId: input.subjectId,
          },
        },
        create: {
          storeId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          amount: new Prisma.Decimal(input.amount),
          evidence: input.evidence.trim(),
          recordedById: actorId,
        },
        update: {
          amount: new Prisma.Decimal(input.amount),
          evidence: input.evidence.trim(),
          recordedById: actorId,
          recordedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'RECORD_ACTUAL_FINANCE_COST',
          details: { id: row.id, storeId, ...input },
        },
      });
      return { id: row.id };
    });
  }

  async monthlyTax(yearMonth: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth ?? ''))
      throw new BadRequestException('Kỳ thuế phải có dạng YYYY-MM');
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, -7));
    const end = new Date(Date.UTC(year, month, 1, -7));
    const items = await this.prisma.payoutRequest.findMany({
      where: { status: 'APPROVED', processedAt: { gte: start, lt: end } },
      select: {
        id: true,
        collaboratorId: true,
        amount: true,
        taxAmount: true,
        netAmount: true,
        bankRefCode: true,
        processedAt: true,
        collaborator: {
          select: {
            fullName: true,
            collaboratorProfile: { select: { taxCode: true } },
          },
        },
      },
      orderBy: [{ processedAt: 'asc' }, { id: 'asc' }],
    });
    const total = (key: 'amount' | 'taxAmount' | 'netAmount') =>
      items
        .reduce((sum, row) => sum.plus(row[key]), new Prisma.Decimal(0))
        .toFixed(2);
    return {
      yearMonth,
      items,
      gross: total('amount'),
      tax: total('taxAmount'),
      net: total('netAmount'),
      missingTaxCodes: items
        .filter((row) => !row.collaborator.collaboratorProfile?.taxCode)
        .map((row) => row.collaboratorId),
    };
  }

  async reconcileLedger() {
    return this.prisma.$transaction(
      async (tx) => {
        const [wallets, reserved, debits, credits] = await Promise.all([
          tx.wallet.aggregate({
            _sum: {
              availableBalance: true,
              pendingBalance: true,
              shoppingBalance: true,
            },
          }),
          tx.payoutRequest.aggregate({
            where: { status: { in: ['PENDING', 'PROCESSING'] } },
            _sum: { amount: true },
          }),
          tx.financePosting.groupBy({
            by: ['debitAccount'],
            _sum: { amount: true },
          }),
          tx.financePosting.groupBy({
            by: ['creditAccount'],
            _sum: { amount: true },
          }),
        ]);
        const book = (account: string) =>
          new Prisma.Decimal(
            credits.find((row) => row.creditAccount === account)?._sum.amount ??
              0,
          ).minus(
            debits.find((row) => row.debitAccount === account)?._sum.amount ??
              0,
          );
        const buckets = [
          ['PARTNER_EARNINGS_PAYABLE', wallets._sum.availableBalance],
          ['AFFILIATE_ESCROW', wallets._sum.pendingBalance],
          ['CUSTOMER_FUNDS', wallets._sum.shoppingBalance],
          ['PAYOUT_RESERVED', reserved._sum.amount],
        ] as const;
        const items = buckets.map(([account, value]) => {
          const expected = new Prisma.Decimal(value ?? 0),
            actual = book(account);
          return {
            account,
            walletAmount: expected.toFixed(2),
            bookAmount: actual.toFixed(2),
            difference: actual.minus(expected).toFixed(2),
          };
        });
        return {
          asOf: new Date().toISOString(),
          balanced: items.every((row) => row.difference === '0.00'),
          items,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async escrow(page = 1) {
    if (!Number.isInteger(page) || page < 1)
      throw new BadRequestException('Trang không hợp lệ');
    const where: Prisma.CommissionWhereInput = { status: 'PENDING' };
    const [items, total, aggregate] = await this.prisma.$transaction([
      this.prisma.commission.findMany({
        where,
        orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * 20,
        take: 20,
        select: {
          id: true,
          commissionAmount: true,
          availableAt: true,
          order: {
            select: {
              id: true,
              externalOrderSn: true,
              status: true,
                finalAmount: true,
                deliveredAt: true,
                orderItems: { select: { quantity: true, unitPrice: true, appliedCommissionRate: true, product: { select: { title: true, imageUrl: true } }, variant: { select: { name: true } } } },
              store: { select: { name: true } },
              returnRequest: { select: { status: true } },
              rawPayload: true,
            },
          },
        },
      }),
      this.prisma.commission.count({ where }),
      this.prisma.commission.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
    ]);
    return {
      items: items.map((item) => {
        const { rawPayload, ...order } = item.order;
        const risk = rawPayload as Prisma.JsonObject | null;
        return {
          ...item,
          order: {
            ...order,
            referralReviewRequired: risk?.selfReferralReviewRequired === true,
              testFixture: risk?.testFixture === true,
            referralRiskSignals: Array.isArray(risk?.selfReferralRiskSignals)
              ? risk.selfReferralRiskSignals
              : [],
          },
        };
      }),
      total,
      page,
      limit: 20,
      holdDays: COMMISSION_HOLD_DAYS,
      pendingAmount: aggregate._sum.commissionAmount?.toFixed(2) ?? '0.00',
    };
  }

  async taxStatements(collaboratorId: string) {
    const requests = await this.prisma.payoutRequest.findMany({
      where: { collaboratorId, status: 'APPROVED' },
      select: {
        id: true,
        amount: true,
        taxAmount: true,
        netAmount: true,
        bankRefCode: true,
        processedAt: true,
      },
      orderBy: [{ processedAt: 'desc' }, { id: 'desc' }],
    });
    return { items: requests };
  }

  async receipt(collaboratorId: string, id: string) {
    const payout = await this.prisma.payoutRequest.findFirst({
      where: { id, collaboratorId, status: 'APPROVED' },
      select: {
        id: true,
        amount: true,
        taxAmount: true,
        netAmount: true,
        bankRefCode: true,
        processedAt: true,
        bankAccountNumber: true,
        collaborator: {
          select: {
            fullName: true,
            collaboratorProfile: { select: { taxCode: true } },
          },
        },
      },
    });
    if (!payout)
      throw new NotFoundException('Không tìm thấy bảng kê chi trả của bạn');
    return {
      ...payout,
      bankAccountNumber: `••••${payout.bankAccountNumber?.slice(-4) ?? ''}`,
      documentType: 'PAYOUT_STATEMENT',
      legalTaxCertificate: false,
    };
  }
}

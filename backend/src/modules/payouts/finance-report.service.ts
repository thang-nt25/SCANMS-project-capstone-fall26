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
        select: {
          id: true,
          externalOrderSn: true,
          subtotalAmount: true,
          finalAmount: true,
          couponDiscountAmount: true,
          discountAmount: true,
          refundedAmount: true,
        },
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

  async executive(yearMonth?: string) {
    if (yearMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new BadRequestException('Kỳ báo cáo phải có dạng YYYY-MM');
    const [year, month] = (yearMonth ?? '').split('-').map(Number);
    const period = yearMonth ? { gte: new Date(Date.UTC(year, month - 1, 1, -7)), lt: new Date(Date.UTC(year, month, 1, -7)) } : undefined;
    const completedOrder = { status: 'COMPLETED' as const, ...(period ? { completedAt: period } : {}) };
    const sandboxFilter: Prisma.PayoutRequestWhereInput = { OR: [{ transferProvider: 'BIDV_SANDBOX' }, { bankRefCode: { startsWith: 'SBX-' } }] };
    return this.prisma.$transaction(
      async (tx) => {
        const [orders, commissions, bonuses, wallets, payouts, bonusClawbacks, unrecognizedCommissions, sandboxPayouts] =
          await Promise.all([
            tx.order.findMany({ where: completedOrder }),
            tx.commission.aggregate({
              where: { status: { not: 'REVERSED' }, order: completedOrder },
              _sum: { commissionAmount: true },
            }),
            tx.monthlyBonusResult.aggregate({
              where: { status: 'PAID', ...(yearMonth ? { yearMonth } : {}) },
              _sum: { bonusAmount: true },
            }),
            tx.wallet.aggregate({
              where: { collaborator: { role: UserRole.COLLABORATOR } },
              _sum: { pendingBalance: true, availableBalance: true },
            }),
            tx.payoutRequest.aggregate({
              where: { status: 'APPROVED', ...(period ? { processedAt: period } : {}), AND: [
                { OR: [{ transferProvider: null }, { transferProvider: { not: 'BIDV_SANDBOX' } }] },
                { OR: [{ bankRefCode: null }, { bankRefCode: { not: { startsWith: 'SBX-' } } }] },
              ] },
              _sum: { amount: true, taxAmount: true, netAmount: true },
              _count: true,
            }),
            tx.bonusAdjustment.aggregate({
              where: {
                status: 'APPLIED',
                originalSettlement: { status: 'PAID' },
                ...(yearMonth ? { targetYearMonth: yearMonth } : {}),
              },
              _sum: { adjustmentAmount: true },
            }),
            tx.commission.aggregate({
              where: { status: { not: 'REVERSED' }, order: { status: { not: 'COMPLETED' }, ...(period ? { createdAt: period } : {}) } },
              _sum: { commissionAmount: true },
            }),
            tx.payoutRequest.aggregate({ where: { status: 'APPROVED', ...(period ? { processedAt: period } : {}), ...sandboxFilter }, _sum: { netAmount: true, taxAmount: true }, _count: true }),
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
          scope: yearMonth ? 'MONTH' : 'ALL_TIME',
          yearMonth: yearMonth ?? null,
          walletScope: 'CURRENT_BALANCE',
          sandboxNetPaid: (sandboxPayouts._sum.netAmount ?? new Prisma.Decimal(0)).toFixed(2),
          sandboxTaxWithheld: (sandboxPayouts._sum.taxAmount ?? new Prisma.Decimal(0)).toFixed(2),
          sandboxPaidCount: sandboxPayouts._count,
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
        transferProvider: true,
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
    const realItems = items.filter(row => row.transferProvider !== 'BIDV_SANDBOX' && !row.bankRefCode?.startsWith('SBX-'));
    const sandboxItems = items.filter(row => !realItems.includes(row));
    const total = (rows: typeof items, key: 'amount' | 'taxAmount' | 'netAmount') =>
      rows
        .reduce((sum, row) => sum.plus(row[key]), new Prisma.Decimal(0))
        .toFixed(2);
    return {
      yearMonth,
      items: realItems,
      gross: total(realItems, 'amount'),
      tax: total(realItems, 'taxAmount'),
      net: total(realItems, 'netAmount'),
      sandbox: { count: sandboxItems.length, gross: total(sandboxItems, 'amount'), tax: total(sandboxItems, 'taxAmount'), net: total(sandboxItems, 'netAmount') },
      missingTaxCodes: realItems
        .filter((row) => !row.collaborator.collaboratorProfile?.taxCode)
        .map((row) => row.collaboratorId),
    };
  }

  async reconcileLedger(yearMonth?: string) {
    if (yearMonth) return this.reconcileMonth(yearMonth);
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

  private async reconcileMonth(yearMonth: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth))
      throw new BadRequestException('Kỳ đối soát phải có dạng YYYY-MM');
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, -7));
    const end = new Date(Date.UTC(year, month, 1, -7));
    return this.prisma.$transaction(async tx => {
      const [ledgers, postings, created, completed, paid] = await Promise.all([
        tx.financialLedger.groupBy({ by: ['balanceBucket'], where: { createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        tx.financePosting.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { debitAccount: true, creditAccount: true, amount: true } }),
        tx.payoutRequest.aggregate({ where: { createdAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        tx.payoutRequest.aggregate({ where: { status: { in: ['APPROVED', 'REJECTED'] }, processedAt: { gte: start, lt: end } }, _sum: { amount: true } }),
        tx.payoutRequest.findMany({ where: { status: 'APPROVED', processedAt: { gte: start, lt: end } }, select: { transferProvider: true, bankRefCode: true, netAmount: true, taxAmount: true } }),
      ]);
      const book = (account: string) => postings.reduce((sum, row) => sum.plus(row.creditAccount === account ? row.amount : 0).minus(row.debitAccount === account ? row.amount : 0), new Prisma.Decimal(0));
      const movement = (bucket: string) => new Prisma.Decimal(ledgers.find(row => row.balanceBucket === bucket)?._sum.amount ?? 0);
      const paidTotal = (sandbox: boolean, key: 'netAmount' | 'taxAmount') => paid.filter(row => (row.transferProvider === 'BIDV_SANDBOX' || !!row.bankRefCode?.startsWith('SBX-')) === sandbox).reduce((sum, row) => sum.plus(row[key]), new Prisma.Decimal(0));
      const values = [
        ['PARTNER_EARNINGS_PAYABLE', movement('AVAILABLE')],
        ['AFFILIATE_ESCROW', movement('PENDING')],
        ['CUSTOMER_FUNDS', movement('SHOPPING')],
        ['PAYOUT_RESERVED', new Prisma.Decimal(created._sum.amount ?? 0).minus(completed._sum.amount ?? 0)],
        ['CORPORATE_BANK', paidTotal(false, 'netAmount')],
        ['PIT_TAX_PAYABLE', paidTotal(false, 'taxAmount')],
        ['BIDV_SANDBOX_BANK', paidTotal(true, 'netAmount')],
        ['SANDBOX_PIT_PAYABLE', paidTotal(true, 'taxAmount')],
      ] as const;
      const items = values.map(([account, expected]) => ({ account, walletAmount: expected.toFixed(2), bookAmount: book(account).toFixed(2), difference: book(account).minus(expected).toFixed(2) }));
      return { yearMonth, basis: 'MONTHLY_MOVEMENT', start, end, asOf: new Date().toISOString(), balanced: items.every(row => row.difference === '0.00'), items };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
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
              createdAt: true,
              completedAt: true,
              clickedAt: true,
              referralLink: { select: { createdAt: true, shortCode: true } },
              attributedCollaborator: { select: { fullName: true } },
                finalAmount: true,
                deliveredAt: true,
                orderItems: { select: { quantity: true, unitPrice: true, appliedCommissionRate: true, product: { select: { title: true, imageUrl: true } }, variant: { select: { name: true } } } },
              store: { select: { name: true } },
               returnRequests: { select: { status: true }, orderBy: { submittedAt: 'desc' }, take: 1 },
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
        const { rawPayload, returnRequests, ...order } = item.order;
        const risk = rawPayload as Prisma.JsonObject | null;
        return {
          ...item,
          order: {
            ...order,
            returnRequest: returnRequests[0] ?? null,
            shopConfirmedAt: typeof risk?.shopConfirmedAt === 'string' ? risk.shopConfirmedAt : null,
            handedToShippingAt: typeof risk?.ghnShippedAt === 'string' ? risk.ghnShippedAt : null,
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
        transferProvider: true,
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
        transferProvider: true,
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
      documentType: payout.transferProvider === 'BIDV_SANDBOX' ? 'SANDBOX_PAYOUT_STATEMENT' : 'PAYOUT_STATEMENT',
      environment: payout.transferProvider === 'BIDV_SANDBOX' ? 'SANDBOX' : 'LIVE',
      legalTaxCertificate: false,
    };
  }
}

import { Prisma } from '@prisma/client';
import { FinanceReportService } from './finance-report.service';

describe('matching commission costs to recognized revenue', () => {
  it('excludes delivered-order commission from the completed-order ratio, but exposes it separately', async () => {
    const decimal = (value: number) => new Prisma.Decimal(value);
    const transaction: any = {
      order: { findMany: jest.fn().mockResolvedValue([{ subtotalAmount: decimal(1000000), finalAmount: decimal(1000000), refundedAmount: decimal(0) }]) },
      commission: { aggregate: jest.fn().mockImplementation(({ where }) => Promise.resolve({ _sum: { commissionAmount: decimal(where.order.status === 'COMPLETED' ? 100000 : 80000) } })) },
      monthlyBonusResult: { aggregate: jest.fn().mockResolvedValue({ _sum: { bonusAmount: decimal(0) } }) },
      bonusAdjustment: { aggregate: jest.fn().mockResolvedValue({ _sum: { adjustmentAmount: decimal(0) } }) },
      wallet: { aggregate: jest.fn().mockResolvedValue({ _sum: { pendingBalance: decimal(0), availableBalance: decimal(0) } }) },
      payoutRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: decimal(0), taxAmount: decimal(0), netAmount: decimal(0) }, _count: 0 }) },
    };
    const report = await new FinanceReportService({ $transaction: (callback: any) => callback(transaction) } as any).executive();
    expect(report).toMatchObject({ recognitionBasis: 'COMPLETED_ORDERS', netRevenue: '1000000.00', affiliateExpense: '100000.00', unrecognizedCommissions: '80000.00', affiliateExpenseRatio: '10.00' });
    expect(transaction.order.findMany).toHaveBeenCalledWith({ where: { status: 'COMPLETED' } });
  });

  it('uses the same Vietnam month for completed revenue and commissions, and separates sandbox payout totals', async () => {
    const aggregate = () => jest.fn().mockResolvedValue({ _sum: {}, _count: 0 });
    const tx: any = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
      commission: { aggregate: aggregate() }, monthlyBonusResult: { aggregate: aggregate() },
      bonusAdjustment: { aggregate: aggregate() }, wallet: { aggregate: aggregate() },
      payoutRequest: { aggregate: jest.fn().mockResolvedValueOnce({ _sum: { netAmount: new Prisma.Decimal(18900000), taxAmount: new Prisma.Decimal(2100000) }, _count: 4 }).mockResolvedValueOnce({ _sum: { netAmount: new Prisma.Decimal(700000), taxAmount: new Prisma.Decimal(0) }, _count: 2 }) },
    };
    const report = await new FinanceReportService({ $transaction: (fn: any) => fn(tx) } as any).executive('2026-10');
    expect(report).toMatchObject({ scope: 'MONTH', yearMonth: '2026-10', netPaid: '18900000.00', taxWithheld: '2100000.00', sandboxNetPaid: '700000.00', walletScope: 'CURRENT_BALANCE' });
    const where = tx.order.findMany.mock.calls[0][0].where;
    expect(where.completedAt.gte.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(where.completedAt.lt.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(tx.commission.aggregate.mock.calls[0][0].where.order).toEqual(where);
    expect(tx.monthlyBonusResult.aggregate.mock.calls[0][0].where).toEqual({ status: 'PAID', yearMonth: '2026-10' });
    expect(tx.payoutRequest.aggregate.mock.calls[0][0].where.processedAt).toEqual(where.completedAt);
    expect(tx.payoutRequest.aggregate.mock.calls[0][0].where.AND).toHaveLength(2);
    await expect(new FinanceReportService({} as any).executive('2026-99')).rejects.toThrow();
  });
});

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
});

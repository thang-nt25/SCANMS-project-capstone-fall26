import { Prisma } from '@prisma/client';
import { FinanceReportService } from './finance-report.service';

const d = (value: number) => new Prisma.Decimal(value);
describe('monthly finance reports', () => {
  it('excludes sandbox payouts from real tax totals', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { amount: d(2000000), taxAmount: d(200000), netAmount: d(1800000), transferProvider: 'GATEWAY', collaborator: { collaboratorProfile: { taxCode: '123' } } },
      { amount: d(500000), taxAmount: d(0), netAmount: d(500000), transferProvider: 'BIDV_SANDBOX', collaborator: {} },
      { amount: d(200000), taxAmount: d(0), netAmount: d(200000), bankRefCode: 'SBX-legacy', collaborator: {} },
    ]);
    const report = await new FinanceReportService({ payoutRequest: { findMany } } as any).monthlyTax('2026-11');
    expect(report).toMatchObject({ gross: '2000000.00', tax: '200000.00', net: '1800000.00', sandbox: { count: 2, gross: '700000.00' } });
    expect(report.items).toHaveLength(1);
  });

  it('compares only monthly movements, including reservations spanning months', async () => {
    const tx = {
      customerWithdrawal: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: d(0) } }) },
      financialLedger: { groupBy: jest.fn().mockResolvedValue([{ balanceBucket: 'AVAILABLE', _sum: { amount: d(200000) } }]) },
      financePosting: { findMany: jest.fn().mockResolvedValue([
        { debitAccount: 'PAYOUT_RESERVED', creditAccount: 'PARTNER_EARNINGS_PAYABLE', amount: d(200000) },
        { debitAccount: 'PAYOUT_RESERVED', creditAccount: 'BIDV_SANDBOX_BANK', amount: d(500000) },
      ]) },
      payoutRequest: {
        aggregate: jest.fn().mockResolvedValueOnce({ _sum: { amount: d(0) } }).mockResolvedValueOnce({ _sum: { amount: d(700000) } }),
        findMany: jest.fn().mockResolvedValue([{ transferProvider: 'BIDV_SANDBOX', netAmount: d(500000), taxAmount: d(0) }]),
      },
    };
    const report = await new FinanceReportService({ $transaction: (fn: any) => fn(tx) } as any).reconcileLedger('2026-11');
    expect(report).toMatchObject({ yearMonth: '2026-11', basis: 'MONTHLY_MOVEMENT', balanced: true });
    expect(report.items.find(row => row.account === 'PAYOUT_RESERVED')).toMatchObject({ walletAmount: '-700000.00', difference: '0.00' });
    const period = tx.financialLedger.groupBy.mock.calls[0][0].where.createdAt;
    expect(period.gte.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(period.lt.toISOString()).toBe('2026-11-30T17:00:00.000Z');
  });

  it('rejects an invalid month', async () => {
    await expect(new FinanceReportService({} as any).reconcileLedger('2026-13')).rejects.toThrow();
  });

  it('includes customer withdrawals in bank outflows and excludes top-up receipts', async () => {
    const tx = {
      financialLedger: { groupBy: jest.fn().mockResolvedValue([]) },
      financePosting: { findMany: jest.fn().mockResolvedValue([
        { referenceType: 'CUSTOMER_WITHDRAWAL', debitAccount: 'CUSTOMER_WITHDRAWAL_RESERVED', creditAccount: 'CORPORATE_BANK', amount: d(200000) },
        { referenceType: 'TOPUP_PAYOS', debitAccount: 'CORPORATE_BANK', creditAccount: 'CUSTOMER_FUNDS', amount: d(700000) },
      ]) },
      payoutRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: d(0) } }), findMany: jest.fn().mockResolvedValue([]) },
      customerWithdrawal: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: d(200000) } }) },
    };
    const report = await new FinanceReportService({ $transaction: (fn: any) => fn(tx) } as any).reconcileLedger('2026-11');
    expect(report.items.find(row => row.account === 'CORPORATE_BANK')).toMatchObject({ walletAmount: '200000.00', bookAmount: '200000.00', difference: '0.00' });
  });

  it('validates detail account and pagination before accessing data', async () => {
    const service = new FinanceReportService({} as any);
    await expect(service.reconciliationDetails('2026-11', 'UNKNOWN')).rejects.toThrow();
    await expect(service.reconciliationDetails('2026-11', 'CORPORATE_BANK', 0)).rejects.toThrow();
  });
});

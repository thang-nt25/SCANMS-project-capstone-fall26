import { Prisma } from '@prisma/client';
import { monthlyPayoutTax, refreshPendingMonthlyTax, assertPayoutNetSnapshot, payoutMonthlySummaries } from './payout-monthly-tax';
import { payoutTaxMonth } from './payout-tax.service';

describe('monthly payout data and allocation', () => {
  it('returns full monthly status totals for only requested KOL/month pairs, with explicit zero totals', async () => {
    const query = jest.fn().mockResolvedValue([{ collaboratorId: 'kol-a', month: '2026-11', totalGross: new Prisma.Decimal(12000000), pendingGross: new Prisma.Decimal(400000), processingGross: new Prisma.Decimal(1600000), approvedGross: new Prisma.Decimal(10000000), count: 8n }]);
    const result = await payoutMonthlySummaries({ $queryRaw: query } as never, [
      { collaboratorId: 'kol-a', createdAt: new Date('2026-11-13') },
      { collaboratorId: 'kol-a', createdAt: new Date('2026-11-12') },
      { collaboratorId: 'kol-b', createdAt: new Date('2026-10-13') },
    ]);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toContain("status IN ('PENDING', 'PROCESSING', 'APPROVED')");
    expect(sql.sql).not.toContain('store_id');
    expect(sql.values.filter(value => value === 'kol-a')).toHaveLength(1);
    expect(result.get('kol-a:2026-11')).toEqual({ month: '2026-11', totalGross: '12000000.00', pendingGross: '400000.00', processingGross: '1600000.00', approvedGross: '10000000.00', count: 8 });
    expect(result.get('kol-b:2026-10')?.totalGross).toBe('0.00');
  });
  it('uses the Vietnam month boundary, including year rollover', () => {
    const period = payoutTaxMonth(new Date('2026-12-31T17:00:00Z'));
    expect(period.month).toBe('2027-01');
    expect(period.start.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    expect(period.end.toISOString()).toBe('2027-01-31T17:00:00.000Z');
    expect(payoutTaxMonth(new Date('2026-12-31T16:59:59Z')).month).toBe('2026-12');
  });
  it('withholds fixed 10% without querying monthly withdrawal totals', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(110000000) } });
    const result = await monthlyPayoutTax({ payoutRequest: { aggregate } } as unknown as Prisma.TransactionClient, 'kol-a', new Prisma.Decimal(400000), new Date('2026-11-13T00:00:00Z'));
    expect(aggregate).not.toHaveBeenCalled();
    expect(result.taxAmount.toFixed(2)).toBe('40000.00');
    expect(result.taxContext).toMatchObject({ policy: 'FLAT_10_PERCENT_V1', rate: '0.10' });
  });
  it('does not rewrite any saved pending, processing or completed tax after rejection', async () => {
    const d = (value: number) => new Prisma.Decimal(value);
    const update = jest.fn().mockResolvedValue({});
    const tx = { payoutRequest: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'paid', status: 'APPROVED', amount: d(9800000) },
        { id: 'pending', status: 'PENDING', batchId: null, amount: d(400000) },
        { id: 'processing', status: 'PROCESSING', amount: d(400000) },
        { id: 'later', status: 'PENDING', batchId: null, amount: d(400000) },
      ]), update,
    } };
    await refreshPendingMonthlyTax(tx as unknown as Prisma.TransactionClient, 'kol', new Date('2026-11-13'));
    expect(update).not.toHaveBeenCalled();
    expect(tx.payoutRequest.findMany).not.toHaveBeenCalled();
  });
  it('prevents confirming an outdated amount after another request was rejected', () => {
    const row = { taxContext: { policy: 'MONTHLY_PROGRESSIVE_V1' }, netAmount: new Prisma.Decimal(380000) };
    expect(() => assertPayoutNetSnapshot(row, '360000')).toThrow('Tải lại');
    expect(() => assertPayoutNetSnapshot(row)).toThrow('Tải lại');
    expect(() => assertPayoutNetSnapshot(row, '380000')).not.toThrow();
  });
});

import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { PAYOUT_TAX_POLICY, PayoutTaxService, payoutTaxMonth } from './payout-tax.service';

export function assertPayoutNetSnapshot(request: { taxContext?: Prisma.JsonValue | null; netAmount: Prisma.Decimal }, expected?: string) {
  if (request.taxContext != null && (!expected || !/^\d{1,13}(\.\d{1,2})?$/.test(expected) || !request.netAmount.eq(expected)))
    throw new ConflictException('Số tiền thực nhận đã thay đổi hoặc chưa được xác nhận. Tải lại yêu cầu trước khi chuyển tiền.');
}

// All creation, approval, batch export and rejection paths take this lock BEFORE row locks.
export async function lockPayoutTax(tx: Prisma.TransactionClient, collaboratorId: string) {
  // PostgreSQL's lock function returns void, which Prisma cannot deserialize.
  // Cast only its result; the blocking transaction-scoped lock is unchanged.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`payout-monthly-tax:${collaboratorId}`}, 0))::text AS lock_result`;
}
export async function lockPayoutTaxForRequest(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('payout-monthly-tax:' || collaborator_id::text, 0))::text AS lock_result FROM payout_requests WHERE id = ${id}::uuid`;
}

export async function monthlyPayoutTax(tx: Prisma.TransactionClient, collaboratorId: string, amount: Prisma.Decimal, now = new Date()) {
  const period = payoutTaxMonth(now);
  const total = await tx.payoutRequest.aggregate({
    where: { collaboratorId, status: { in: ['PENDING', 'PROCESSING', 'APPROVED'] }, createdAt: { gte: period.start, lt: period.end } },
    _sum: { amount: true },
  });
  const before = total._sum.amount ?? new Prisma.Decimal(0);
  const calculation = new PayoutTaxService().calculateTax(amount, before);
  return { ...calculation, taxContext: { policy: PAYOUT_TAX_POLICY, month: period.month, monthlyGrossBefore: before.toFixed(2), segments: calculation.segments } };
}

// Rejected requests release their place in the brackets. Only unsent requests can change.
// Processing/exported and completed snapshots remain immutable.
export async function refreshPendingMonthlyTax(tx: Prisma.TransactionClient, collaboratorId: string, createdAt: Date) {
  const period = payoutTaxMonth(createdAt);
  const rows = await tx.payoutRequest.findMany({
    where: { collaboratorId, status: { in: ['PENDING', 'PROCESSING', 'APPROVED'] }, createdAt: { gte: period.start, lt: period.end } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  let before = new Prisma.Decimal(0);
  for (const row of rows) {
    if (row.status === 'PENDING' && !row.batchId) {
      const result = new PayoutTaxService().calculateTax(row.amount, before);
      await tx.payoutRequest.update({ where: { id: row.id }, data: {
        taxAmount: result.taxAmount, netAmount: result.netAmount,
        taxContext: { policy: PAYOUT_TAX_POLICY, month: period.month, monthlyGrossBefore: before.toFixed(2), segments: result.segments },
      } });
    }
    before = before.plus(row.amount);
  }
}

export async function payoutMonthlySummaries(db: Pick<Prisma.TransactionClient, '$queryRaw'>, requests: { collaboratorId: string; createdAt: Date }[]) {
  if (!requests.length) return new Map<string, { month: string; totalGross: string; pendingGross: string; processingGross: string; approvedGross: string; count: number }>();
  const periods = new Map(requests.map(row => {
    const period = payoutTaxMonth(row.createdAt);
    return [`${row.collaboratorId}:${period.month}`, { collaboratorId: row.collaboratorId, ...period }];
  }));
  const conditions = [...periods.values()].map(period => Prisma.sql`(collaborator_id = ${period.collaboratorId}::uuid AND created_at >= ${period.start} AND created_at < ${period.end})`);
  const rows = await db.$queryRaw<{ collaboratorId: string; month: string; totalGross: Prisma.Decimal; pendingGross: Prisma.Decimal; processingGross: Prisma.Decimal; approvedGross: Prisma.Decimal; count: bigint }[]>(Prisma.sql`
    SELECT collaborator_id AS "collaboratorId", to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month,
      SUM(amount) AS "totalGross",
      COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) AS "pendingGross",
      COALESCE(SUM(amount) FILTER (WHERE status = 'PROCESSING'), 0) AS "processingGross",
      COALESCE(SUM(amount) FILTER (WHERE status = 'APPROVED'), 0) AS "approvedGross", COUNT(*) AS count
    FROM payout_requests WHERE status IN ('PENDING', 'PROCESSING', 'APPROVED') AND (${Prisma.join(conditions, ' OR ')})
    GROUP BY collaborator_id, to_char(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`);
  const totals = new Map(rows.map(row => [`${row.collaboratorId}:${row.month}`, {
    month: row.month, totalGross: row.totalGross.toFixed(2), pendingGross: row.pendingGross.toFixed(2),
    processingGross: row.processingGross.toFixed(2), approvedGross: row.approvedGross.toFixed(2), count: Number(row.count),
  }]));
  for (const [key, period] of periods) if (!totals.has(key)) totals.set(key, { month: period.month, totalGross: '0.00', pendingGross: '0.00', processingGross: '0.00', approvedGross: '0.00', count: 0 });
  return totals;
}

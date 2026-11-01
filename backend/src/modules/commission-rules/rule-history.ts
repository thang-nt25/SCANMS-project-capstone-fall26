import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Reconstruct an immutable policy view using the audit written in each mutation transaction. */
export async function rulesAt(
  db: Prisma.TransactionClient,
  storeId: string,
  at: Date,
) {
  const key = `commission-policy:${storeId}`;
  await db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  const current = await db.commissionRule.findMany({
    where: { storeId },
    orderBy: { minMonthlyRevenue: 'asc' },
  });
  if (!current.length) return [];
  const changes = await db.auditLog.findMany({
    where: {
      action: {
        in: [
          'CREATE_COMMISSION_RULE',
          'UPDATE_COMMISSION_RULE',
          'UPDATE_COMMISSION_RULE_STATUS',
          'DELETE_COMMISSION_RULE',
          'RESTORE_COMMISSION_RULE',
        ],
      },
      details: { path: ['storeId'], equals: storeId },
      createdAt: { gt: at },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return current.flatMap((row) => {
    if (row.createdAt && row.createdAt > at) return [];
    if (row.updatedAt && row.updatedAt > at && !changes.some(event => (event.details as Record<string, any>)?.ruleId === row.id)) {
      throw new ConflictException(`Mốc thưởng ${row.id} đã thay đổi nhưng thiếu nhật ký lịch sử; cần đối soát trước khi quyết toán.`);
    }
    let state: Record<string, any> = { ...row };
    for (const event of changes) {
      const data = event.details as Record<string, any>;
      if (data?.ruleId !== row.id) continue;
      if (event.action === 'CREATE_COMMISSION_RULE') return [];
      if (data.oldValues) state = { ...state, ...data.oldValues };
      else if (event.action === 'UPDATE_COMMISSION_RULE_STATUS') {
        state.isActive = data.oldStatus;
        state.version = Math.max(1, Number(data.version) - 1);
      } else if (event.action === 'RESTORE_COMMISSION_RULE') {
        state.isDeleted = true;
        state.isActive = false;
      } else {
        // A legacy delete without its pre-image cannot prove whether the rule
        // was active. Block settlement instead of silently under/overpaying.
        throw new ConflictException(
          `Mốc thưởng ${row.id} thiếu phiên bản lịch sử trước ${event.action}; cần đối chiếu lịch sử trước khi quyết toán.`,
        );
      }
    }
    if (state.isDeleted) return [];
    return [
      {
        ...row,
        ...state,
        minMonthlyRevenue: new Prisma.Decimal(state.minMonthlyRevenue),
        achievementBonus: new Prisma.Decimal(state.achievementBonus),
        bonusPercentage: new Prisma.Decimal(state.bonusPercentage),
        effectiveFrom: state.effectiveFrom
          ? new Date(state.effectiveFrom)
          : null,
        effectiveTo: state.effectiveTo ? new Date(state.effectiveTo) : null,
      } as typeof row,
    ];
  });
}

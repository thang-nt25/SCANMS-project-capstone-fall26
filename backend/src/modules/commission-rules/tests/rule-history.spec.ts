import { Prisma } from '@prisma/client';
import { rulesAt } from '../rule-history';
import { CommissionRulesService } from '../commission-rules.service';

describe('FR-09 historical policy', () => {
  const at = new Date('2026-09-01T00:00:00Z');
  const row = {
    id: 'rule',
    storeId: 'store',
    createdAt: new Date('2026-08-01'),
    isActive: true,
    isDeleted: false,
    version: 3,
    achievementBonus: new Prisma.Decimal(1000000),
    bonusPercentage: new Prisma.Decimal(0),
    minMonthlyRevenue: new Prisma.Decimal(50000000),
    effectiveFrom: new Date('2026-08-01'),
    effectiveTo: null,
  };
  const event = (action: string, details: any) => ({
    action,
    details: { storeId: 'store', ruleId: 'rule', ...details },
    createdAt: new Date('2026-10-01'),
  });
  const load = (current: any[], changes: any[]) =>
    rulesAt(
      {
        $queryRaw: async () => [],
        commissionRule: { findMany: async () => current },
        auditLog: { findMany: async () => changes },
      } as any,
      'store',
      at,
    );
  it('preserves the old reward across multiple later edits', async () => {
    const result = await load(
      [row],
      [
        event('UPDATE_COMMISSION_RULE', {
          oldValues: { achievementBonus: '1500000', version: 2 },
        }),
        event('UPDATE_COMMISSION_RULE', {
          oldValues: { achievementBonus: '2000000', version: 1 },
        }),
      ],
    );
    expect(result[0].achievementBonus.toString()).toBe('2000000');
    expect(result[0].version).toBe(1);
  });
  it('restores pre-delete active state from its immutable pre-image', async () => {
    const result = await load(
      [{ ...row, isDeleted: true, isActive: false }],
      [
        event('DELETE_COMMISSION_RULE', {
          oldValues: { ...row, achievementBonus: '2000000' },
        }),
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
    expect(result[0].achievementBonus.toString()).toBe('2000000');
  });
  it('does not introduce future rules into a missed month', async () => {
    expect(
      await load([{ ...row, createdAt: new Date('2026-10-01') }], []),
    ).toEqual([]);
  });
  it('reverses a later status change and does not revive a previously deleted rule', async () => {
    expect(
      (
        await load(
          [{ ...row, isActive: false }],
          [
            event('UPDATE_COMMISSION_RULE_STATUS', {
              oldStatus: true,
              version: 3,
            }),
          ],
        )
      )[0].isActive,
    ).toBe(true);
    expect(await load([row], [event('RESTORE_COMMISSION_RULE', {})])).toEqual(
      [],
    );
  });
  it('blocks ambiguous legacy deletion rather than paying zero silently', async () => {
    await expect(
      load(
        [{ ...row, isDeleted: true }],
        [event('DELETE_COMMISSION_RULE', {})],
      ),
    ).rejects.toThrow('thiếu phiên bản lịch sử');
  });
  it('pays 2% of total clean revenue after reaching the highest milestone', () => {
    const service = new CommissionRulesService({} as any, {} as any);
    const percent = {
      ...row,
      name: '50m',
      achievementBonus: new Prisma.Decimal(0),
      bonusPercentage: new Prisma.Decimal(2),
    };
    expect(
      service.calculateMonthlyBonus([percent], new Prisma.Decimal(52000000))
        .totalBonus,
    ).toBe('1040000.00');
    expect(
      service.calculateMonthlyBonus([percent], new Prisma.Decimal(49999999))
        .totalBonus,
    ).toBe('0.00');
  });
  it('pays only the highest fixed milestone without adding percentages or lower milestones', () => {
    const service = new CommissionRulesService({} as any, {} as any);
    const fixed = {
      ...row,
      name: '50m',
      achievementBonus: new Prisma.Decimal(2000000),
      bonusPercentage: new Prisma.Decimal(2),
    };
    expect(
      service.calculateMonthlyBonus(
        [
          fixed,
          {
            ...fixed,
            id: 'lower',
            minMonthlyRevenue: new Prisma.Decimal(20000000),
            achievementBonus: new Prisma.Decimal(500000),
          },
        ],
        new Prisma.Decimal(52000000),
      ).totalBonus,
    ).toBe('2000000.00');
  });
});

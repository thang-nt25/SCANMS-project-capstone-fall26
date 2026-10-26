import { Prisma, UserRole } from '@prisma/client';
import { CommissionRulesService } from '../commission-rules.service';

const D = (value: string | number) => new Prisma.Decimal(value);

describe('Monthly bonus deduction carry-forward', () => {
  function fixture(
    amounts = [-30000],
    gross: Record<string, string> = { '2025-08': '10000', '2025-09': '50000' },
  ) {
    let sequence = 0;
    const adjustments: any[] = amounts.map((amount, index) => ({
      id: `adjustment-${index}`,
      storeId: 'shop-a',
      collaboratorId: 'kol-a',
      originalSettlementId: 'original-settlement',
      refundId: `refund-${index}`,
      adjustmentAmount: D(amount),
      reason: 'fixture',
      status: 'PENDING',
      targetYearMonth: '2025-08',
      createdAt: new Date('2025-08-01'),
    }));
    const settlements = new Map<string, any>();
    const locks: string[] = [];
    const tx = {
      $queryRaw: jest.fn(async (_sql, key) => {
        locks.push(key);
        return [{ locked: 1 }];
      }),
      monthlyBonusResult: {
        findUnique: jest.fn(
          async ({ where }) =>
            settlements.get(where.storeId_collaboratorId_yearMonth.yearMonth) ||
            null,
        ),
        create: jest.fn(async ({ data }) => {
          const saved = { id: `settlement-${++sequence}`, ...data };
          settlements.set(data.yearMonth, saved);
          return saved;
        }),
      },
      commissionRule: { findMany: jest.fn(async () => []) },
      bonusAdjustment: {
        findMany: jest.fn(async ({ where }) =>
          adjustments
            .filter(
              (a) =>
                a.storeId === where.storeId &&
                a.collaboratorId === where.collaboratorId &&
                a.status === where.status &&
                a.targetYearMonth <= where.targetYearMonth.lte,
            )
            .map((a) => ({ ...a })),
        ),
        update: jest.fn(async ({ where, data }) =>
          Object.assign(
            adjustments.find((a) => a.id === where.id),
            data,
          ),
        ),
        create: jest.fn(async ({ data }) => {
          const created = { id: `carry-${++sequence}`, ...data };
          adjustments.push(created);
          return created;
        }),
      },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    const prisma = {
      store: { findUnique: jest.fn(async () => ({ id: 'shop-a' })) },
      user: {
        findUnique: jest.fn(async () => ({
          role: UserRole.COLLABORATOR,
          isActive: true,
        })),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new CommissionRulesService(prisma as any, {} as any);
    jest.spyOn(service, 'calculateValidMonthlyRevenue').mockImplementation(
      async (_store, _kol, month) =>
        ({
          validRevenue: gross[month] ?? '0',
        }) as any,
    );
    jest.spyOn(service, 'calculateProgressiveBonus').mockImplementation(
      (_, revenue) =>
        ({
          totalBonus: revenue.toString(),
          achievementBonus: '0',
          rangeBonuses: [],
          highestReachedRule: null,
        }) as any,
    );
    const settle = (month: string) =>
      service.settleMonthlyBonus('shop-a', 'kol-a', month);
    const sum = () =>
      adjustments
        .reduce((total, a) => total.add(a.adjustmentAmount), D(0))
        .toString();
    return {
      service,
      prisma,
      tx,
      adjustments,
      settlements,
      locks,
      settle,
      sum,
    };
  }

  it("deducts 10,000 of 30,000 now and carries 20,000 to reduce next month's 50,000 to 30,000", async () => {
    const f = fixture();
    const first = await f.settle('2025-08');
    expect(first.settlement.bonusAmount).toBe('0');
    expect(first.settlement.ruleSnapshot).toMatchObject({
      requestedAdjustment: '-30000',
      totalAdjustment: '-10000',
      carriedForwardAdjustment: '-20000',
      appliedAdjustments: [
        { id: 'adjustment-0', amount: '-10000', reason: 'fixture' },
      ],
    });
    expect(f.adjustments[0]).toMatchObject({
      status: 'APPLIED',
      adjustmentAmount: D(-10000),
    });
    expect(f.adjustments[1]).toMatchObject({
      status: 'PENDING',
      adjustmentAmount: D(-20000),
      targetYearMonth: '2025-09',
      originalSettlementId: 'original-settlement',
      refundId: 'refund-0',
    });
    expect((await f.settle('2025-09')).settlement.bonusAmount).toBe('30000');
    expect(f.adjustments.every((a) => a.status === 'APPLIED')).toBe(true);
    expect(f.sum()).toBe('-30000'); // Refund aggregate must never double-count split rows.
    expect(f.locks).toEqual([
      'monthly-bonus:shop-a:kol-a',
      'monthly-bonus:shop-a:kol-a',
    ]);
    expect(f.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: expect.objectContaining({
            carriedForwardAdjustment: '-20000',
          }),
        }),
      }),
    );
  });

  it('keeps the whole amount pending when bonus is zero, without cloning the debt', async () => {
    const f = fixture([-30000], {});
    await f.settle('2025-08');
    await f.settle('2025-09');
    expect(f.adjustments).toHaveLength(1);
    expect(f.adjustments[0]).toMatchObject({
      status: 'PENDING',
      targetYearMonth: '2025-10',
    });
    expect(f.sum()).toBe('-30000');
    expect(f.tx.bonusAdjustment.create).not.toHaveBeenCalled();
  });

  it.each(['30000', '50000'])(
    'fully applies a deduction when gross is %s',
    async (gross) => {
      const f = fixture([-30000], { '2025-08': gross });
      expect((await f.settle('2025-08')).settlement.bonusAmount).toBe(
        D(gross).minus(30000).toString(),
      );
      expect(f.adjustments[0].status).toBe('APPLIED');
      expect(f.tx.bonusAdjustment.create).not.toHaveBeenCalled();
    },
  );

  it('allocates multiple deductions deterministically without losing remaining cents', async () => {
    const f = fixture([-10000.01, -20000.02], { '2025-08': '15000.02' });
    const result = await f.settle('2025-08');
    expect(result.settlement.bonusAmount).toBe('0');
    expect(result.settlement.ruleSnapshot.totalAdjustment).toBe('-15000.02');
    expect(result.settlement.ruleSnapshot.carriedForwardAdjustment).toBe(
      '-15000.01',
    );
    expect(f.sum()).toBe('-30000.03');
  });

  it('accounts for positive adjustments before applying deductions', async () => {
    const f = fixture([-30000, 5000], { '2025-08': '10000' });
    const result = await f.settle('2025-08');
    expect(result.settlement.bonusAmount).toBe('0');
    expect(result.settlement.ruleSnapshot.totalAdjustment).toBe('-10000');
    expect(result.settlement.ruleSnapshot.carriedForwardAdjustment).toBe(
      '-15000',
    );
    expect(f.sum()).toBe('-25000');
  });

  it('skips months already settled when scheduling a carry', async () => {
    const f = fixture();
    f.settlements.set('2025-09', { id: 'existing-september' });
    await f.settle('2025-08');
    expect(f.adjustments[1].targetYearMonth).toBe('2025-10');
    expect(f.settlements.get('2025-09')).toEqual({ id: 'existing-september' });
  });

  it('collects overdue pending debt if an intermediate month was skipped', async () => {
    const f = fixture([-30000], { '2025-10': '50000' });
    expect((await f.settle('2025-10')).settlement.bonusAmount).toBe('20000');
    expect(f.tx.bonusAdjustment.findMany).toHaveBeenCalledWith({
      where: {
        storeId: 'shop-a',
        collaboratorId: 'kol-a',
        targetYearMonth: { lte: '2025-10' },
        status: 'PENDING',
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('ignores other shops, KOLs, cancelled debt and future-dated adjustments', async () => {
    const f = fixture([0]);
    f.adjustments.length = 0;
    for (const overrides of [
      { storeId: 'other-shop' },
      { collaboratorId: 'other-kol' },
      { status: 'CANCELLED' },
      { targetYearMonth: '2025-12' },
    ])
      f.adjustments.push({
        id: JSON.stringify(overrides),
        storeId: 'shop-a',
        collaboratorId: 'kol-a',
        status: 'PENDING',
        targetYearMonth: '2025-08',
        adjustmentAmount: D(-30000),
        ...overrides,
      });
    expect((await f.settle('2025-08')).settlement.bonusAmount).toBe('10000');
    expect(f.tx.bonusAdjustment.update).not.toHaveBeenCalled();
  });

  it('is idempotent and never splits the same carry twice on a retry', async () => {
    const f = fixture();
    await f.settle('2025-08');
    expect((await f.settle('2025-08')).isAlreadySettled).toBe(true);
    expect(f.tx.bonusAdjustment.create).toHaveBeenCalledTimes(1);
    expect(f.tx.monthlyBonusResult.create).toHaveBeenCalledTimes(1);
    expect(f.sum()).toBe('-30000');
  });

  it('serializes concurrent settlements of different months on the shared ledger lock (simulation)', async () => {
    const f = fixture();
    let tail = Promise.resolve();
    f.prisma.$transaction.mockImplementation(async (callback) => {
      let release: (() => void) | undefined;
      const tx = {
        ...f.tx,
        $queryRaw: async (sql, key) => {
          const predecessor = tail;
          tail = new Promise<void>((resolve) => {
            release = resolve;
          });
          await predecessor;
          return f.tx.$queryRaw(sql, key);
        },
      };
      try {
        return await callback(tx);
      } finally {
        release?.();
      }
    });
    const [august, september] = await Promise.all([
      f.settle('2025-08'),
      f.settle('2025-09'),
    ]);
    expect(august.settlement.bonusAmount).toBe('0');
    expect(september.settlement.bonusAmount).toBe('30000');
    expect(f.tx.bonusAdjustment.create).toHaveBeenCalledTimes(1);
    expect(f.sum()).toBe('-30000');
  });

  it('fails before changing debt when no open carry month can be found', async () => {
    const f = fixture();
    f.tx.monthlyBonusResult.findUnique.mockImplementation(async ({ where }) =>
      where.storeId_collaboratorId_yearMonth.yearMonth === '2025-08'
        ? null
        : { id: 'closed' },
    );
    await expect(f.settle('2025-08')).rejects.toThrow('Không tìm thấy kỳ mở');
    expect(f.tx.bonusAdjustment.update).not.toHaveBeenCalled();
    expect(f.tx.bonusAdjustment.create).not.toHaveBeenCalled();
    expect(f.tx.monthlyBonusResult.create).not.toHaveBeenCalled();
  });
});

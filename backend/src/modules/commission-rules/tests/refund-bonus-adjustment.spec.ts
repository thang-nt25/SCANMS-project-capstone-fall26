import { Prisma } from '@prisma/client';
import { CommissionRulesService } from '../commission-rules.service';

const decimal = (value: string | number) => new Prisma.Decimal(value);

describe('Refund bonus incremental recovery', () => {
  function fixture(initial: Array<{ amount: number; status: string }> = []) {
    const adjustments = initial.map(({ amount, status }) => ({
      adjustmentAmount: decimal(amount),
      status,
    }));
    const events: string[] = [];
    const order = {
      id: 'order-a',
      storeId: 'store-a',
      attributedCollaboratorId: 'kol-a',
      completedAt: new Date('2026-09-15T00:00:00Z'),
      createdAt: new Date('2026-09-01T00:00:00Z'),
      finalAmount: decimal(1000000),
      refundedAmount: decimal(0),
      externalOrderSn: 'TEST-ONLY',
      rawPayload: {},
    };
    const tx = {
      $queryRaw: jest.fn(
        async (sql: TemplateStringsArray, ...values: unknown[]) => {
          events.push(
            sql.join('?').includes('pg_advisory')
              ? `lock:${values[0]}`
              : 'order-lock',
          );
          return [];
        },
      ),
      order: {
        findUnique: jest.fn(async () => ({ ...order })),
        update: jest.fn(async ({ data }) => {
          events.push('refund-write');
          order.refundedAmount = order.refundedAmount.add(
            data.refundedAmount.increment,
          );
        }),
      },
      orderRefund: {
        create: jest.fn(async ({ data }) => ({
          id: `refund-${order.refundedAmount}`,
          ...data,
        })),
      },
      couponRedemption: { findUnique: jest.fn(async () => null) },
      stackedVoucherRedemption: { findMany: jest.fn(async () => []) },
      orderItem: { findMany: jest.fn(async () => []) },
      commission: { findMany: jest.fn(async () => []) },
      commissionRule: { findMany: jest.fn(async () => []) },
      monthlyBonusResult: {
        findUnique: jest.fn(async ({ where }) =>
          where.storeId_collaboratorId_yearMonth.yearMonth === '2026-09'
            ? { id: 'settlement-a', bonusAmount: decimal(100000), status: 'PAID', ruleSnapshot: { rules: [], netBonus: '100000' } }
            : null,
        ),
      },
      bonusAdjustment: {
        aggregate: jest.fn(async () => ({
          _sum: {
            adjustmentAmount: adjustments
              .filter((a) => ['PENDING', 'APPLIED'].includes(a.status))
              .reduce((sum, a) => sum.add(a.adjustmentAmount), decimal(0)),
          },
        })),
        create: jest.fn(async ({ data }) => {
          const record = { id: `adjustment-${adjustments.length}`, ...data };
          adjustments.push(record);
          return record;
        }),
      },
      auditLog: { create: jest.fn(async () => ({})) },
    };
    const prisma = {
      store: { findUnique: jest.fn(async () => ({ id: order.storeId })) },
      order: { findFirst: jest.fn(async () => ({ ...order })) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new CommissionRulesService(prisma as any, { reverseAvailableBalance: jest.fn() } as any);
    jest.spyOn(service, 'calculateValidMonthlyRevenue').mockImplementation(
      async () =>
        ({
          validRevenue: decimal(100000).minus(order.refundedAmount).toString(),
        }) as any,
    );
    jest.spyOn(service, 'calculateProgressiveBonus').mockImplementation(
      (_, revenue) =>
        ({
          totalBonus: revenue.toString(),
        }) as any,
    );
    const refund = (amount: string) =>
      service.handleRefundAdjustment('store-a', 'order-a', amount, 'test');
    return { service, prisma, tx, adjustments, events, refund, order };
  }

  it('recovers 20,000 then only 10,000, not another 30,000', async () => {
    const f = fixture();
    const first = await f.refund('20000');
    const second = await f.refund('10000');
    expect(first.adjustment.adjustmentAmount.toString()).toBe('-20000');
    expect(second.adjustment.adjustmentAmount.toString()).toBe('-10000');
    expect(f.tx.bonusAdjustment.aggregate).toHaveBeenCalledWith({
      where: {
        storeId: 'store-a',
        collaboratorId: 'kol-a',
        originalSettlementId: 'settlement-a',
        status: { in: ['PENDING', 'APPLIED'] },
      },
      _sum: { adjustmentAmount: true },
    });
    expect(f.events.slice(0, 3)).toEqual([
      'lock:monthly-bonus:store-a:kol-a',
      'order-lock',
      'refund-write',
    ]);
  });

  it.each(['PENDING', 'APPLIED'])(
    'counts earlier %s deductions',
    async (status) => {
      const f = fixture([{ amount: -10000, status }]);
      expect(
        (await f.refund('20000')).adjustment.adjustmentAmount.toString(),
      ).toBe('-10000');
    },
  );

  it('does not deduct again or silently compensate historical over-recovery', async () => {
    const f = fixture([{ amount: -30000, status: 'APPLIED' }]);
    expect((await f.refund('20000')).adjustment).toBeNull();
    expect(f.tx.bonusAdjustment.create).not.toHaveBeenCalled();
  });

  it('ignores cancelled adjustments and retains exact cents', async () => {
    const f = fixture([{ amount: -10000, status: 'CANCELLED' }]);
    expect(
      (await f.refund('20000.01')).adjustment.adjustmentAmount.toString(),
    ).toBe('-20000.01');
  });

  it('skips bonus adjustment when the original month is not settled', async () => {
    const f = fixture();
    f.tx.monthlyBonusResult.findUnique.mockResolvedValue(null as any);
    expect((await f.refund('20000')).adjustment).toBeNull();
    expect(f.tx.bonusAdjustment.aggregate).not.toHaveBeenCalled();
  });

  it('rolls no further writes when the refund exceeds remaining order value', async () => {
    const f = fixture();
    await expect(f.refund('1000000.01')).rejects.toThrow();
    expect(f.tx.orderRefund.create).not.toHaveBeenCalled();
    expect(f.tx.bonusAdjustment.create).not.toHaveBeenCalled();
  });

  it('uses the same lock for different orders in the same store/KOL/month', async () => {
    const first = fixture();
    const second = fixture();
    second.order.id = 'order-b';
    await Promise.all([
      first.refund('20000'),
      second.service.handleRefundAdjustment(
        'store-a',
        'order-b',
        '10000',
        'test',
      ),
    ]);
    expect(first.events[0]).toBe(second.events[0]);
  });

  it('serializes simultaneous refunds before writes (transaction-lock simulation, no database)', async () => {
    const f = fixture();
    let lockTail = Promise.resolve();
    f.prisma.$transaction.mockImplementation(async (callback) => {
      let release: (() => void) | undefined;
      const transaction = {
        ...f.tx,
        $queryRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
          if (sql.join('?').includes('pg_advisory_xact_lock')) {
            const predecessor = lockTail;
            lockTail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await predecessor;
          }
          return f.tx.$queryRaw(sql, ...values);
        },
      };
      try {
        return await callback(transaction);
      } finally {
        release?.();
      }
    });
    const results = await Promise.all([f.refund('20000'), f.refund('10000')]);
    expect(
      results.map((r) => r.adjustment.adjustmentAmount.toString()),
    ).toEqual(['-20000', '-10000']);
    expect(f.order.refundedAmount.toString()).toBe('30000');
    expect(
      f.adjustments
        .reduce((sum, a) => sum.add(a.adjustmentAmount), decimal(0))
        .toString(),
    ).toBe('-30000');
  });
});

import {
  dealOrderWhere,
  dealWindow,
  evaluateDealKpi,
  validateDealKpi,
} from './deal-kpi.policy';
import { AffiliateDealsService } from './affiliate-deals.service';

describe('Deal KPI contract', () => {
  const deal = {
    productId: 'product',
    storeId: 'store',
    collaboratorId: 'creator',
    status: 'APPROVED',
    targetOrders: 10,
    commitmentStartedAt: new Date('2026-01-01T00:00:00Z'),
    commitmentEndsAt: new Date('2026-01-31T00:00:00Z'),
    settlementEndsAt: new Date('2026-02-14T00:00:00Z'),
  };
  it.each([undefined, 0, -1, 1.5, 1000001])(
    'rejects invalid order target %s',
    (target) => {
      expect(() => validateDealKpi(target, 30)).toThrow();
    },
  );
  it.each([undefined, 0, 367, 1.5])(
    'rejects invalid commitment length %s',
    (days) => {
      expect(() => validateDealKpi(10, days)).toThrow();
    },
  );
  it('starts the deadline at approval with fourteen settlement days', () => {
    expect(dealWindow(30, deal.commitmentStartedAt)).toEqual({
      commitmentStartedAt: deal.commitmentStartedAt,
      commitmentEndsAt: deal.commitmentEndsAt,
      settlementEndsAt: deal.settlementEndsAt,
    });
  });
  it('does not start an unapproved proposal', () => {
    expect(
      evaluateDealKpi(
        { ...deal, status: 'PENDING', commitmentStartedAt: null },
        0,
        0,
      ).state,
    ).toBe('PENDING');
  });
  it('never invents targets for legacy free-text commitments', () => {
    expect(
      evaluateDealKpi({ ...deal, targetOrders: null }, 0, 0),
    ).toMatchObject({ state: 'LEGACY', canTerminate: false });
  });
  it.each([
    ['2026-01-30', 0, 'ACTIVE', false],
    ['2026-01-31', 0, 'SETTLING', false],
    ['2026-02-13', 0, 'SETTLING', false],
    ['2026-02-14', 9, 'REVIEW_REQUIRED', true],
    ['2026-02-14', 10, 'ACHIEVED', false],
    ['2026-02-14', 11, 'ACHIEVED', false],
  ])(
    'evaluates exact boundary %s with %s orders',
    (date, count, state, canTerminate) => {
      expect(
        evaluateDealKpi(deal, Number(count), 1, new Date(String(date))),
      ).toMatchObject({ state, canTerminate });
    },
  );
  it('does not count pending orders as completed', () => {
    expect(evaluateDealKpi(deal, 3, 20, new Date('2026-02-15'))).toMatchObject({
      missingOrders: 7,
      percent: 30,
      state: 'REVIEW_REQUIRED',
    });
  });
  it('closed deals cannot receive another sanction', () => {
    expect(
      evaluateDealKpi({ ...deal, closedAt: new Date() }, 0, 0),
    ).toMatchObject({ state: 'CLOSED', canTerminate: false });
  });
  it('scopes distinct orders to product, shop, attribution and creation window', () => {
    expect(dealOrderWhere(deal)).toMatchObject({
      storeId: 'store',
      createdAt: { gte: deal.commitmentStartedAt, lt: deal.commitmentEndsAt },
      orderItems: {
        some: {
          productId: 'product',
          OR: [
            { referralLink: { collaboratorId: 'creator' } },
            {
              referralLinkId: null,
              order: { attributedCollaboratorId: 'creator' },
            },
          ],
        },
      },
    });
  });
  it('refuses sanctions before the settlement window without any writes', async () => {
    const prisma = {
      exclusiveDealProposal: {
        findUnique: jest.fn().mockResolvedValue({
          ...deal,
          settlementEndsAt: new Date('2999-01-01'),
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      store: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 'owner' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'store' }),
      },
      order: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    const service = new AffiliateDealsService(
      prisma as any,
      {} as any,
      {} as any,
    );
    await expect(
      service.terminateDeal('id', 'owner', 'SHOP_MANAGER', {
        reason: 'Chưa đủ chỉ tiêu',
      }),
    ).rejects.toThrow('Chưa thể chế tài');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('hides progress from unrelated users', async () => {
    const prisma = {
      exclusiveDealProposal: { findUnique: jest.fn().mockResolvedValue(deal) },
      store: { findUnique: jest.fn().mockResolvedValue({ ownerId: 'owner' }) },
      order: { count: jest.fn() },
    };
    const service = new AffiliateDealsService(
      prisma as any,
      {} as any,
      {} as any,
    );
    await expect(
      service.getProgress('id', 'intruder', 'COLLABORATOR'),
    ).rejects.toThrow('không có quyền');
    expect(prisma.order.count).not.toHaveBeenCalled();
  });
  it('counts completed nonrefunded orders only, by deadline', async () => {
    const prisma = {
      exclusiveDealProposal: { findUnique: jest.fn().mockResolvedValue(deal) },
      order: {
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2),
      },
    };
    const service = new AffiliateDealsService(
      prisma as any,
      {} as any,
      {} as any,
    );
    expect(
      await service.getProgress('id', 'creator', 'COLLABORATOR'),
    ).toMatchObject({ completedOrders: 3, pendingOrders: 2 });
    expect(prisma.order.count.mock.calls[0][0].where).toMatchObject({
      status: 'COMPLETED',
      refundedAmount: 0,
      completedAt: { lte: deal.settlementEndsAt },
    });
  });
});

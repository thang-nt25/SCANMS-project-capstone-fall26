import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardMetricType, LeaderboardScope, LeaderboardTimeRange } from './dto/leaderboard.dto';

describe('LeaderboardService', () => {
  const currentOrderGroups = [
    {
      attributedCollaboratorId: 'creator-a',
      _sum: { finalAmount: 1000 },
      _count: { _all: 1 },
    },
    {
      attributedCollaboratorId: 'creator-b',
      _sum: { finalAmount: 500 },
      _count: { _all: 2 },
    },
  ];
  const clickGroups = [
    { collaboratorId: 'creator-a', _count: { _all: 1 } },
    { collaboratorId: 'creator-b', _count: { _all: 10 } },
  ];
  const commissionGroups = [
    { collaboratorId: 'creator-a', _sum: { commissionAmount: 10 } },
    { collaboratorId: 'creator-b', _sum: { commissionAmount: 200 } },
  ];
  const creators = [
    {
      id: 'creator-a',
      fullName: 'Creator A',
      avatarUrl: 'https://cdn.scanms.vn/creator-a-account.jpg',
      collaboratorProfile: {
        avatarUrl: 'https://cdn.scanms.vn/creator-a-old-profile.jpg',
        tier: null,
      },
      socialChannels: [],
    },
    {
      id: 'creator-b',
      fullName: 'Creator B',
      collaboratorProfile: null,
      socialChannels: [],
    },
  ];

  const prisma = {
    order: { groupBy: jest.fn() },
    clickTrafficLog: { groupBy: jest.fn() },
    commission: { groupBy: jest.fn() },
    user: { findMany: jest.fn() },
    store: { findFirst: jest.fn() },
  } as any;
  const service = new LeaderboardService(prisma);

  beforeEach(() => jest.resetAllMocks());
  afterEach(() => jest.useRealTimers());

  function prepareQueries(metric = LeaderboardMetricType.REVENUE) {
    prisma.order.groupBy.mockResolvedValueOnce(currentOrderGroups);
    if (metric === LeaderboardMetricType.REVENUE) {
      prisma.order.groupBy.mockResolvedValueOnce([]);
    }
    prisma.clickTrafficLog.groupBy.mockResolvedValue(clickGroups);
    prisma.commission.groupBy.mockResolvedValue(commissionGroups);
    prisma.user.findMany.mockResolvedValue(creators);
  }

  function prepareCustom(orders: typeof currentOrderGroups, previous = [] as typeof currentOrderGroups) {
    prisma.order.groupBy.mockResolvedValueOnce(orders).mockResolvedValueOnce(previous);
    prisma.clickTrafficLog.groupBy.mockResolvedValue(clickGroups);
    prisma.commission.groupBy.mockResolvedValue(commissionGroups);
    prisma.user.findMany.mockResolvedValue(creators);
  }

  it('does not award ranks or prizes when the selected revenue metric is zero', async () => {
    prepareCustom([]);
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, {});
    expect(result.podium).toEqual({ rank1: null, rank2: null, rank3: null });
    expect(result.rankings).toEqual([]);
    expect(result.totalParticipants).toBe(0);
    expect(result.myRankStatus).toMatchObject({ myRank: null, myRevenue: 0, myOrders: 0 });
    // Clicks and commission alone do not manufacture a revenue rank.
    expect(result.myRankStatus?.myCommission).toBe(10);
  });

  it('shows only the available eligible creators and retains their assigned tier', async () => {
    prepareCustom([currentOrderGroups[0]]);
    prisma.user.findMany.mockResolvedValue([{ ...creators[0], collaboratorProfile: { tier: { name: 'Vàng (Gold)' } } }, creators[1]]);
    const result = await service.getLeaderboard('creator-b', UserRole.COLLABORATOR, {});
    expect(result.totalParticipants).toBe(1);
    expect(result.podium.rank1).toMatchObject({ collaboratorId: 'creator-a', rank: 1, tierName: 'Vàng (Gold)' });
    expect(result.podium.rank2).toBeNull();
    expect(result.podium.rank3).toBeNull();
    expect(result.podium.rank1?.bonusPrizeAmount).toBeUndefined();
    expect(result.podium.rank1?.badgeTitle).toBeUndefined();
    expect(result.myRankStatus?.myRank).toBeNull();
  });

  it('uses shared ranks for exact ties across the podium and subsequent table', async () => {
    const ids = ['creator-d', 'creator-c', 'creator-b', 'creator-a', 'creator-e'];
    prepareCustom(ids.map(id => ({ attributedCollaboratorId: id, _sum: { finalAmount: id === 'creator-e' ? 500 : 1000 }, _count: { _all: 1 } })));
    prisma.user.findMany.mockResolvedValue(ids.map(id => ({ ...creators[0], id, fullName: id })));
    const result = await service.getLeaderboard('creator-d', UserRole.COLLABORATOR, { limit: 20 });
    const all = [result.podium.rank1!, result.podium.rank2!, result.podium.rank3!, ...result.rankings];
    expect(all.map(item => item.collaboratorId)).toEqual(['creator-a', 'creator-b', 'creator-c', 'creator-d', 'creator-e']);
    expect(all.map(item => item.rank)).toEqual([1, 1, 1, 1, 5]);
    expect(result.myRankStatus?.myRank).toBe(1);
    expect(result.myRankStatus?.gapToNextRankRevenue).toBe(0);
  });

  it('uses order count as the revenue tiebreaker and applies the same rule to the previous period', async () => {
    const orders = currentOrderGroups.map(item => ({ ...item, _sum: { finalAmount: 1000 } }));
    prepareCustom(orders, [...orders].reverse());
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, {});
    expect(result.podium.rank1).toMatchObject({ collaboratorId: 'creator-b', rank: 1, rankDelta: 0 });
    expect(result.podium.rank2).toMatchObject({ collaboratorId: 'creator-a', rank: 2, rankDelta: 0 });
    expect(result.myRankStatus?.gapToNextRankRevenue).toBe(0);
  });

  it.each([LeaderboardMetricType.ORDERS, LeaderboardMetricType.CONVERSION_RATE, LeaderboardMetricType.COMMISSION])('does not rank zero results for %s', async metric => {
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.clickTrafficLog.groupBy.mockResolvedValue(clickGroups);
    prisma.commission.groupBy.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue(creators);
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, { metric });
    expect(result.totalParticipants).toBe(0);
    expect(result.myRankStatus?.myRank).toBeNull();
    expect(result.podium.rank1).toBeNull();
  });

  it('includes prior-created orders delivered this month, falls back to completion, and never counts delivery twice', async () => {
    const records = [
      { createdAt: new Date('2026-09-01'), deliveredAt: new Date('2026-10-02'), completedAt: new Date('2026-10-03'), amount: 1000 },
      { createdAt: new Date('2026-09-01'), deliveredAt: null, completedAt: new Date('2026-10-04'), amount: 2000 },
      { createdAt: new Date('2026-10-01'), deliveredAt: new Date('2026-09-30T16:00:00Z'), completedAt: new Date('2026-10-05'), amount: 4000 },
      { createdAt: new Date('2026-10-01'), deliveredAt: null, completedAt: null, amount: 8000 },
    ];
    prisma.order.groupBy.mockImplementation(({ where }: any) => {
      expect(where.createdAt).toBeUndefined();
      const matched = records.filter(record => where.OR.some((branch: any) => Object.entries(branch).every(([field, filter]) => {
        const value = record[field as keyof typeof record];
        if (filter === null) return value === null;
        const range = filter as { gte: Date; lte: Date };
        return value instanceof Date && value >= range.gte && value <= range.lte;
      })));
      return [{ attributedCollaboratorId: 'creator-a', _sum: { finalAmount: matched.reduce((sum, record) => sum + record.amount, 0) }, _count: { _all: matched.length } }];
    });
    prisma.clickTrafficLog.groupBy.mockResolvedValue([]);
    prisma.commission.groupBy.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue(creators);
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, { month: 10, year: 2026 });
    expect(result.podium.rank1).toMatchObject({ grossRevenue: 3000, totalOrders: 2 });
    expect(prisma.commission.groupBy.mock.calls[0][0].where.order.is.OR).toEqual(prisma.order.groupBy.mock.calls[0][0].where.OR);
    expect(prisma.commission.groupBy.mock.calls[0][0].where.status).toEqual({ in: ['APPROVED', 'PAID'] });
  });

  it('uses Vietnam month boundaries and a complete previous calendar month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T18:00:00Z'));
    prepareCustom([]);
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, {});
    expect(result.periodLabel).toBe('Tháng 10/2026');
    expect(prisma.order.groupBy.mock.calls[0][0].where.OR[0].deliveredAt).toEqual({
      gte: new Date('2026-09-30T17:00:00Z'), lte: new Date('2026-10-31T16:59:59.999Z'),
    });
    expect(prisma.order.groupBy.mock.calls[1][0].where.OR[0].deliveredAt).toEqual({
      gte: new Date('2026-08-31T17:00:00Z'), lte: new Date('2026-09-30T16:59:59.999Z'),
    });
  });

  it('includes successful undated legacy orders in all time and has no previous all-time rank', async () => {
    prisma.order.groupBy.mockResolvedValue(currentOrderGroups);
    prisma.clickTrafficLog.groupBy.mockResolvedValue([]);
    prisma.commission.groupBy.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue(creators);
    const result = await service.getLeaderboard('creator-a', UserRole.COLLABORATOR, { timeRange: LeaderboardTimeRange.ALL_TIME });
    expect(prisma.order.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.order.groupBy.mock.calls[0][0].where.OR).toBeUndefined();
    expect(result.podium.rank1).toMatchObject({ grossRevenue: 1000, rankDelta: 0 });
  });

  it('sorts each selected metric using its own values', async () => {
    prepareQueries(LeaderboardMetricType.CONVERSION_RATE);
    const byConversion = await service.getLeaderboard(
      'admin',
      UserRole.SYSTEM_ADMIN,
      {
        metric: LeaderboardMetricType.CONVERSION_RATE,
      },
    );
    expect(byConversion.podium.rank1?.collaboratorId).toBe('creator-a');
    expect(byConversion.podium.rank1?.avatarUrl).toBe(
      'https://cdn.scanms.vn/creator-a-account.jpg',
    );

    prepareQueries(LeaderboardMetricType.ORDERS);
    const byOrders = await service.getLeaderboard(
      'admin',
      UserRole.SYSTEM_ADMIN,
      {
        metric: LeaderboardMetricType.ORDERS,
      },
    );
    expect(byOrders.podium.rank1?.collaboratorId).toBe('creator-b');

    prepareQueries(LeaderboardMetricType.COMMISSION);
    const byCommission = await service.getLeaderboard(
      'admin',
      UserRole.SYSTEM_ADMIN,
      {
        metric: LeaderboardMetricType.COMMISSION,
      },
    );
    expect(byCommission.podium.rank1?.collaboratorId).toBe('creator-b');
  });

  it('requires an admin to choose a store and scopes shop manager clicks to their store', async () => {
    await expect(
      service.getLeaderboard('admin', UserRole.SYSTEM_ADMIN, {
        scope: LeaderboardScope.STORE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.store.findFirst.mockResolvedValue({ id: 'store-1' });
    prepareQueries(LeaderboardMetricType.CONVERSION_RATE);
    const result = await service.getLeaderboard(
      'shop-owner',
      UserRole.SHOP_MANAGER,
      {
        scope: LeaderboardScope.STORE,
        metric: LeaderboardMetricType.CONVERSION_RATE,
      },
    );

    expect(prisma.store.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'shop-owner' }),
      }),
    );
    expect(prisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store-1' }),
      }),
    );
    expect(prisma.clickTrafficLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store-1', isValid: true }),
      }),
    );
    expect(result.podium.rank1?.collaboratorId).toBe('creator-a');
  });
});

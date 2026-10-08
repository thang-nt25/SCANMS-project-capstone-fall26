import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardMetricType, LeaderboardScope } from './dto/leaderboard.dto';

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

  beforeEach(() => jest.clearAllMocks());

  function prepareQueries(metric = LeaderboardMetricType.REVENUE) {
    prisma.order.groupBy.mockResolvedValueOnce(currentOrderGroups);
    if (metric === LeaderboardMetricType.REVENUE) {
      prisma.order.groupBy.mockResolvedValueOnce([]);
    }
    prisma.clickTrafficLog.groupBy.mockResolvedValue(clickGroups);
    prisma.commission.groupBy.mockResolvedValue(commissionGroups);
    prisma.user.findMany.mockResolvedValue(creators);
  }

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

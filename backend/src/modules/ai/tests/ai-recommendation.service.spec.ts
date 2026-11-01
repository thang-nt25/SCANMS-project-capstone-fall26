import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AiRecommendationService } from '../ai-recommendation.service';
import { PriceRangeFilter } from '../dto/ai-recommendation.dto';

describe('KOL recommendations from real attribution records', () => {
  const creator = (id: string, tier = 'Vàng') => ({
    id,
    fullName: id,
    email: `${id}@example.test`,
    collaboratorProfile: {
      tier: { name: tier },
      kycStatus: 'VERIFIED',
      bio: 'Chuyên mỹ phẩm & skincare',
    },
    socialChannels: [],
  });
  const item = (collaboratorId: string, price: number, quantity = 1) => ({
    unitPrice: price,
    quantity,
    product: { categoryName: 'Mỹ phẩm & Làm đẹp' },
    referralLink: { collaboratorId },
  });
  let prisma: any;
  let service: AiRecommendationService;
  beforeEach(() => {
    prisma = {
      product: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'product',
          title: 'Sản phẩm',
          price: 350000,
          categoryName: 'Mỹ phẩm & Làm đẹp',
          customCommissionRate: 0,
          store: { id: 'store', ownerId: 'owner', defaultCommissionRate: 10 },
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([creator('a'), creator('b')]),
      },
      store: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      clickTrafficLog: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    service = new AiRecommendationService(prisma);
  });

  it('requires active, undeleted, verified creators and valid unique traffic', async () => {
    await service.getRecommendedKols({}, 'owner', UserRole.SHOP_MANAGER);
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({
      isActive: true,
      isDeleted: false,
      collaboratorProfile: { is: { kycStatus: 'VERIFIED' } },
    });
    expect(prisma.clickTrafficLog.groupBy.mock.calls[0][0].where).toMatchObject(
      { isValid: true, isUnique: true },
    );
  });

  it('uses the profile avatar first and falls back to the account avatar', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        ...creator('a'),
        avatarUrl: '/account-a.jpg',
        collaboratorProfile: {
          ...creator('a').collaboratorProfile,
          avatarUrl: '/profile-a.jpg',
        },
      },
      { ...creator('b'), avatarUrl: '/account-b.jpg' },
      creator('c'),
    ]);
    const result = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'a')?.avatarUrl,
    ).toBe('/profile-a.jpg');
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'b')?.avatarUrl,
    ).toBe('/account-b.jpg');
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'c')?.avatarUrl,
    ).toBeUndefined();
  });

  it('separates the dev cold-start scoring priors from actual sales history', async () => {
    const result = await service.getRecommendedKols(
      { productId: 'product' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    const kol = result.recommendedKols[0];
    expect(kol.scoreBreakdown).toMatchObject({
      categoryScore: 88,
      conversionRateScore: 0,
      priceFitScore: 78,
    });
    expect(kol.isRisingStar).toBe(true);
    expect(kol.matchLevel).toBe('✨ Tiềm Năng Mới (Rising Star)');
    expect(kol.lifetimeStats).toMatchObject({
      totalOrders: 0,
      grossRevenue: 0,
      conversionRate: 0,
      totalClicks: 0,
    });
    expect(kol.aiReasoning).toContain('chưa đủ dữ liệu');
    expect(result.targetProduct?.commissionRate).toBe(0);
    expect(kol.categoryMatchSource).toBe('PROFILE');
    expect(kol.aiReasoning).toContain('chưa có đơn hoàn tất trong ngành này');
  });

  it('excludes an unrelated tech seller even with high tier and conversion', async () => {
    const tech = creator('tech', 'Kim cương');
    tech.collaboratorProfile.bio = 'Chuyên review công nghệ và tai nghe';
    prisma.user.findMany.mockResolvedValue([tech, creator('beauty')]);
    prisma.order.findMany.mockResolvedValue([
      {
        orderItems: [
          {
            ...item('tech', 350000),
            product: { categoryName: 'Phụ kiện Âm thanh' },
          },
        ],
      },
    ]);
    prisma.clickTrafficLog.groupBy.mockResolvedValue([
      { collaboratorId: 'tech', _count: { _all: 1 } },
    ]);
    const result = await service.getRecommendedKols(
      { productId: 'product' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols.map((k) => k.collaboratorId)).toEqual([
      'beauty',
    ]);
  });

  it('matches skincare sales to the broader beauty catalog category', async () => {
    const seller = creator('seller');
    seller.collaboratorProfile.bio = '';
    prisma.user.findMany.mockResolvedValue([seller]);
    prisma.order.findMany.mockResolvedValue([
      {
        orderItems: [
          {
            ...item('seller', 350000),
            product: { categoryName: 'Chăm sóc da' },
          },
        ],
      },
    ]);
    const result = await service.getRecommendedKols(
      { productId: 'product' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols[0].categoryMatchSource).toBe('SALES');
    expect(result.recommendedKols[0].scoreBreakdown.categoryScore).toBe(75);
  });

  it('does not replace the product category with a conflicting category filter', async () => {
    const result = await service.getRecommendedKols(
      { productId: 'product', category: 'Công nghệ & Thiết bị số' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.targetProduct?.category).toBe('Mỹ phẩm & Làm đẹp');
    expect(result.recommendedKols).toEqual([]);
  });

  it('does not fall back to unrelated creators when none have category evidence', async () => {
    const unknown = creator('unknown');
    unknown.collaboratorProfile.bio = '';
    prisma.user.findMany.mockResolvedValue([unknown]);
    const result = await service.getRecommendedKols(
      { productId: 'product' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols).toEqual([]);
  });

  it('requires a category for an uncategorized product instead of ranking all creators', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'product',
      price: 350000,
      store: { ownerId: 'owner' },
    });
    await expect(
      service.getRecommendedKols(
        { productId: 'product' },
        'owner',
        UserRole.SHOP_MANAGER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    const result = await service.getRecommendedKols(
      { productId: 'product', category: 'Mỹ phẩm' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols).toHaveLength(2);
  });

  it('uses channel descriptions as profile evidence without counting them as sales', async () => {
    const channelCreator: any = creator('channel');
    channelCreator.collaboratorProfile.bio = '';
    channelCreator.socialChannels = [
      {
        id: 'channel',
        platformName: 'TIKTOK',
        channelName: 'Linh Beauty',
        channelUrl: '',
        followerCount: 0,
      },
    ];
    prisma.user.findMany.mockResolvedValue([channelCreator]);
    const result = await service.getRecommendedKols(
      { productId: 'product' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols[0].categoryMatchSource).toBe('PROFILE');
    expect(result.recommendedKols[0].lifetimeStats.totalOrders).toBe(0);
  });

  it('counts a multi-KOL order once per KOL and attributes only their own items', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        attributedCollaboratorId: 'a',
        orderItems: [
          item('a', 350000, 2),
          item('a', 350000),
          item('b', 120000),
        ],
      },
    ]);
    const result = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'a')
        ?.lifetimeStats,
    ).toMatchObject({ totalOrders: 1, grossRevenue: 1050000 });
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'b')
        ?.lifetimeStats,
    ).toMatchObject({ totalOrders: 1, grossRevenue: 120000 });
  });

  it('filters price by KOL sales history instead of the selected product price', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        attributedCollaboratorId: 'a',
        orderItems: [item('a', 100000), item('b', 350000)],
      },
    ]);
    const result = await service.getRecommendedKols(
      { productId: 'product', priceRange: PriceRangeFilter.UNDER_200K },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols.map((k) => k.collaboratorId)).toEqual(['a']);
  });

  it('discounts an apparently perfect conversion ratio with only one click', async () => {
    prisma.order.findMany.mockResolvedValue([
      { attributedCollaboratorId: 'a', orderItems: [item('a', 350000)] },
    ]);
    prisma.clickTrafficLog.groupBy.mockResolvedValue([
      { collaboratorId: 'a', _count: { _all: 1 } },
    ]);
    const result = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(
      result.recommendedKols.find((k) => k.collaboratorId === 'a')!
        .scoreBreakdown.conversionRateScore,
    ).toBeLessThan(10);
  });

  it('rejects another shop product before scanning the database', async () => {
    await expect(
      service.getRecommendedKols(
        { productId: 'product' },
        'other-owner',
        UserRole.SHOP_MANAGER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('does not inflate followers or repeat the same social channel', async () => {
    const c: any = creator('a', 'Chưa xếp hạng');
    c.socialChannels = [0, 1].map((id) => ({
      id: String(id),
      platformName: 'TIKTOK',
      channelUrl: 'https://www.tiktok.com/@test',
      channelName: '@test',
      followerCount: 60000,
    }));
    prisma.user.findMany.mockResolvedValue([c]);
    const result = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.recommendedKols[0].socialChannels).toHaveLength(1);
    expect(result.recommendedKols[0].socialChannels[0].followerCount).toBe(
      60000,
    );
    // Dev now gives cold-start profiles with 50k+ followers a prior score of 75.
    expect(result.recommendedKols[0].scoreBreakdown.tierAndSocialScore).toBe(
      75,
    );
  });

  it('does not lower a Gold profile score when its cold-start follower count increases', async () => {
    const c: any = creator('gold', 'Vàng');
    prisma.user.findMany.mockResolvedValue([c]);
    const original = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    c.socialChannels = [
      {
        id: 'social',
        platformName: 'TIKTOK',
        channelName: 'Beauty',
        channelUrl: 'https://tiktok.com/@fixture',
        followerCount: 60000,
      },
    ];
    const updated = await service.getRecommendedKols(
      {},
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(
      updated.recommendedKols[0].scoreBreakdown.tierAndSocialScore,
    ).toBeGreaterThanOrEqual(
      original.recommendedKols[0].scoreBreakdown.tierAndSocialScore,
    );
  });

  it('keeps the caller permissions and scopes detailed analysis to the requested KOL', async () => {
    prisma.user.findMany.mockResolvedValue([creator('b')]);
    const result = await service.analyzeMatch(
      { productId: 'product', collaboratorId: 'b' },
      'owner',
      UserRole.SHOP_MANAGER,
    );
    expect(result.collaborator.collaboratorId).toBe('b');
    expect(prisma.user.findMany.mock.calls[0][0].where.id).toBe('b');
    await expect(
      service.analyzeMatch(
        { productId: 'product', collaboratorId: 'b' },
        'other-owner',
        UserRole.SHOP_MANAGER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('authorization and cached recommendations', () => {
    let cache: { get: jest.Mock; set: jest.Mock };
    beforeEach(() => {
      const values = new Map<string, unknown>();
      cache = {
        get: jest.fn(async (key: string) => values.get(key)),
        set: jest.fn(async (key: string, value: unknown) => {
          values.set(key, value);
        }),
      };
      service = new AiRecommendationService(prisma, cache as any);
    });

    it('rejects a foreign shop even after an authorized caller warmed the cache', async () => {
      await service.getRecommendedKols(
        { productId: 'product' },
        'owner',
        UserRole.SHOP_MANAGER,
      );
      cache.get.mockClear();
      await expect(
        service.getRecommendedKols(
          { productId: 'product' },
          'stranger',
          UserRole.SHOP_MANAGER,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(cache.get).not.toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('allows assigned staff but rechecks their assignment on a cache hit', async () => {
      prisma.store.findFirst.mockResolvedValueOnce({ id: 'store' });
      const result = await service.getRecommendedKols(
        { productId: 'product' },
        'staff',
        UserRole.SHOP_MANAGER,
      );
      expect(result.targetProduct?.productId).toBe('product');
      expect(prisma.store.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'store',
            OR: expect.arrayContaining([
              {
                staffMembers: {
                  some: {
                    id: 'staff',
                    role: 'SHOP_MANAGER',
                    isActive: true,
                    isDeleted: false,
                  },
                },
              },
            ]),
          }),
        }),
      );
      // A subsequent request after removal from the store cannot reuse old data.
      await expect(
        service.getRecommendedKols(
          { productId: 'product' },
          'staff',
          UserRole.SHOP_MANAGER,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(cache.get).toHaveBeenCalledTimes(1);
    });

    it('does not return cached results after the target product becomes unavailable', async () => {
      await service.getRecommendedKols(
        { productId: 'product' },
        'owner',
        UserRole.SHOP_MANAGER,
      );
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.getRecommendedKols(
          { productId: 'product' },
          'owner',
          UserRole.SHOP_MANAGER,
        ),
      ).rejects.toThrow('Không tìm thấy sản phẩm');
      expect(cache.get).toHaveBeenCalledTimes(1);
    });

    it('separates price, conversion, category, tier, limit, actor and detailed-analysis results', async () => {
      const variants = [
        {},
        { priceRange: PriceRangeFilter.UNDER_200K },
        { minConversionRate: 1 },
        { category: 'Mỹ phẩm' },
        { minTier: 'GOLD' },
        { limit: 1 },
      ];
      for (const query of variants) {
        await service.getRecommendedKols(query, 'owner', UserRole.SHOP_MANAGER);
      }
      await service.getRecommendedKols({}, 'staff', UserRole.SHOP_MANAGER);
      await service.getRecommendedKols({}, 'owner', UserRole.SYSTEM_ADMIN);
      await service.getRecommendedKols({}, 'owner', UserRole.SHOP_MANAGER, 'a');
      expect(new Set(cache.set.mock.calls.map(([key]) => key)).size).toBe(9);
      const scanCount = prisma.user.findMany.mock.calls.length;
      await service.getRecommendedKols({}, 'owner', UserRole.SHOP_MANAGER);
      expect(prisma.user.findMany).toHaveBeenCalledTimes(scanCount);
    });

    it('does not reuse an unfiltered result when the conversion threshold changes', async () => {
      const initial = await service.getRecommendedKols(
        {},
        'owner',
        UserRole.SHOP_MANAGER,
      );
      const filtered = await service.getRecommendedKols(
        { minConversionRate: 5 },
        'owner',
        UserRole.SHOP_MANAGER,
      );
      expect(initial.recommendedKols).toHaveLength(2);
      expect(filtered.recommendedKols).toEqual([]);
    });
  });
});

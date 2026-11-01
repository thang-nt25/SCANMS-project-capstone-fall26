import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TiersService } from './tiers.service';

const tier = (id: string, name: string, threshold: number, bonus: number) => ({
  id,
  name,
  minRevenueThreshold: new Prisma.Decimal(threshold),
  extraBonusPercentage: new Prisma.Decimal(bonus),
  createdAt: new Date('2026-01-01'),
});
const bronze = tier('bronze', 'Đồng (Bronze)', 0, 0);
const silver = tier('silver', 'Bạc (Silver)', 20_000_000, 1);
const gold = tier('gold', 'Vàng (Gold)', 50_000_000, 2);
const diamond = tier('diamond', 'Kim Cương (Diamond)', 100_000_000, 3);
const policies = [bronze, silver, gold, diamond];

describe('TiersService applied tier and previous-month progression', () => {
  let prisma: any;
  let service: TiersService;

  beforeEach(() => {
    prisma = {
      collaboratorTier: { findMany: jest.fn().mockResolvedValue(policies) },
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile',
          userId: 'creator',
          tier: bronze,
        }),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            subtotalAmount: new Prisma.Decimal(1_261_000),
            couponDiscountAmount: new Prisma.Decimal(100_000),
            finalAmount: new Prisma.Decimal(1_200_000),
            refundedAmount: new Prisma.Decimal(0),
          },
        ]),
      },
    };
    prisma.notification = { create: jest.fn() };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    service = new TiersService(prisma);
  });

  it('preserves the assigned tier during grace and exposes its maintenance target', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      id: 'profile',
      userId: 'creator',
      tier: gold,
    });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier).toMatchObject({
      id: 'gold',
      extraBonusPercentage: 2,
    });
    expect(status.qualifiedTier.id).toBe('gold');
    expect(status.nextTier?.id).toBe('diamond');
    expect(status.revenueNeeded).toBe(98_839_000);
    expect(status.progressPercentage).toBe(1);
    expect(status.cycleStatus).toBe('GRACE_PERIOD');
    expect(status.stepDownTier?.id).toBe('silver');
    expect(status.revenueBasis).toBe('PREVIOUS_MONTH_VIETNAM');
    expect(status.currentRevenue).toBe(1_161_000);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          subtotalAmount: true,
          couponDiscountAmount: true,
          refundedAmount: true,
        }),
        where: expect.objectContaining({
          attributedCollaboratorId: 'creator',
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      }),
    );
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('collapses identical policies without changing their stored IDs', async () => {
    prisma.collaboratorTier.findMany.mockResolvedValue([
      bronze,
      { ...bronze, id: 'bronze-duplicate' },
      silver,
      { ...silver, id: 'silver-duplicate' },
      gold,
      diamond,
    ]);
    const catalog = await service.getAllTiers();
    expect(catalog.map((item) => item.id)).toEqual([
      'bronze',
      'silver',
      'gold',
      'diamond',
    ]);
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      tier: { ...bronze, id: 'bronze-duplicate' },
    });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('bronze-duplicate');
    expect(status.nextTier?.id).toBe('silver');
    expect(status.progressPercentage).toBe(6);
    expect(status.revenueNeeded).toBe(18_839_000);
  });

  it('persists a missed promotion and returns the same applied and qualified tier', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-2',
        subtotalAmount: 50_000_000,
        couponDiscountAmount: 0,
        finalAmount: 50_000_000,
        refundedAmount: 0,
      },
    ]);
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('gold');
    expect(status.qualifiedTier.id).toBe('gold');
    expect(status.nextTier?.id).toBe('diamond');
    expect(status.progressPercentage).toBe(50);
    expect(status.revenueNeeded).toBe(50_000_000);
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
  });

  it('returns no next tier when the GMV qualifies for the highest threshold', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({ tier: diamond });
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'gmv',
        subtotalAmount: 100_000_000,
        couponDiscountAmount: 0,
        finalAmount: 100_000_000,
        refundedAmount: 0,
      },
    ]);
    const status = await service.getMyTierStatus('creator');
    expect(status.nextTier).toBeNull();
    expect(status.progressPercentage).toBe(100);
  });

  it('shows Bronze and the Silver milestone for the reported 960,000 VND example', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      id: 'profile',
      userId: 'creator',
      tier: bronze,
    });
    prisma.collaboratorTier.findMany.mockResolvedValue([
      bronze,
      { ...silver, minRevenueThreshold: new Prisma.Decimal(5_000_000) },
      { ...gold, minRevenueThreshold: new Prisma.Decimal(20_000_000) },
      { ...diamond, minRevenueThreshold: new Prisma.Decimal(50_000_000) },
    ]);
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'gmv',
        subtotalAmount: 960000,
        couponDiscountAmount: 0,
        finalAmount: 960000,
        refundedAmount: 0,
      },
    ]);
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('bronze');
    expect(status.qualifiedTier.id).toBe('bronze');
    expect(status.nextTier?.id).toBe('silver');
    expect(status.progressPercentage).toBe(19); // 960,000 / 5,000,000
    expect(status.revenueNeeded).toBe(4_040_000);
  });

  it('reduces prior-month goods GMV proportionally after a partial refund', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-refunded',
        subtotalAmount: 1_000_000,
        couponDiscountAmount: 100_000,
        finalAmount: 1_000_000,
        refundedAmount: 250_000,
      },
    ]);
    const status = await service.getMyTierStatus('creator');
    expect(status.currentRevenue).toBe(675_000);
    expect(status.totalOrders).toBe(1);
  });

  it('excludes a fully refunded order from net GMV and valid order count', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-refunded',
        subtotalAmount: 1_000_000,
        couponDiscountAmount: 100_000,
        finalAmount: 1_000_000,
        refundedAmount: 1_000_000,
      },
    ]);
    const status = await service.getMyTierStatus('creator');
    expect(status.currentRevenue).toBe(0);
    expect(status.totalOrders).toBe(0);
  });

  it('returns a clear error for missing policy configuration or a missing profile', async () => {
    prisma.collaboratorTier.findMany.mockResolvedValue([]);
    await expect(service.getMyTierStatus('creator')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.evaluateAllCollaborators()).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.collaboratorProfile.findUnique.mockResolvedValue(null);
    await expect(service.getMyTierStatus('creator')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('does not reassign profiles just because equivalent policies have duplicate IDs', async () => {
    prisma.collaboratorProfile.findMany.mockResolvedValue([
      {
        id: 'profile',
        userId: 'creator',
        tier: { ...bronze, id: 'duplicate' },
      },
    ]);
    const result = await service.evaluateAllCollaborators();
    expect(result.updatedCount).toBe(0);
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
  });

  it('normalizes legacy catalog percentages without exposing Gold 3 or Diamond 5', async () => {
    prisma.collaboratorTier.findMany.mockResolvedValue([
      bronze,
      silver,
      { ...gold, extraBonusPercentage: new Prisma.Decimal(3) },
      { ...diamond, extraBonusPercentage: new Prisma.Decimal(5) },
    ]);
    const catalog = await service.getAllTiers();
    expect(
      catalog.map((policy) => Number(policy.extraBonusPercentage)),
    ).toEqual([0, 1, 2, 3]);
  });

  it('uses exact Vietnam prior-month boundaries and total goods discount', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:05:00+07:00'));
    try {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'net',
          subtotalAmount: 1000000,
          discountAmount: 150000,
          couponDiscountAmount: 50000,
          finalAmount: 850000,
          refundedAmount: 0,
        },
      ]);
      const status = await service.getMyTierStatus('creator');
      expect(status.currentRevenue).toBe(950000);
      expect(status.assessmentPeriod).toEqual({
        startsAt: '2026-08-31T17:00:00.000Z',
        endsAt: '2026-09-30T17:00:00.000Z',
      });
      expect(status.nextEvaluationAt).toBe('2026-09-30T17:15:00.000Z');
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-08-31T17:00:00Z'),
              lt: new Date('2026-09-30T17:00:00Z'),
            },
          }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('evaluates the prior-month GMV and can promote and demote automatically', async () => {
    prisma.collaboratorProfile.findMany.mockResolvedValue([
      { id: 'new-gold', userId: 'up', tier: bronze },
      { id: 'new-bronze', userId: 'down', tier: diamond },
    ]);
    prisma.order.findMany.mockImplementation(async ({ where }: any) =>
      where.attributedCollaboratorId === 'up'
        ? [
            {
              id: 'gmv',
              subtotalAmount: 50000000,
              finalAmount: 50000000,
              refundedAmount: 0,
            },
          ]
        : [],
    );
    await service.evaluateAllCollaborators();
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 'new-gold', tierId: 'bronze' },
      data: { tierId: 'gold' },
    });
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 'new-bronze', tierId: 'diamond' },
      data: { tierId: 'gold' },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'up',
        title: 'Bạn đã lên hạng Vàng (Gold)',
        type: 'TIER_UPDATED',
        data: expect.objectContaining({
          actionUrl: '/collaborator/tiers',
          oldTier: bronze.name,
          newTier: gold.name,
          previousBonus: 0,
          newBonus: 2,
          revenue: 50000000,
          threshold: 50000000,
        }),
      }),
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('schedules the next month correctly after the monthly run, including a 31-day month', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T12:00:00+07:00'));
    try {
      const status = await service.getMyTierStatus('creator');
      expect(status.nextEvaluationAt).toBe('2026-10-31T17:15:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not notify twice if another evaluation already changed the assigned tier', async () => {
    prisma.collaboratorProfile.findMany.mockResolvedValue([
      { id: 'profile', userId: 'up', tier: diamond },
    ]);
    prisma.collaboratorProfile.updateMany.mockResolvedValue({ count: 0 });
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      id: 'profile',
      userId: 'up',
      tier: gold,
    });
    const result = await service.evaluateAllCollaborators();
    expect(result.updatedCount).toBe(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('catches up the previous-month evaluation when the server starts after the monthly schedule', async () => {
    const evaluation = jest
      .spyOn(service, 'evaluateAllCollaborators')
      .mockResolvedValue({ message: 'done', updatedCount: 0, details: [] });
    await service.onApplicationBootstrap();
    expect(evaluation).toHaveBeenCalledTimes(1);
  });

  it('does not rewrite the profile or notify again when the saved rank already matches GMV', async () => {
    await service.getMyTierStatus('creator');
    await service.getMyTierStatus('creator');
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('uses a concurrently promoted rank without duplicating its notification', async () => {
    prisma.collaboratorProfile.findUnique
      .mockResolvedValueOnce({ id: 'profile', userId: 'creator', tier: bronze })
      .mockResolvedValueOnce({ id: 'profile', userId: 'creator', tier: gold });
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'gmv',
        subtotalAmount: 50000000,
        finalAmount: 50000000,
        couponDiscountAmount: 0,
        refundedAmount: 0,
      },
    ]);
    prisma.collaboratorProfile.updateMany.mockResolvedValue({ count: 0 });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('gold');
    expect(status.qualifiedTier.id).toBe('gold');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('returns a retryable conflict rather than a tier inconsistent with persisted commission data', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      id: 'profile',
      userId: 'creator',
      tier: bronze,
    });
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'gmv',
        subtotalAmount: 50000000,
        finalAmount: 50000000,
        couponDiscountAmount: 0,
        refundedAmount: 0,
      },
    ]);
    prisma.collaboratorProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.getMyTierStatus('creator')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it.each([
    [0, 'bronze'],
    [19_999_999, 'bronze'],
    [20_000_000, 'silver'],
    [49_999_999, 'silver'],
    [50_000_000, 'gold'],
    [100_000_000, 'diamond'],
  ])(
    'persists the rank at the exact configured GMV boundary %s',
    async (amount, tierId) => {
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'boundary',
          subtotalAmount: amount,
          finalAmount: amount,
          refundedAmount: 0,
        },
      ]);
      const status = await service.getMyTierStatus('creator');
      expect(status.currentTier.id).toBe(tierId);
      expect(status.qualifiedTier.id).toBe(tierId);
    },
  );
});

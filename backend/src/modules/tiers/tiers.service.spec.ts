import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TiersService } from './tiers.service';

const tier = (id: string, name: string, threshold: number, bonus: number) => ({
  id, name, minRevenueThreshold: new Prisma.Decimal(threshold),
  extraBonusPercentage: new Prisma.Decimal(bonus), createdAt: new Date('2026-01-01'),
});
const bronze = tier('bronze', 'Đồng (Bronze)', 0, 0);
const silver = tier('silver', 'Bạc (Silver)', 20_000_000, 1);
const gold = tier('gold', 'Vàng (Gold)', 50_000_000, 3);
const diamond = tier('diamond', 'Kim Cương (Diamond)', 100_000_000, 5);
const policies = [bronze, silver, gold, diamond];

describe('TiersService applied tier and cumulative progression', () => {
  let prisma: any;
  let service: TiersService;

  beforeEach(() => {
    prisma = {
      collaboratorTier: { findMany: jest.fn().mockResolvedValue(policies) },
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'profile', userId: 'creator', tier: bronze }),
        findMany: jest.fn(), update: jest.fn(),
      },
      order: { aggregate: jest.fn().mockResolvedValue({
        _sum: { finalAmount: new Prisma.Decimal(1_161_000) }, _count: { id: 1 },
      }) },
    };
    service = new TiersService(prisma);
  });

  it('uses the assigned tier that the leaderboard and commissions apply', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({ tier: gold });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier).toMatchObject({ id: 'gold', extraBonusPercentage: 3 });
    expect(status.qualifiedTier.id).toBe('bronze');
    expect(status.nextTier?.id).toBe('diamond');
    expect(status.revenueNeeded).toBe(98_839_000);
    expect(status.progressPercentage).toBe(0);
    expect(status.revenueBasis).toBe('LIFETIME');
    expect(prisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { attributedCollaboratorId: 'creator', status: { in: ['COMPLETED', 'DELIVERED'] } },
    }));
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
  });

  it('collapses identical policies without changing their stored IDs', async () => {
    prisma.collaboratorTier.findMany.mockResolvedValue([
      bronze, { ...bronze, id: 'bronze-duplicate' }, silver, { ...silver, id: 'silver-duplicate' }, gold, diamond,
    ]);
    const catalog = await service.getAllTiers();
    expect(catalog.map(item => item.id)).toEqual(['bronze', 'silver', 'gold', 'diamond']);
    prisma.collaboratorProfile.findUnique.mockResolvedValue({ tier: { ...bronze, id: 'bronze-duplicate' } });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('bronze-duplicate');
    expect(status.nextTier?.id).toBe('silver');
    expect(status.progressPercentage).toBe(6);
    expect(status.revenueNeeded).toBe(18_839_000);
  });

  it('reports eligibility without granting a new commission rate on a read', async () => {
    prisma.order.aggregate.mockResolvedValue({ _sum: { finalAmount: 50_000_000 }, _count: { id: 20 } });
    const status = await service.getMyTierStatus('creator');
    expect(status.currentTier.id).toBe('bronze');
    expect(status.qualifiedTier.id).toBe('gold');
    expect(status.progressPercentage).toBe(100);
    expect(status.revenueNeeded).toBe(0);
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
  });

  it('returns no next tier only for the highest applied threshold', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({ tier: diamond });
    const status = await service.getMyTierStatus('creator');
    expect(status.nextTier).toBeNull();
    expect(status.progressPercentage).toBe(100);
  });

  it('returns a clear error for missing policy configuration or a missing profile', async () => {
    prisma.collaboratorTier.findMany.mockResolvedValue([]);
    await expect(service.getMyTierStatus('creator')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.evaluateAllCollaborators()).rejects.toBeInstanceOf(NotFoundException);
    prisma.collaboratorProfile.findUnique.mockResolvedValue(null);
    await expect(service.getMyTierStatus('creator')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not reassign profiles just because equivalent policies have duplicate IDs', async () => {
    prisma.collaboratorProfile.findMany.mockResolvedValue([{ id: 'profile', userId: 'creator', tier: { ...bronze, id: 'duplicate' } }]);
    const result = await service.evaluateAllCollaborators();
    expect(result.updatedCount).toBe(0);
    expect(prisma.collaboratorProfile.update).not.toHaveBeenCalled();
  });
});

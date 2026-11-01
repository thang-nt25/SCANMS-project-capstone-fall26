import { StoreCollaboratorsService } from '../store-collaborators.service';

describe('Store team measured performance', () => {
  const profile = {
    tier: { name: 'Gold', extraBonusPercentage: 2 },
    totalEarnedCommission: 9000000,
    totalOrdersReferred: 700,
  };
  let prisma: any;
  let service: StoreCollaboratorsService;
  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: 'SHOP_MANAGER' }),
      },
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: 'store-a', name: 'A' }),
      },
      storeCollaborator: {
        findMany: jest.fn().mockResolvedValue([
          {
            collaboratorId: 'kol',
            collaborator: { collaboratorProfile: profile },
          },
        ]),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
      sampleProductRequest: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new StoreCollaboratorsService(prisma);
  });

  it('does not turn global commission/order counters into Store sales', async () => {
    const result = await service.getShopTeam('staff', 'store-a');
    expect(result.members[0].stats).toEqual({
      totalRevenue: 0,
      totalOrders: 0,
      completedVideosCount: 0,
    });
    expect(result.members[0].collaborator.collaboratorProfile!.tier).toEqual(
      profile.tier,
    );
    expect(prisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: 'store-a',
          attributedCollaboratorId: { in: ['kol'] },
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
    );
  });

  it('uses measured totals even when global counters are larger', async () => {
    prisma.order.groupBy.mockResolvedValue([
      {
        attributedCollaboratorId: 'kol',
        _sum: { finalAmount: 450000 },
        _count: { id: 2 },
      },
    ]);
    prisma.sampleProductRequest.findMany.mockResolvedValue([
      { collaboratorId: 'kol' },
    ]);
    const result = await service.getShopTeam('owner', 'store-a');
    expect(result.members[0].stats).toEqual({
      totalRevenue: 450000,
      totalOrders: 2,
      completedVideosCount: 1,
    });
  });
});

import { Prisma, UserRole } from '@prisma/client';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoreMonthlyRewardsService } from '../store-monthly-rewards.service';

describe('Personal monthly reward orders (read only)', () => {
  const user = { id: 'kol', role: UserRole.COLLABORATOR } as any;
  let db: any;
  let service: StoreMonthlyRewardsService;
  beforeEach(() => {
    db = {
      storeMonthlyRewardPolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'policy', status: 'APPROVED', storeId: 'store', yearMonth: '2026-11' }) },
      storeCollaborator: { findFirst: jest.fn().mockResolvedValue({ collaboratorId: 'kol' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'kol', email: 'creator@example.com' }) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new StoreMonthlyRewardsService(db, {} as any, {} as any);
  });
  it('rejects non-collaborators', async () => {
    await expect(service.myPolicyOrders({ id: 'shop', role: UserRole.SHOP_MANAGER } as any, 'policy')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
  it('does not expose an unapproved policy', async () => {
    db.storeMonthlyRewardPolicy.findUnique.mockResolvedValue({ status: 'PENDING' });
    await expect(service.myPolicyOrders(user, 'policy')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('requires an approved partnership before reading orders', async () => {
    db.storeCollaborator.findFirst.mockResolvedValue(null);
    await expect(service.myPolicyOrders(user, 'policy')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.order.findMany).not.toHaveBeenCalled();
  });
  it('uses the same net-goods/refund/self-referral basis as the overview, scoped to the owner and Vietnam month', async () => {
    const order = { id: 'valid', externalOrderSn: 'ORDER-1', finalAmount: new Prisma.Decimal(1000), subtotalAmount: new Prisma.Decimal(900), refundedAmount: new Prisma.Decimal(200), refunds: [{ amount: new Prisma.Decimal(200) }], completedAt: new Date('2026-11-04'), orderItems: [{ quantity: 1, product: { title: 'Product', imageUrl: null } }] };
    db.order.findMany.mockResolvedValue([order, { ...order, id: 'self', customerId: user.id }, { ...order, id: 'refunded', refunds: [{ amount: new Prisma.Decimal(1000) }] }]);
    const result = await service.myPolicyOrders(user, 'policy');
    expect(result).toMatchObject({ totalOrders: 1, totalRevenue: '720.00', items: [{ id: 'valid', code: 'ORDER-1', revenue: '720.00' }] });
    expect(db.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { storeId: 'store', attributedCollaboratorId: 'kol', status: 'COMPLETED', completedAt: { gte: new Date('2026-10-31T17:00:00Z'), lt: new Date('2026-11-30T17:00:00Z') } } }));
  });
  it('reports unresolved attribution rather than displaying a misleading total', async () => {
    db.order.findMany.mockResolvedValue([{ rawPayload: { selfReferralReviewRequired: true } }]);
    await expect(service.myPolicyOrders(user, 'policy')).rejects.toBeInstanceOf(ConflictException);
  });
});

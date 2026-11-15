import { ReferralLinksService, computeEffectiveStatus } from '../referral-links.service';

describe('Collaborator link list scope and pagination', () => {
  const createService = () => {
    const referralLink = {
      count: jest.fn().mockResolvedValue(16),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalClicks: 474, uniqueClicks: 8, totalOrders: 42 } }),
    };
    const service = Object.create(ReferralLinksService.prototype);
    const order = { count: jest.fn().mockResolvedValue(8), groupBy: jest.fn() };
    Object.assign(service, { prisma: { referralLink, order }, getCurrentApprovedDeals: jest.fn().mockResolvedValue(new Map()), getPublicAppUrl: () => 'http://localhost:5173' });
    return { service: service as ReferralLinksService, referralLink, order };
  };
  it.each(['DEAL', 'STANDARD', 'CAMPAIGN'])('applies %s filter before paging and uses the same scope for totals', async remuneration => {
    const { service, referralLink, order } = createService();
    const result = await service.getCollaboratorLinks('own-kol', { page: 2, limit: 10, remuneration } as any);
    const query = referralLink.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({ collaboratorId: 'own-kol', deletedAt: null });
    expect(query.skip).toBe(10);
    expect(query.take).toBe(10);
    expect(query.where.exclusiveDealId).toEqual(remuneration === 'DEAL' ? { not: null } : null);
    if (remuneration !== 'DEAL') expect(query.where.campaignId).toEqual(remuneration === 'CAMPAIGN' ? { not: null } : null);
    expect(referralLink.aggregate).toHaveBeenCalledWith({ where: query.where, _sum: { totalClicks: true, uniqueClicks: true } });
    expect(order.count).toHaveBeenCalledWith({ where: { status: { not: 'CANCELLED' }, referralLink: { is: query.where } } });
    expect(result.summary).toEqual({ totalClicks: 474, uniqueClicks: 8, totalOrders: 8 });
    expect(result.meta.totalPages).toBe(2);
  });
  it('excludes date-expired links from active status even when their stored status is active', async () => {
    const { service, referralLink } = createService();
    await service.getCollaboratorLinks('own-kol', { status: 'ACTIVE' } as any);
    expect(referralLink.findMany.mock.calls[0][0].where.AND).toEqual([{ OR: [{ expiresAt: null }, { expiresAt: { gte: expect.any(Date) } }] }]);
  });
  it('preserves explicitly expired status without an expiry date', () => {
    expect(computeEffectiveStatus({ status: 'EXPIRED', expiresAt: null, deletedAt: null } as any)).toBe('EXPIRED');
  });
  it('replaces stale zero and inflated counters with actual non-cancelled order counts', async () => {
    const { service, referralLink } = createService();
    referralLink.findMany.mockResolvedValue([
      { id: 'zero-counter', totalOrders: 0, _count: { orders: 2 }, product: { customCommissionRate: null, store: { defaultCommissionRate: 10 } } },
      { id: 'inflated-counter', totalOrders: 37, _count: { orders: 2 }, product: { customCommissionRate: null, store: { defaultCommissionRate: 10 } } },
    ] as any);
    const result = await service.getCollaboratorLinks('own-kol', {} as any);
    expect(result.data.map(row => row.totalOrders)).toEqual([2, 2]);
    expect(referralLink.findMany.mock.calls[0][0].include._count.select.orders.where).toEqual({ status: { not: 'CANCELLED' } });
  });
  it('sorts actual counts before paging, including links without orders', async () => {
    const { service, referralLink, order } = createService();
    referralLink.findMany.mockResolvedValueOnce([{ id: 'zero' }, { id: 'two' }, { id: 'five' }] as any).mockResolvedValueOnce([]);
    order.groupBy.mockResolvedValue([{ referralLinkId: 'two', _count: { _all: 2 } }, { referralLinkId: 'five', _count: { _all: 5 } }]);
    await service.getCollaboratorLinks('own-kol', { sortBy: 'totalOrders', sortOrder: 'desc', page: 2, limit: 1 } as any);
    expect(referralLink.findMany.mock.calls[1][0]).toMatchObject({ where: { id: { in: ['two'] } }, skip: 0, take: 1 });
  });
});

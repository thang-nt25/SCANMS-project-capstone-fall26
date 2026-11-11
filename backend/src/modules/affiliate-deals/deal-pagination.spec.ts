import { UserRole } from '@prisma/client';
import { AffiliateDealsService } from './affiliate-deals.service';
import { dealCursorWhere, encodeDealCursor } from './deal-cursor';

describe('Deal pagination', () => {
  function setup() {
    const prisma = {
      exclusiveDealProposal: { count: jest.fn(async () => 251) },
    };
    const service = Object.assign(
      Object.create(AffiliateDealsService.prototype),
      { prisma },
    );
    jest.spyOn(service, 'getMyProposals').mockResolvedValue([]);
    jest.spyOn(service, 'getShopProposals').mockResolvedValue([]);
    jest.spyOn(service, 'listExceptions').mockResolvedValue([]);
    return { service, prisma };
  }
  it('returns the total and requested page after the old 200-row cutoff', async () => {
    const { service } = setup();
    await expect(
      service.getProposalPage('shop', 'owner', UserRole.SHOP_MANAGER, 5),
    ).resolves.toMatchObject({ total: 251, page: 5, pageSize: 50 });
    expect(service.getShopProposals).toHaveBeenCalledWith(
      'owner',
      UserRole.SHOP_MANAGER,
      5,
    );
  });
  it.each([0, -1, NaN, 1.5, 1000001])(
    'rejects invalid page %s',
    async (page) => {
      const { service, prisma } = setup();
      await expect(
        service.getProposalPage('mine', 'kol', UserRole.COLLABORATOR, page),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.exclusiveDealProposal.count).not.toHaveBeenCalled();
    },
  );
  it('encodes a stable boundary without depending on the cursor row still existing', () => {
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date('2026-11-01T00:00:00Z'),
    };
    expect(dealCursorWhere(encodeDealCursor(row))).toEqual({
      OR: [
        { createdAt: { lt: row.createdAt } },
        { createdAt: row.createdAt, id: { lt: row.id } },
      ],
    });
  });
  it.each([
    '',
    'garbage',
    Buffer.from('["invalid","id"]').toString('base64url'),
  ])('rejects malformed cursor %s', (cursor) => {
    expect(() => dealCursorWhere(cursor)).toThrow();
  });
  it('passes keyset bounds through the paged service', async () => {
    const { service } = setup();
    const after = encodeDealCursor({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date(),
    });
    await service.getProposalPage(
      'mine',
      'kol',
      UserRole.COLLABORATOR,
      2,
      after,
    );
    expect(service.getMyProposals).toHaveBeenCalledWith('kol', 2, after);
  });
  it('keeps ownership filters and replaces offset with the cursor boundary', async () => {
    const findMany = jest.fn(async () => []);
    const service = Object.assign(
      Object.create(AffiliateDealsService.prototype),
      {
        prisma: { exclusiveDealProposal: { findMany } },
        getCurrentApprovedDeals: jest.fn(async () => new Map()),
      },
    ) as AffiliateDealsService;
    const after = encodeDealCursor({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date(),
    });
    await service.getMyProposals('buyer-kol', 2, after);
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { collaboratorId: 'buyer-kol', ...dealCursorWhere(after) },
        take: 50,
      }),
    );
    expect((findMany.mock.calls[0] as any)[0].skip).toBeUndefined();
    await service.getShopProposals(
      'owner-keyset-test',
      UserRole.SHOP_MANAGER,
      2,
      after,
    );
    const query = (findMany.mock.calls[1] as any)[0];
    expect(query.skip).toBeUndefined();
    expect(query.where.OR).toEqual(dealCursorWhere(after).OR);
    expect(JSON.stringify(query.where.store)).toContain('owner-keyset-test');
  });
});

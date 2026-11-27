import { StoresService } from './stores.service';

describe('Public sponsored storefronts', () => {
  function setup(rows: object[] = []) {
    const prisma = {
      sponsoredPlacement: { findMany: jest.fn().mockResolvedValue(rows) },
      store: { findMany: jest.fn().mockResolvedValue([{ id: 'shop', name: 'Shop' }]) },
    };
    return { prisma, service: new StoresService(prisma as never) };
  }
  it('requires reviewed payment evidence, active dates, and an eligible shop in the query', async () => {
    const { service, prisma } = setup();
    expect(await service.getSponsoredPlacements()).toEqual([]);
    expect(prisma.sponsoredPlacement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'APPROVED', fundingType: 'PAID', amount: { gt: 0 },
        paymentReference: { not: null },
        OR: [
          { payosOrderCode: null, paymentProofUrl: { not: null } },
          { payosOrderCode: { not: null }, paidAt: { not: null }, paymentIssue: null },
        ],
        reviewedById: { not: null }, reviewedAt: { not: null },
        startsAt: { lte: expect.any(Date) }, endsAt: { gt: expect.any(Date) },
        store: expect.objectContaining({ isActive: true, isVerified: true, isDeleted: false }),
      }),
    }));
    expect(prisma.store.findMany).not.toHaveBeenCalled();
  });
  it('returns the paid banner with its storefront and expiry', async () => {
    const endsAt = new Date(Date.now() + 86400000);
    const { service } = setup([{ storeId: 'shop', headline: '  Quảng bá Shop  ', endsAt }]);
    expect(await service.getSponsoredPlacements()).toEqual([
      { store: { id: 'shop', name: 'Shop' }, headline: 'Quảng bá Shop', endsAt: endsAt.toISOString() },
    ]);
  });
  it('publishes the banner image and eligible product without the product moderation fields', async () => {
    const endsAt = new Date(Date.now() + 86400000);
    const product = { id: 'product', storeId: 'shop', title: 'Serum', imageUrl: '/serum.webp', isActive: true, isDeleted: false, moderationStatus: 'APPROVED' };
    const bannerImageUrl = 'https://res.cloudinary.com/demo/image/upload/v1/scanms/sponsorship/serum.webp';
    const { service } = setup([{ id: 'placement', storeId: 'shop', productId: product.id, product, bannerImageUrl, headline: 'Quảng bá Shop', endsAt }]);
    expect(await service.getSponsoredPlacements()).toEqual([{
      id: 'placement', store: { id: 'shop', name: 'Shop' }, headline: 'Quảng bá Shop',
      endsAt: endsAt.toISOString(), bannerImageUrl,
      product: { id: product.id, title: product.title, imageUrl: product.imageUrl },
    }]);
    product.isActive = false;
    expect(await service.getSponsoredPlacements()).toEqual([]);
  });
  it('does not publish legacy environment entries without database payment approval', async () => {
    const previous = process.env.MARKETPLACE_SPONSORED_PLACEMENTS;
    process.env.MARKETPLACE_SPONSORED_PLACEMENTS = JSON.stringify([{
      storeId: '2f67001b-09a5-5958-85fd-5f401831c871',
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      headline: 'Legacy banner', paymentStatus: 'CONFIRMED',
    }]);
    try {
      expect(await setup().service.getSponsoredPlacements()).toEqual([]);
    } finally {
      if (previous === undefined) delete process.env.MARKETPLACE_SPONSORED_PLACEMENTS;
      else process.env.MARKETPLACE_SPONSORED_PLACEMENTS = previous;
    }
  });
});

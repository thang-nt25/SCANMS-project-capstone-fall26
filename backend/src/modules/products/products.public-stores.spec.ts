import { ProductsService } from './products.service';

describe('Public storefront response regression', () => {
  it.each([
    { rows: [{ id: 'store-1', name: 'Test store', logoUrl: '/assets/shops/test.png' }] },
    { rows: [] },
  ])('returns the queried collection instead of an undefined HTTP body: %j', async ({ rows }) => {
    const findMany = jest.fn().mockResolvedValue(rows);
    const service = new ProductsService({ store: { findMany } } as never, {} as never, { get: jest.fn().mockResolvedValue(null) } as never);
    expect(await service.getPublicStores()).toEqual(rows);
  });
  it('keeps public stores restricted to verified active shops and approved merchandise', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ProductsService({ store: { findMany } } as never, {} as never, { get: jest.fn().mockResolvedValue(null) } as never);
    await service.getPublicStores();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      isDeleted: false, isActive: true, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true },
      products: { some: expect.objectContaining({ isDeleted: false, isActive: true, moderationStatus: 'APPROVED' }) },
    }) }));
  });
});

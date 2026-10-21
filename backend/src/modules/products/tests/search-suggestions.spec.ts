import { ProductsService } from '../products.service';
import { normalizeSearch, searchUnits, typoPattern } from '../utils/catalog-search-engine';

describe('public product search suggestions', () => {
  function fixture() {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([
      { id: 'a', sku: 'SERUM-1', title: 'Serum C', imageUrl: '/serum.jpg', price: '320000', storeName: 'Sora Skin', hasVariants: true, inStock: true },
    ]), product: { findMany: jest.fn().mockResolvedValue([{ id: 'a', title: 'Serum C' }]) } };
    return { prisma, service: new ProductsService(prisma as any, {} as any, {} as any) };
  }
  it('does not query the database for blank or one-character input', async () => {
    const { service, prisma } = fixture();
    expect(await service.getSearchSuggestions('   ')).toEqual([]);
    expect(await service.getSearchSuggestions('s')).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it('returns lean public rows and queries prices/stock and matching in a single database round trip', async () => {
    const { service, prisma } = fixture();
    expect((await service.getSearchSuggestions('  serum   C '))[0]).toMatchObject({ price: 320000, hasVariants: true, inStock: true });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.text).toContain("p.moderation_status = 'APPROVED'");
    expect(sql.text).toContain("s.onboarding_status = 'VERIFIED'");
    expect(sql.text).toContain('u.is_deleted = false');
    expect(sql.text).toContain('LIMIT 6');
    expect(sql.text).toContain('v.available_price');
    expect(sql.text).not.toContain('commission');
  });
  it('bounds and validates input, and binds wildcard/injection text as data', async () => {
    const { service, prisma } = fixture();
    await service.getSearchSuggestions("%' OR 1=1 --");
    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.text).not.toContain("OR 1=1");
    expect(sql.values).toContain("%\\%'%");
    await service.getSearchSuggestions('x'.repeat(1000));
    expect(prisma.$queryRaw.mock.calls[1][0].values).toContain('%' + 'x'.repeat(80) + '%');
    await expect(service.getSearchSuggestions({} as any)).rejects.toMatchObject({ status: 400 });
  });
  it('uses SQL search counts and keeps the ORM fetch restricted to eligible IDs', async () => {
    const { service, prisma } = fixture();
    prisma.$queryRaw.mockResolvedValueOnce([{ total: 1n }]).mockResolvedValueOnce([{ id: 'a', soldCount: 0, viewCount: 0 }]);
    const result = await service.findPublicMarketplace({ search: 'mỹ phẩm' });
    expect(result.pagination.total).toBe(1);
    expect(result.items.map(p => p.id)).toEqual(['a']);
    expect(prisma.product.findMany.mock.calls[0][0].where).toMatchObject({ id: { in: ['a'] }, isActive: true, isDeleted: false, moderationStatus: 'APPROVED' });
    expect(prisma.product.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
  });
  it('normalizes Unicode, supports phrases within longer queries, and limits typo correction', () => {
    expect(normalizeSearch('  SỮA RỬA MẶT  '.normalize('NFD'))).toBe('sua rua mat');
    expect(searchUnits('tôi muốn mua kcn của Cỏ Mềm').map(unit => unit.terms)).toEqual([
      expect.arrayContaining(['chong nang', 'sunscreen']), ['co'], ['mem'],
    ]);
    expect(searchUnits('mỹ phẩm Cocoon')[0]).toMatchObject({ category: true, terms: expect.arrayContaining(['cham soc da']) });
    expect(typoPattern('serun')).not.toBeNull();
    expect(typoPattern('kem')).toBeNull();
    expect(typoPattern('spf51')).toBeNull();
    expect(typoPattern('SEED-001')).toBeNull();
  });
});

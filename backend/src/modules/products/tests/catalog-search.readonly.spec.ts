import { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { catalogCountQuery, catalogSuggestionsQuery } from '../utils/catalog-query';
import { catalogRankingQuery } from '../utils/catalog-ranking.query';

// Explicit opt-in. These CTE fixtures shadow real tables in a READ ONLY session;
// no products, stock, orders, payments or other project data are changed.
const databaseTests = process.env.RUN_CATALOG_READONLY_TESTS === 'true' ? describe : describe.skip;
databaseTests('catalog search against PostgreSQL read-only fixtures', () => {
  let pool: Pool;
  beforeAll(() => {
    config({ quiet: true });
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL required for explicit read-only tests');
    pool = new Pool({ connectionString, max: 1, options: '-c default_transaction_read_only=on',
      ssl: /supabase|pooler/.test(connectionString) ? { rejectUnauthorized: false } : undefined });
  });
  afterAll(async () => { await pool?.end(); });
  const fixtures = Prisma.sql`
    product_seed(id, store_id, title, sku, category_name, price, created_at, is_deleted, is_active, moderation_status, image_url, stock_quantity) AS (
      VALUES ('serum', 'sora', 'Serum Vitamin C 15% Sora Skin 30 ml', 'SERUM-C', 'Chăm sóc da', 250000, '2026-01-01'::timestamptz, false, true, 'APPROVED', '/a.jpg', 0),
        ('mask', 'cocoon', 'Mặt nạ rau má Cocoon 5 miếng', 'MASK-1', 'Chăm sóc da', 100000, '2026-02-01'::timestamptz, false, true, 'APPROVED', NULL, 8),
        ('sun', 'comem', 'Kem chống nắng SPF50 Cỏ Mềm 30 ml', 'SUN-1', 'Chăm sóc da', 200000, '2026-03-01'::timestamptz, false, true, 'APPROVED', NULL, 4),
        ('toner', 'comem', 'Toner BHA 2% Cỏ Mềm 100 ml', 'TONER-1', 'Chăm sóc da', 180000, '2026-04-01'::timestamptz, false, true, 'APPROVED', NULL, 4),
        ('tea', 'green', 'Trà hoa cúc GreenBio 50 g', 'TEA-1', 'Thực phẩm sức khỏe', 50000, '2026-05-01'::timestamptz, false, true, 'APPROVED', NULL, 4),
        ('granola', 'green', 'Granola hạt dinh dưỡng GreenBio 250 g', 'GRANOLA-1', 'Thực phẩm sức khỏe', 80000, '2026-05-02'::timestamptz, false, true, 'APPROVED', NULL, 0),
        ('future', 'sora', 'Tai nghe Bluetooth Mây Trắng', 'TECH-NEW', 'Điện tử', 300000, '2026-06-01'::timestamptz, false, true, 'APPROVED', NULL, 1),
        ('draft', 'sora', 'Serum bí mật', 'DRAFT', 'Chăm sóc da', 1, '2026-07-01'::timestamptz, false, true, 'DRAFT', NULL, 10),
        ('deleted', 'sora', 'Serum đã xóa', 'DELETED', 'Chăm sóc da', 1, '2026-07-01'::timestamptz, true, true, 'APPROVED', NULL, 10),
        ('inactive', 'sora', 'Serum đã ẩn', 'INACTIVE', 'Chăm sóc da', 1, '2026-07-01'::timestamptz, false, false, 'APPROVED', NULL, 10),
        ('closed', 'closed', 'Serum shop đóng', 'CLOSED', 'Chăm sóc da', 1, '2026-07-01'::timestamptz, false, true, 'APPROVED', NULL, 10),
        ('owner', 'deleted-owner', 'Serum owner đã xóa', 'OWNER', 'Chăm sóc da', 1, '2026-07-01'::timestamptz, false, true, 'APPROVED', NULL, 10)
    ), products AS (SELECT *, CASE id
        WHEN 'serum' THEN '<p>Dưỡng ẩm, cấp ẩm cho da.</p>'
        WHEN 'mask' THEN '<p>Hỗ trợ giảm mụn cho da mụn.</p>'
        WHEN 'toner' THEN '<p>Kiềm dầu cho da dầu. Không có công dụng trị mụn.</p>'
        WHEN 'future' THEN '<p>Trải nghiệm âm thanh.</p>' ELSE '' END AS description,
        ''::text AS ingredients FROM product_seed),
    stores(id, owner_id, name, is_deleted, is_active, is_verified, onboarding_status) AS (
      VALUES ('sora', 'owner', 'Sora Skin', false, true, true, 'VERIFIED'), ('cocoon', 'owner', 'Cocoon', false, true, true, 'VERIFIED'),
        ('comem', 'owner', 'Cỏ Mềm', false, true, true, 'VERIFIED'), ('green', 'owner', 'GreenBio', false, true, true, 'VERIFIED'),
        ('closed', 'owner', 'Closed', false, false, true, 'VERIFIED'), ('deleted-owner', 'deleted', 'Deleted', false, true, true, 'VERIFIED')
    ), users(id, is_active, is_deleted) AS (VALUES ('owner', true, false), ('deleted', true, true)),
    product_variants(product_id, name, sku, is_active, price, stock_quantity) AS (
      VALUES ('serum', '30 ml / Tiêu chuẩn', 'V-30', true, 270000, 4), ('serum', '50 ml / Hộp quà', 'V-50', true, 320000, 3),
        ('serum', '5 ml / Tiêu chuẩn', 'V-5', true, 90000, 0), ('serum', '25 ml / Tiêu chuẩn', 'V-25', false, 50000, 20)
    ), orders(id, status) AS (SELECT NULL::text, NULL::text WHERE false),
    order_items(product_id, order_id, quantity) AS (SELECT NULL::text, NULL::text, 0 WHERE false),
    audit_logs(action, details) AS (SELECT NULL::text, '{}'::jsonb WHERE false)`;
  async function run(query: Prisma.Sql) {
    query.strings[0] = query.strings[0].replace(/\bWITH\b/, '');
    const sql = Prisma.sql`WITH ${fixtures}, ${query}`;
    return (await pool.query(sql.text, sql.values)).rows;
  }
  const suggestions = async (query: string) => run(catalogSuggestionsQuery(query));
  it.each([
    ['sua rua mat', []], ['mặt nạ', ['mask']], ['mat na', ['mask']], ['sheet mask cocoon', ['mask']],
    ['co mem chong nang', ['sun']], ['kcn Cỏ Mềm', ['sun']], ['sunscreen co mem', ['sun']],
    ['nuoc hoa hong', ['toner']], ['BHA toner Cỏ Mềm', ['toner']], ['cereal', ['granola']],
    ['chamomile tea greenbio', ['tea']], ['tinh chat sora', ['serum']], ['serun sora', ['serum']],
    ['sreum sora', ['serum']], ['sunscreem', ['sun']], ['serumm', ['serum']], ['co memm', []],
    ['serum 50ml', ['serum']], ['serum hop qua', ['serum']], ['serum 25ml', []],
    ['spf51', []], ['serum 500ml', []], ['unknownzzzzz', []], ['%', ['serum', 'toner']], ['_', []], ["' OR 1=1 --", []],
    ['tai nghe may trang', ['future']], ['TECH-NEW', ['future']], ['TECHNEW', ['future']], ['soraskin serum', ['serum']],
    ['spf 50', ['sun']], ['serum vitc', ['serum']], ['centella', ['mask']],
    ['suns', ['sun']], ['grano', ['granola']], ['tea', ['tea']],
    ['trị mụn', ['mask']], ['tri mun', ['mask']], ['acne', ['mask']], ['mụn', ['mask']],
    ['duong am', ['serum']], ['oily skin', ['toner']], ['trai nghiem am thanh', ['future']],
    ['  KCN   CỎ MỀM ', ['sun']], ['tôi muốn mua kcn của cỏ mềm', ['sun']],
  ])('matches %s and keeps count, full results and suggestions consistent', async (search, expected) => {
    const rows = await suggestions(search);
    expect(rows.map(row => row.id).sort()).toEqual([...expected].sort());
    const options = { search, page: 1, limit: 48, sortBy: 'relevance' };
    expect(Number((await run(catalogCountQuery(options)))[0].total)).toBe(expected.length);
    expect((await run(catalogRankingQuery(options))).map(row => row.id)).toEqual(rows.map(row => row.id));
  });
  it('handles Unicode decomposition, approved/active visibility and actual current variant prices', async () => {
    expect((await suggestions('MẶT NẠ'.normalize('NFD'))).map(row => row.id)).toEqual(['mask']);
    const rows = await suggestions('serum');
    expect(rows.map(row => row.id)).toEqual(['serum']);
    expect(rows[0]).toMatchObject({ hasVariants: true, inStock: true });
    expect(Number(rows[0].price)).toBe(270000);
    expect((await suggestions('granola'))[0]).toMatchObject({ hasVariants: false, inStock: false });
  });
  it('supports broad categories, prefers exact matches and respects category/store/price restrictions', async () => {
    expect((await suggestions('my pham')).map(row => row.id).sort()).toEqual(['mask', 'serum', 'sun', 'toner']);
    expect((await suggestions('my pham co mem')).map(row => row.id).sort()).toEqual(['sun', 'toner']);
    const options = { search: 'my pham', storeId: 'comem', minPrice: 190000, page: 1, limit: 48 };
    expect((await run(catalogRankingQuery(options))).map(row => row.id)).toEqual(['sun']);
    expect(Number((await run(catalogCountQuery(options)))[0].total)).toBe(1);
  });
  it('prefers declared benefits and labels narrower type-based fallback without inventing efficacy', async () => {
    expect((await suggestions('trị mụn'))[0]).toMatchObject({ id: 'mask', matchKind: 'direct' });
    for (const search of ['serum trị mụn', 'serum acne', 'serum cho da mụn', 'trị mụn Sora Skin']) {
      const rows = await suggestions(search);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 'serum', matchKind: 'related' });
      const options = { search, page: 1, limit: 48 };
      expect(Number((await run(catalogCountQuery(options)))[0].total)).toBe(1);
      expect((await run(catalogRankingQuery(options)))[0]).toMatchObject({ id: 'serum', matchKind: 'related' });
    }
    expect(await suggestions('trị mụn Cỏ Mềm')).toEqual([]); // merchant explicitly rules this out
    expect(await suggestions('trị mụn GreenBio')).toEqual([]); // no food/tea fallback
    expect(await suggestions('serum trị mụn 500ml')).toEqual([]); // never discard other constraints
    expect(await suggestions('mụn cóc')).toEqual([]); // no broad acne fallback for a different condition
  });
});

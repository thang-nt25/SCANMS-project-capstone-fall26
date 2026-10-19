import { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { catalogRankingQuery } from '../utils/catalog-ranking.query';

// Read-only CTE fixtures exercise the actual PostgreSQL aggregation and pagination.
// No rows are inserted into the project's database.
const databaseTests = process.env.RUN_CATALOG_READONLY_TESTS === 'true' ? describe : describe.skip;
databaseTests('catalog ranking SQL with isolated read-only fixtures', () => {
  let pool: Pool;
  beforeAll(() => {
    config({ quiet: true });
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required for this explicit read-only test');
    pool = new Pool({ connectionString, max: 1, options: '-c default_transaction_read_only=on',
      ssl: /supabase|pooler/.test(connectionString) ? { rejectUnauthorized: false } : undefined });
  });
  afterAll(async () => { await pool?.end(); });
  const fixtures = Prisma.sql`
    products(id, store_id, title, sku, category_name, price, created_at, is_deleted, is_active, moderation_status) AS (
      VALUES ('old', 'shop', 'Old', 'OLD', 'Skin', 100, '2026-01-01'::timestamptz, false, true, 'APPROVED'),
             ('new', 'shop', 'New', 'NEW', 'Skin', 300, '2026-03-01'::timestamptz, false, true, 'APPROVED'),
             ('visited', 'shop', 'Viewed', 'VIEW', 'Food', 200, '2026-02-01'::timestamptz, false, true, 'APPROVED'),
             ('zero', 'shop', 'Zero', 'ZERO', 'Skin', 50, '2026-01-02'::timestamptz, false, true, 'APPROVED'),
             ('draft', 'shop', 'Draft', 'DRAFT', 'Skin', 1, '2026-05-01'::timestamptz, false, true, 'DRAFT'),
             ('closed', 'closed-shop', 'Closed', 'CLOSED', 'Skin', 1, '2026-05-01'::timestamptz, false, true, 'APPROVED')
    ), stores(id, owner_id, name, is_deleted, is_active, is_verified, onboarding_status) AS (
      VALUES ('shop', 'owner', 'Shop', false, true, true, 'VERIFIED'),
             ('closed-shop', 'owner', 'Closed', false, false, true, 'VERIFIED')
    ), users(id, is_active) AS (VALUES ('owner', true)),
    orders(id, status) AS (VALUES ('delivered', 'DELIVERED'), ('completed', 'COMPLETED'),
      ('pending', 'PENDING'), ('cancelled', 'CANCELLED'), ('returned', 'RETURNED')),
    order_items(product_id, order_id, quantity) AS (VALUES
      ('old', 'delivered', 3), ('old', 'completed', 2), ('old', 'pending', 100),
      ('old', 'cancelled', 900), ('old', 'returned', 800), ('new', 'completed', 1), ('visited', 'delivered', 4)),
    audit_logs(action, details) AS (VALUES
      ('ANALYTICS_PAGE_VIEW', '{"productId":"visited"}'::jsonb),
      ('ANALYTICS_PAGE_VIEW', '{"productId":"visited"}'::jsonb),
      ('ANALYTICS_PAGE_VIEW', '{"productId":"visited"}'::jsonb),
      ('ANALYTICS_PAGE_VIEW', '{"productId":"old"}'::jsonb),
      ('ANALYTICS_VIDEO_START', '{"productId":"new"}'::jsonb))`;
  async function run(options: Partial<Parameters<typeof catalogRankingQuery>[0]> = {}) {
    const ranked = catalogRankingQuery({ page: 1, limit: 10, ...options });
    ranked.strings[0] = ranked.strings[0].replace('WITH eligible AS', 'eligible AS');
    const query = Prisma.sql`WITH ${fixtures}, ${ranked}`;
    return (await pool.query(query.text, query.values)).rows;
  }
  it.each([
    ['popular', ['visited', 'old', 'new', 'zero']],
    ['newest', ['new', 'visited', 'zero', 'old']],
    ['sales', ['old', 'visited', 'new', 'zero']],
    ['price_asc', ['zero', 'old', 'visited', 'new']],
    ['price_desc', ['new', 'visited', 'old', 'zero']],
  ])('sorts globally using real %s data', async (sortBy, expected) => {
    expect((await run({ sortBy })).map(row => row.id)).toEqual(expected);
  });
  it('counts units rather than orders, excludes unsuccessful sales and returns zero without data', async () => {
    const rows = await run({ sortBy: 'sales' });
    expect(rows.map(row => Number(row.soldCount))).toEqual([5, 4, 1, 0]);
    expect(Number(rows.find(row => row.id === 'visited').viewCount)).toBe(3);
  });
  it('sorts before pagination and applies category, store and price filters', async () => {
    expect((await run({ sortBy: 'sales', limit: 2, page: 2 })).map(row => row.id)).toEqual(['new', 'zero']);
    expect((await run({ category: 'skin', minPrice: 75, maxPrice: 200, storeId: 'shop' })).map(row => row.id)).toEqual(['old']);
    expect(await run({ storeId: 'closed-shop' })).toEqual([]);
  });
  it('binds search input as data, including literal wildcard characters', async () => {
    expect((await run({ search: 'Old' })).map(row => row.id)).toEqual(['old']);
    expect(await run({ search: "' OR 1=1 --" })).toEqual([]);
    expect(await run({ search: '%' })).toEqual([]);
  });
});

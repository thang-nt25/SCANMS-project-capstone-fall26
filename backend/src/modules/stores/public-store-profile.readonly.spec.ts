import { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { config } from 'dotenv';
import {
  publicChatPerformance,
  shopResponseQuery,
} from './shop-response.query';

// CTE fixtures shadow physical tables; the connection itself is read-only.
const databaseTests =
  process.env.RUN_STORE_PROFILE_READONLY_TESTS === 'true'
    ? describe
    : describe.skip;
databaseTests('Public customer chat performance on PostgreSQL', () => {
  let pool: Pool;
  const storeId = '11111111-1111-4111-8111-111111111111';
  beforeAll(() => {
    config({ quiet: true });
    if (!process.env.DATABASE_URL)
      throw new Error('Read-only DB URL is required');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      options: '-c default_transaction_read_only=on',
      ssl: /supabase|pooler/.test(process.env.DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  });
  afterAll(async () => {
    await pool?.end();
  });
  const fixtures = Prisma.sql`
    conversations(id, store_id, customer_id) AS (
      VALUES ('timely', ${storeId}::uuid, 'buyer'), ('late', ${storeId}::uuid, 'buyer'),
        ('waiting', ${storeId}::uuid, 'buyer'), ('fresh', ${storeId}::uuid, 'buyer'),
        ('fast', ${storeId}::uuid, 'buyer'), ('system', ${storeId}::uuid, 'buyer'),
        ('kol', ${storeId}::uuid, NULL), ('historic', ${storeId}::uuid, 'buyer'),
        ('other', '22222222-2222-4222-8222-222222222222'::uuid, 'buyer')
    ), users(id, role) AS (VALUES ('buyer', 'CUSTOMER'), ('staff', 'SHOP_MANAGER'), ('admin', 'SYSTEM_ADMIN')),
    chat_messages(id, conversation_id, sender_id, created_at) AS (
      VALUES ('1', 'timely', 'buyer', '2026-10-30 10:00+00'::timestamptz),
        ('2', 'timely', 'staff', '2026-10-30 10:05+00'::timestamptz),
        ('3', 'timely', 'buyer', '2026-10-30 11:00+00'::timestamptz),
        ('4', 'late', 'buyer', '2026-10-30 08:00+00'::timestamptz),
        ('5', 'late', 'staff', '2026-10-31 09:00+00'::timestamptz),
        ('6', 'waiting', 'buyer', '2026-10-30 10:00+00'::timestamptz),
        ('7', 'fresh', 'buyer', '2026-11-01 11:00+00'::timestamptz),
        ('8', 'fast', 'buyer', '2026-11-01 10:00+00'::timestamptz),
        ('9', 'fast', 'staff', '2026-11-01 10:03+00'::timestamptz),
        ('10', 'system', 'buyer', '2026-10-30 10:00+00'::timestamptz),
        ('11', 'system', 'admin', '2026-10-30 10:01+00'::timestamptz),
        ('12', 'kol', 'buyer', '2026-10-30 10:00+00'::timestamptz),
        ('13', 'historic', 'buyer', '2026-10-01 10:00+00'::timestamptz),
        ('14', 'other', 'buyer', '2026-10-30 10:00+00'::timestamptz)
    )`;
  async function run(id = storeId) {
    const sql = shopResponseQuery(id, new Date('2026-11-01T12:00:00Z'));
    sql.strings[0] = sql.strings[0].replace(/\bWITH\b/, '');
    const query = Prisma.sql`WITH ${fixtures}, ${sql}`;
    return (await pool.query(query.text, query.values)).rows[0];
  }
  it('counts eligible conversations once, excludes fresh unanswered contacts and ignores system/KOC traffic', async () => {
    const row = await run();
    expect(Number(row.eligibleCount)).toBe(5);
    expect(Number(row.respondedCount)).toBe(2);
    expect(publicChatPerformance(row)).toMatchObject({
      responseRate: 40,
      averageResponseMinutes: 4,
      conversationCount: 5,
    });
  });
  it('does not borrow another store response rate or invent an empty-store average', async () => {
    expect(
      publicChatPerformance(await run('33333333-3333-4333-8333-333333333333')),
    ).toMatchObject({
      responseRate: null,
      averageResponseMinutes: null,
      conversationCount: 0,
    });
  });
});

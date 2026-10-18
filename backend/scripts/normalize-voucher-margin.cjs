const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Pool } = require('pg');

async function main() {
  const apply = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000,
    ssl: /supabase|pooler|sslmode=require/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (apply) await client.query('LOCK TABLE coupons, orders, order_items, commissions, coupon_redemptions, stacked_voucher_redemptions IN SHARE ROW EXCLUSIVE MODE');
    const tables = ['orders', 'order_items', 'commissions', 'coupon_redemptions', 'stacked_voucher_redemptions'];
    const fingerprint = async () => {
      const result = {};
      for (const table of tables) {
        result[table] = (await client.query(`SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM ${table} t`)).rows[0].fingerprint;
      }
      return JSON.stringify(result);
    };
    const before = await fingerprint();
    const { rows } = await client.query(`SELECT count(*)::int AS count FROM coupons
      WHERE stackable_with_shop_voucher IS DISTINCT FROM (funding_source = 'PLATFORM_FUNDED' AND benefit_type = 'GOODS')
         OR stackable_with_platform_voucher IS DISTINCT FROM true`);
    let backupFile = null;
    if (apply) {
      const backup = (await client.query('SELECT id, stackable_with_shop_voucher, stackable_with_platform_voucher FROM coupons ORDER BY id')).rows;
      backupFile = path.join(os.tmpdir(), `scanms-voucher-margin-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), { flag: 'wx' });
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations', '20261016170000_voucher_margin_protection', 'migration.sql'), 'utf8'));
      if (before !== await fingerprint()) throw new Error('Historical order/commission/redemption data changed; rollback');
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ applied: apply, couponsToNormalize: rows[0].count, backupFile, historicalSnapshotsUnchanged: true }));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error.message || error.code); process.exitCode = 1; });

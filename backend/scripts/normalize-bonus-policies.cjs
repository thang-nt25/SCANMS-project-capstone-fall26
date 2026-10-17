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
    if (apply) await client.query('LOCK TABLE order_items, commissions, collaborator_tiers, exclusive_deal_proposals, campaigns, live_shopping_sessions IN SHARE ROW EXCLUSIVE MODE');
    const fingerprint = async () => (await client.query(`SELECT
      (SELECT md5(COALESCE(string_agg(row_to_json(i)::text, '' ORDER BY id), '')) FROM order_items i) AS items,
      (SELECT md5(COALESCE(string_agg(row_to_json(c)::text, '' ORDER BY id), '')) FROM commissions c) AS commissions`)).rows[0];
    const before = await fingerprint();
    const counts = (await client.query(`SELECT
      (SELECT count(*)::int FROM collaborator_tiers WHERE extra_bonus_percentage IS DISTINCT FROM CASE WHEN name ILIKE '%diamond%' THEN 3 WHEN name ILIKE '%gold%' THEN 2 WHEN name ILIKE '%silver%' THEN 1 ELSE 0 END) AS tiers,
      (SELECT count(*)::int FROM exclusive_deal_proposals WHERE status='APPROVED' AND approved_commission_rate IS NOT NULL AND approved_commission_rate NOT IN (11,12,13)) AS deals,
      (SELECT count(*)::int FROM campaigns WHERE (is_active AND (bonus_budget_total IS NULL OR bonus_budget_total <= 0)) OR bonus_commission_rate NOT BETWEEN 1 AND 2) AS campaigns,
      (SELECT count(*)::int FROM live_shopping_sessions WHERE status IN ('LIVE','SCHEDULED','PENDING_CREATOR') AND commission_rate NOT IN (2,3)) AS live`)).rows[0];
    let backupFile = null;
    if (apply) {
      const backup = {};
      for (const table of ['collaborator_tiers', 'exclusive_deal_proposals', 'campaigns', 'live_shopping_sessions']) {
        backup[table] = (await client.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
      }
      backupFile = path.join(os.tmpdir(), `scanms-bonus-policies-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), { flag: 'wx' });
      await client.query(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations',
        '20261016160000_additive_bonus_policy', 'migration.sql'), 'utf8'));
      if (JSON.stringify(before) !== JSON.stringify(await fingerprint())) throw new Error('Historical snapshots changed; rolling back');
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ applied: apply, counts, backupFile, historicalSnapshotsUnchanged: true }));
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); await pool.end(); }
}
main().catch(error => { console.error(error.message || error.code); process.exitCode = 1; });

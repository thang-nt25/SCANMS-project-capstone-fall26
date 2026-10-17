const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000,
    ssl: /supabase|pooler|sslmode=require/i.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'prisma/migrations/20261016180000_coupon_permission_state/migration.sql'), 'utf8'));
    const check = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='coupons' AND column_name='status_before_block'`);
    if (check.rowCount !== 1) throw new Error('Coupon lifecycle column missing');
    await client.query('COMMIT');
    console.log(JSON.stringify({ applied: true, column: 'status_before_block', existingRecordsUpdated: 0 }));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
})().catch(error => { console.error(error.message || error.code); process.exitCode = 1; });

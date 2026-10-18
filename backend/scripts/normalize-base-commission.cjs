const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { Pool } = require('pg');

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
    ssl: /supabase|pooler|sslmode=require/i.test(process.env.DATABASE_URL)
      ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (apply) await client.query('LOCK TABLE stores, products IN SHARE ROW EXCLUSIVE MODE');
    const stores = (await client.query('SELECT id, default_commission_rate FROM stores WHERE default_commission_rate IS DISTINCT FROM 10 ORDER BY id')).rows;
    const products = (await client.query('SELECT id, custom_commission_rate FROM products WHERE custom_commission_rate IS DISTINCT FROM 10 ORDER BY id')).rows;
    let backupFile = null;
    if (apply) {
      // Keep the previous base policies outside source control for recovery.
      backupFile = path.join(os.tmpdir(), `scanms-base-commission-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify({ stores, products }, null, 2), { flag: 'wx' });
      const sql = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'migrations',
        '20261016150000_fixed_base_commission', 'migration.sql'), 'utf8');
      await client.query(sql);
      const remaining = (await client.query(`SELECT
        (SELECT count(*) FROM stores WHERE default_commission_rate IS DISTINCT FROM 10) AS stores,
        (SELECT count(*) FROM products WHERE custom_commission_rate IS DISTINCT FROM 10) AS products`)).rows[0];
      if (remaining.stores !== '0' || remaining.products !== '0') throw new Error('Base rate verification failed');
    }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    console.log(JSON.stringify({ applied: apply, storesToNormalize: stores.length,
      productsToNormalize: products.length, backupFile,
      modifiedColumns: ['stores.default_commission_rate', 'products.custom_commission_rate'],
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(error => {
  console.error(JSON.stringify({ code: error.code, message: error.message,
    causes: error.errors?.map(cause => ({ code: cause.code, message: cause.message })) }));
  process.exitCode = 1;
});

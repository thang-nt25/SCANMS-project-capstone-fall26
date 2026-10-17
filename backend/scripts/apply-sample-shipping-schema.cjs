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
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'prisma/migrations/20261016190000_sample_shipping_charges/migration.sql'), 'utf8'));
    await client.query('SELECT id, amount, payer, cod_amount FROM sample_shipping_charges LIMIT 0');
    await client.query('COMMIT');
    console.log(JSON.stringify({ applied: true, table: 'sample_shipping_charges', existingRecordsUpdated: 0 }));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
})().catch(error => { console.error(error.message || error.code); process.exitCode = 1; });

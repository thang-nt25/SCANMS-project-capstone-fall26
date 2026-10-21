// Read-only deployment check. Never print credentials or customer records.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const expected = [
  'target_orders', 'commitment_days', 'commitment_started_at',
  'commitment_ends_at', 'settlement_ends_at', 'closed_at',
];
async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const columns = await client.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = ANY($3)',
      ['public', 'exclusive_deal_proposals', expected],
    );
    const migrations = await client.query(
      'SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',
      ['20261020150000_exclusive_deal_kpi'],
    );
    await client.query('COMMIT');
    const installed = new Set(columns.rows.map((row) => row.column_name));
    const missing = expected.filter((column) => !installed.has(column));
    if (missing.length || migrations.rows.length !== 1) {
      console.error(JSON.stringify({ ready: false, missing, migrationRecorded: migrations.rows.length === 1 }));
      process.exitCode = 1;
    } else console.log(JSON.stringify({ ready: true, columns: installed.size, migrationRecorded: true }));
  } finally { await client.end(); }
}
main().catch((error) => {
  console.error('Unable to verify Deal KPI schema:', error.code || error.name);
  process.exitCode = 1;
});

// Read-only rollout preflight. Never print connection strings or identity values.
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const runtime = new URL(process.env.DATABASE_URL);
  const direct = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  const describe = (url) => ({
    host: url.hostname,
    port: url.port || '5432',
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get('schema') || 'public',
    sslmode: url.searchParams.get('sslmode') || '(not configured)',
  });
  console.log(
    JSON.stringify(
      {
        environment: process.env.NODE_ENV || '(not set)',
        runtime: describe(runtime),
        cli: describe(direct),
      },
      null,
      2,
    ),
  );
  const pool = new Pool({
    connectionString: direct.toString(),
    max: 1,
    connectionTimeoutMillis: 15000,
    statement_timeout: 20000,
  });
  try {
    await pool.query('BEGIN READ ONLY');
    const db = await pool.query(
      'SELECT current_database() AS database, current_schema() AS schema, version() AS version',
    );
    const migrations = await pool.query(
      'SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count FROM public._prisma_migrations ORDER BY migration_name',
    );
    const migrationRoot = resolve(__dirname, '../prisma/migrations');
    const local = readdirSync(migrationRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const applied = migrations.rows.filter(
      (row) => row.finished_at && !row.rolled_back_at,
    );
    const missingLocal = applied
      .filter((row) => !local.includes(row.migration_name))
      .map((row) => row.migration_name);
    const checksumMismatch = applied
      .filter((row) => {
        const file = resolve(
          migrationRoot,
          row.migration_name,
          'migration.sql',
        );
        return (
          existsSync(file) &&
          createHash('sha256').update(readFileSync(file)).digest('hex') !==
            row.checksum
        );
      })
      .map((row) => row.migration_name);
    const lineEndingOnly = applied
      .filter((row) => {
        const file = resolve(
          migrationRoot,
          row.migration_name,
          'migration.sql',
        );
        if (!existsSync(file)) return false;
        const bytes = readFileSync(file);
        return (
          createHash('sha256').update(bytes).digest('hex') !== row.checksum &&
          createHash('sha256')
            .update(bytes.toString('utf8').replace(/\r\n/g, '\n'))
            .digest('hex') === row.checksum
        );
      })
      .map((row) => row.migration_name);
    const pending = local.filter(
      (name) => !applied.some((row) => row.migration_name === name),
    );
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    );
    const identities = await pool.query(
      "SELECT to_regclass('public.customer_identities') IS NOT NULL AS exists",
    );
    const counts = await pool.query(
      'SELECT (SELECT count(*)::int FROM public.users) AS users, (SELECT count(*)::int FROM public.orders) AS orders, (SELECT count(*)::int FROM public.financial_ledgers) AS ledgers',
    );
    await pool.query('ROLLBACK');
    console.log(
      JSON.stringify(
        {
          database: db.rows[0],
          counts: counts.rows[0],
          tables: tables.rows.length,
          identityTableExists: identities.rows[0].exists,
          appliedMigrations: applied.length,
          pending,
          missingLocal,
          checksumMismatch,
          lineEndingOnly,
          contentMismatch: checksumMismatch.filter(
            (name) => !lineEndingOnly.includes(name),
          ),
          failed: migrations.rows
            .filter((row) => !row.finished_at && !row.rolled_back_at)
            .map((row) => row.migration_name),
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Read-only preflight failed:', error.code || error.name);
  process.exitCode = 1;
});

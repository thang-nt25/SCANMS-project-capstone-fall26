// Application public-schema backup only. This tool never migrates or writes the DB.
require('dotenv').config({ quiet: true });
const { spawnSync } = require('node:child_process');
const {
  mkdirSync,
  statSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
} = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');

function main() {
  const db = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  const runtime = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV === 'production')
    throw new Error('Development backup tool refuses production.');
  if (
    db.hostname !== runtime.hostname ||
    db.pathname !== runtime.pathname ||
    db.username !== runtime.username
  ) {
    throw new Error('CLI and runtime targets must be reviewed before backup.');
  }
  const schema = db.searchParams.get('schema') || 'public';
  if (schema !== 'public') throw new Error('This rollout only covers public.');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = resolve(
    __dirname,
    '../../.dev-runtime/private-backups',
    timestamp,
  );
  mkdirSync(directory, { recursive: true });
  // Restrict local access; a dump contains private user/order/identity data.
  const account = process.env.USERDOMAIN + '\\' + process.env.USERNAME;
  const acl = spawnSync(
    'icacls.exe',
    [directory, '/inheritance:r', '/grant:r', `${account}:(OI)(CI)F`],
    { windowsHide: true, encoding: 'utf8' },
  );
  if (acl.status !== 0)
    throw new Error('Cannot restrict backup directory ACL.');
  const file = resolve(directory, 'scanms-public.dump');
  const env = {
    ...process.env,
    PGHOST: db.hostname,
    PGPORT: db.port || '5432',
    PGDATABASE: decodeURIComponent(db.pathname.slice(1)),
    PGUSER: decodeURIComponent(db.username),
    PGPASSWORD: decodeURIComponent(db.password),
    PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '20',
    PGOPTIONS: '-c default_transaction_read_only=on',
  };
  const dump = spawnSync(
    'C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',
    [
      '--format=custom',
      '--schema=public',
      '--no-owner',
      '--no-acl',
      '--lock-wait-timeout=20000',
      '--file',
      file,
    ],
    { env, windowsHide: true, encoding: 'utf8', timeout: 180000 },
  );
  if (dump.status !== 0) {
    // Never echo provider errors that might include credentials or row values.
    throw new Error(
      `pg_dump failed (exit ${dump.status ?? 'timeout'}). No migration was run.`,
    );
  }
  if (statSync(file).size === 0) throw new Error('Backup is empty.');
  const list = spawnSync(
    'C:/Program Files/PostgreSQL/18/bin/pg_restore.exe',
    ['--list', file],
    { windowsHide: true, encoding: 'utf8', timeout: 20000 },
  );
  if (
    list.status !== 0 ||
    !list.stdout.includes('TABLE DATA public users') ||
    !list.stdout.includes('TABLE DATA public financial_ledgers')
  ) {
    throw new Error('Backup archive verification failed.');
  }
  const legacy = resolve(__dirname, '../data/customer-identities.json');
  copyFileSync(legacy, resolve(directory, 'customer-identities.json'));
  const manifest = {
    createdAt: new Date().toISOString(),
    target: `${db.hostname}:${db.port || '5432'}/${decodeURIComponent(db.pathname.slice(1))}?schema=public`,
    scope:
      'Application public schema only; not Supabase auth/storage schemas or hosted media files.',
    dumpFile: file,
    bytes: statSync(file).size,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    archiveListVerified: true,
    restoreVerified: false,
    legacyFileBackedUp: true,
  };
  writeFileSync(
    resolve(directory, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log(JSON.stringify(manifest, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

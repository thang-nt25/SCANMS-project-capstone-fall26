import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  importLegacyIdentities,
  parseLegacyIdentities,
} from '../src/modules/customer/customer-identity-import';

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(['--file', '--apply', '--confirm-target']);
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!allowed.has(key) || options.has(key)) {
      throw new Error('Use --file <path> [--apply --confirm-target <target>].');
    }
    const value = key === '--apply' ? 'true' : args[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing argument.');
    options.set(key, value);
  }
  const file = options.get('--file');
  if (!file) throw new Error('Provide the legacy JSON file with --file.');
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Database target is not configured.');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('PostgreSQL is required.');
  }
  const schema = url.searchParams.get('schema') || 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schema)) {
    throw new Error('Invalid database schema.');
  }
  const target = `${url.hostname}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1))}?schema=${schema}`;
  const rows = parseLegacyIdentities(
    JSON.parse(readFileSync(resolve(file), 'utf8')) as unknown,
  );
  console.log(JSON.stringify({ target, records: rows.length }, null, 2));
  if (!options.has('--apply')) {
    console.log('Dry run only. No database connection or write was made.');
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This development import tool is disabled in production.');
  }
  if (options.get('--confirm-target') !== target) {
    throw new Error('Confirm the exact target printed by the dry run.');
  }
  const pool = new Pool({ connectionString, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  try {
    console.log(JSON.stringify(await importLegacyIdentities(prisma, rows)));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main().catch(() => {
  // Prisma/URL errors can contain credentials or PII. Keep CLI failures generic.
  console.error(
    'Import failed. Check arguments, target confirmation, migration, JSON format and active account ownership. No identity values are printed.',
  );
  process.exitCode = 1;
});

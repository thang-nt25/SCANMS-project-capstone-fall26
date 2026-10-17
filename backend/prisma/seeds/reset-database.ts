import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { DatabaseTarget } from './seed.config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  assertResetMigrationHistory,
  inspectMigrationHistory,
} from './seed.audit';

const execute = promisify(execFile);

/** Reset is a separate development operation: rebuild migrations, including append-only triggers.
 * The subsequent fixture INSERTs are atomic, but schema reset itself cannot be undone by that transaction.
 */
export async function resetDatabase(
  target: DatabaseTarget,
  confirmation: string | undefined,
  nodeEnv: string | undefined,
  backupFile?: string,
): Promise<void> {
  if (nodeEnv === 'production' || confirmation !== target.confirmation)
    throw new Error(
      'Database reset requires confirmation for this exact non-production target.',
    );
  const host = new URL(target.connectionString).hostname;
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(host) &&
    (!backupFile ||
      !existsSync(backupFile) ||
      !statSync(backupFile).isFile() ||
      statSync(backupFile).size === 0)
  ) {
    throw new Error(
      'Set SCANMS_SEED_BACKUP_FILE to an existing pg_dump backup before resetting a shared database.',
    );
  }
  // Refuse to erase a database whose applied SQL cannot be reproduced from Git.
  // This check is read-only and releases all connections before invoking Prisma reset.
  const pool = new Pool({
    connectionString: target.connectionString,
    max: 1,
    connectionTimeoutMillis: 15_000,
  });
  const inspector = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: target.schema }),
  });
  try {
    const history = await inspector.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return inspectMigrationHistory(tx, target);
      },
      { timeout: 30_000 },
    );
    assertResetMigrationHistory(history);
  } finally {
    await inspector.$disconnect();
    await pool.end();
  }
  try {
    await execute(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'reset', '--force'],
      {
        cwd: resolve(__dirname, '../..'),
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
        env: {
          ...process.env,
          DATABASE_URL: target.connectionString,
          DIRECT_URL: target.connectionString,
        },
        windowsHide: true,
      },
    );
  } catch (error: unknown) {
    const record = error && typeof error === 'object' ? error : {};
    const message =
      'message' in record ? String(record.message) : String(error);
    const diagnostic = 'stderr' in record ? String(record.stderr) : '';
    throw new Error(
      `Prisma migration reset failed for ${target.label}: ${`${message}\n${diagnostic}`.split(target.connectionString).join('[redacted]')}`,
    );
  }
}

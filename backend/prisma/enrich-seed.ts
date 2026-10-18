import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parseDatabaseTarget } from './seeds/seed.config';
import { buildDataset } from './seeds/build-dataset';
import { assertDatabaseSchema } from './seeds/seed.database';
import { enrichExistingSeed } from './seeds/enrich-existing.seed';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--plan', '--apply'].includes(args[0]))
    throw new Error(
      'Choose --plan or --apply. This command never resets the database.',
    );
  if (process.env.NODE_ENV === 'production')
    throw new Error('Test-data enrichment is disabled in production.');
  const target = parseDatabaseTarget(
    process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  );
  const apply = args[0] === '--apply';
  if (apply && process.env.SCANMS_SEED_ENRICH_CONFIRM !== target.confirmation)
    throw new Error(
      'Inspect --plan, then set SCANMS_SEED_ENRICH_CONFIRM to the displayed target fingerprint.',
    );
  const pool = new Pool({
    connectionString: target.connectionString,
    max: 2,
    connectionTimeoutMillis: 15000,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: target.schema }),
  });
  try {
    await assertDatabaseSchema(prisma, target);
    const data = buildDataset({
      referenceDate: new Date(),
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      passwordHash: 'not-used-no-account-creation',
      shipping: [],
    });
    console.log(
      JSON.stringify({
        target: target.label,
        confirmation: target.confirmation,
        result: await enrichExistingSeed(prisma, data, apply),
      }),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Enrichment failed; no secrets printed. Inspect configuration and dry-run plan. Transactional writes are rolled back on failure.',
  );
  process.exitCode = 1;
});

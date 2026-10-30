import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { buildDataset } from './seeds/build-dataset';
import { readSeedOptions } from './seeds/seed.config';
import {
  applyDataset,
  assertDatabaseSchema,
  datasetCounts,
  MANIFEST_ID,
  verifyPersistedCounts,
  assertManifestVersion,
} from './seeds/seed.database';
import { DATASET_VERSION } from './seeds/seed.helpers';
import { resetDatabase } from './seeds/reset-database';
import { auditSeedDatabase, PENDING_HANDOVERS } from './seeds/seed.audit';
import { buildMarketplaceDemoPlan } from './seeds/marketplace.seed';

async function main(): Promise<void> {
  const options = readSeedOptions(process.argv.slice(2), process.env);
  const passwordHash =
    options.mode === 'apply'
      ? await bcrypt.hash(options.password!, 12)
      : 'plan-only-no-password';
  const context = {
    referenceDate: options.referenceDate,
    frontendUrl: options.frontendUrl,
    passwordHash,
    shipping: options.shipping,
  };
  const data = buildDataset(context);
  console.log(
    JSON.stringify(
      {
        dataset: DATASET_VERSION,
        mode: options.mode,
        target: options.target?.label ?? '(not configured)',
        reset: options.reset,
        resetConfirmation: options.target?.confirmation,
        referenceDate: options.referenceDate.toISOString(),
        counts: datasetCounts(data),
        dependencies: PENDING_HANDOVERS,
        marketplaceDemo:
          options.mode === 'plan'
            ? buildMarketplaceDemoPlan(data, context)
            : undefined,
        provenance: options.shipping.length
          ? `${options.shipping.length} GHN sandbox exports; remaining fixtures are synthetic`
          : 'Synthetic demo data; no real shipment or payment is created',
      },
      null,
      2,
    ),
  );
  if (options.mode === 'plan') return;

  const target = options.target!;
  if (options.reset)
    await resetDatabase(
      target,
      process.env.SCANMS_SEED_RESET_CONFIRM,
      process.env.NODE_ENV,
      process.env.SCANMS_SEED_BACKUP_FILE,
    );
  const pool = new Pool({
    connectionString: target.connectionString,
    max: 2,
    connectionTimeoutMillis: 15_000,
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool, { schema: target.schema }),
  });
  try {
    if (options.mode === 'audit') {
      await assertDatabaseSchema(prisma, target);
      const report = await auditSeedDatabase(prisma, target, data);
      console.log(JSON.stringify(report, null, 2));
      // Exit 2 means inspection completed but the installed snapshot/history is not ready.
      if (!report.datasetReady || !report.schemaHistoryReady)
        process.exitCode = 2;
    } else if (options.mode === 'check') {
      await assertDatabaseSchema(prisma, target);
      const manifest = await prisma.auditLog.findUnique({
        where: { id: MANIFEST_ID },
      });
      if (!manifest)
        throw new Error(
          'Schema is compatible, but the Capstone dataset has not been seeded in this database.',
        );
      assertManifestVersion(manifest.details);
      await prisma.$transaction(
        (tx) => verifyPersistedCounts(tx, target, data),
        { timeout: 30_000 },
      );
      console.log(
        'Fixture IDs and counts verified. Existing demo progress was preserved.',
      );
    } else {
      const result = await applyDataset(prisma, target, data);
      console.log(
        result === 'created'
          ? 'Seed committed successfully.'
          : 'Dataset already exists; no accounts or demo progress were overwritten.',
      );
      console.log(
        'Accounts: admin@seed.scanms.test; shop01..15@seed.scanms.test; kol01..20@seed.scanms.test; customer01..30@seed.scanms.test. Password: SCANMS_SEED_PASSWORD from your environment.',
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Avoid dumping connection strings or the demo password in CLI errors.
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  const safeMessage = [
    process.env.DATABASE_URL,
    process.env.DIRECT_URL,
    process.env.SCANMS_SEED_PASSWORD,
  ]
    .filter((value): value is string => Boolean(value))
    .reduce((text, value) => text.split(value).join('[redacted]'), message);
  console.error(error);
  console.error(`Seed failed: ${safeMessage}`);
  process.exitCode = 1;
});

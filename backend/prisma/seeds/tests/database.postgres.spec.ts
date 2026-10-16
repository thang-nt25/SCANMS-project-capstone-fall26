import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildDataset } from '../build-dataset';
import {
  applyDataset,
  MANIFEST_ID,
  verifyPersistedCounts,
} from '../seed.database';
import { parseDatabaseTarget } from '../seed.config';
import { seedId } from '../seed.helpers';

const connectionString = process.env.SEED_TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;

integration('Prisma seeder on isolated PostgreSQL', () => {
  let prisma: PrismaClient;
  let pool: Pool;
  const data = buildDataset({
    referenceDate: new Date('2026-10-16T05:00:00Z'),
    frontendUrl: 'http://localhost:5173',
    passwordHash: 'test-hash',
    shipping: [],
  });
  const baseTarget = parseDatabaseTarget(
    connectionString ??
      'postgresql://seed_test@127.0.0.1:55433/scanms_seed_test',
  );
  let target = baseTarget;

  beforeAll(() => {
    const url = new URL(baseTarget.connectionString);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.port !== '55433' ||
      url.pathname !== '/scanms_seed_test'
    ) {
      throw new Error(
        'Integration tests only accept the isolated local scanms_seed_test database on port 55433.',
      );
    }
  });

  beforeEach(async () => {
    // Every case receives a NEW schema. No reset/drop/delete, including on failed tests.
    const url = new URL(baseTarget.connectionString);
    const schema = `seed_test_${randomUUID().replace(/-/g, '')}`;
    url.searchParams.set('schema', schema);
    target = parseDatabaseTarget(url.toString());
    pool = new Pool({ connectionString: target.connectionString, max: 3 });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    await promisify(execFile)(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      {
        cwd: resolve(__dirname, '../../..'),
        timeout: 120_000,
        windowsHide: true,
        env: {
          ...process.env,
          DATABASE_URL: target.connectionString,
          DIRECT_URL: target.connectionString,
        },
      },
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool, { schema: target.schema }),
    });
  }, 120_000);

  afterEach(async () => {
    await prisma?.$disconnect();
    await pool?.end();
  });

  it('rolls back every earlier insert when a late foreign key fails', async () => {
    const broken = buildDataset({
      referenceDate: new Date('2026-10-16T05:00:00Z'),
      frontendUrl: 'http://localhost:5173',
      passwordHash: 'test',
      shipping: [],
    });
    broken.messages[0].senderId = seedId('non-existent-sender');
    await expect(applyDataset(prisma, target, broken)).rejects.toMatchObject({
      code: 'P2003',
    });
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.financialLedger.count()).toBe(0);
    expect(
      await prisma.auditLog.findUnique({ where: { id: MANIFEST_ID } }),
    ).toBeNull();
  }, 120_000);

  it('inserts all fixtures, reconciles ledger balances and passes persisted ID checks', async () => {
    expect(await applyDataset(prisma, target, data)).toBe('created');
    await prisma.$transaction((tx) => verifyPersistedCounts(tx, target, data));
    expect(await prisma.productReview.count()).toBe(66);
    const wallets = await prisma.wallet.findMany({
      include: { financialLedgers: true },
    });
    for (const wallet of wallets) {
      for (const bucket of ['AVAILABLE', 'PENDING'] as const) {
        const sum = wallet.financialLedgers
          .filter((row) => row.balanceBucket === bucket)
          .reduce(
            (total, row) => total.plus(row.amount),
            new Prisma.Decimal(0),
          );
        expect(
          sum.equals(
            bucket === 'AVAILABLE'
              ? wallet.availableBalance
              : wallet.pendingBalance,
          ),
        ).toBe(true);
      }
    }
    const reviews = await prisma.productReview.findMany({
      include: { order: true },
    });
    expect(reviews.every((row) => row.order?.status === 'COMPLETED')).toBe(
      true,
    );
  }, 120_000);

  it('does not reset passwords, stock or return progress on a second run', async () => {
    await applyDataset(prisma, target, data);
    await prisma.user.update({
      where: { id: data.users[0].id },
      data: { passwordHash: 'changed-by-tester' },
    });
    await prisma.product.update({
      where: { id: data.products[0].id },
      data: { stockQuantity: 123 },
    });
    await prisma.returnRequest.update({
      where: { id: data.returns[0].id },
      data: { status: 'SHOP_APPROVED' },
    });
    expect(await applyDataset(prisma, target, data)).toBe('unchanged');
    expect(await prisma.user.count()).toBe(66);
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: data.users[0].id },
        })
      ).passwordHash,
    ).toBe('changed-by-tester');
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: data.products[0].id },
        })
      ).stockQuantity,
    ).toBe(123);
    expect(
      (
        await prisma.returnRequest.findUniqueOrThrow({
          where: { id: data.returns[0].id },
        })
      ).status,
    ).toBe('SHOP_APPROVED');
    await prisma.liveSessionViewer.create({
      data: { sessionId: data.liveSessions[0].id!, clientId: 'actual-tester' },
    });
    await prisma.$transaction((tx) => verifyPersistedCounts(tx, target, data));
  }, 120_000);

  it('serializes concurrent seed invocations without duplicates', async () => {
    const results = await Promise.all([
      applyDataset(prisma, target, data),
      applyDataset(prisma, target, data),
    ]);
    expect(results.sort()).toEqual(['created', 'unchanged']);
    expect(await prisma.order.count()).toBe(60);
    expect(await prisma.auditLog.count({ where: { id: MANIFEST_ID } })).toBe(1);
  }, 120_000);

  it('preserves unrelated records and leaves the immutable-ledger trigger enabled', async () => {
    const outsider = await prisma.user.create({
      data: {
        email: 'unrelated@local.scanms.test',
        fullName: 'Other fixture',
        passwordHash: 'local-test',
        role: 'CUSTOMER',
      },
    });
    await applyDataset(prisma, target, data);
    expect(
      await prisma.user.findUnique({ where: { id: outsider.id } }),
    ).not.toBeNull();
    await expect(
      prisma.financialLedger.update({
        where: { id: data.ledgers[0].id },
        data: { amount: 1 },
      }),
    ).rejects.toThrow('append-only');
    expect(await prisma.user.count()).toBe(67);
  }, 120_000);
});

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
import { auditSeedDatabase } from '../seed.audit';
import { ChatService } from '../../../src/modules/chat/chat.service';
import { DATASET_VERSION } from '../seed.helpers';
import { enrichExistingSeed, ENRICHMENT_ID } from '../enrich-existing.seed';
import { CREATOR_NAMES } from '../data/people.data';

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
      !['55433', '25433'].includes(url.port) ||
      url.username !== 'seed_test' ||
      url.pathname !== '/scanms_seed_test'
    ) {
      throw new Error(
        'Integration tests only accept seed_test on the isolated local scanms_seed_test database, port 55433 or 25433.',
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
    expect(await prisma.coupon.count()).toBe(70);
    expect(await prisma.customerSavedCoupon.count()).toBe(30);
    expect(await prisma.stackedVoucherRedemption.count()).toBe(
      data.stackedRedemptions.length,
    );
    expect(
      await prisma.sampleShippingCharge.count({
        where: {
          environment: 'TEST',
          amount: null,
          payer: 'SHOP',
          codAmount: 0,
          status: 'PENDING_CONFIRMATION',
        },
      }),
    ).toBe(15);
    const campaigns = await prisma.campaign.findMany();
    expect(
      campaigns.every(
        (row) =>
          row.bonusBudgetUsed.greaterThan(0) &&
          row.bonusBudgetUsed.lessThanOrEqualTo(row.bonusBudgetTotal!),
      ),
    ).toBe(true);
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

  it('additively enriches the old v3 cohort without touching tester edits, finances, passwords or order progress', async () => {
    const legacy = buildDataset({ referenceDate: new Date('2026-10-16T05:00:00Z'),
      frontendUrl: 'http://localhost:5173', passwordHash: 'unchanged-password-hash', shipping: [] });
    legacy.sponsoredPlacements = [];
    legacy.products.forEach(row => { row.barcode = null; row.packageWeight = null;
      row.packageLength = null; row.packageWidth = null; row.packageHeight = null; });
    CREATOR_NAMES.forEach((name, index) => {
      legacy.users.find(row => row.id === seedId(`creator:${index}`))!.fullName = name;
      const profile = legacy.profiles[index];
      profile.bio = 'Hồ sơ người sáng tạo giả lập phục vụ kiểm thử Capstone SCANMS.';
      delete profile.socialLinksJson;
      legacy.socialChannels[index].channelUrl = `https://social.scanms.invalid/creator/${index + 1}`;
    });
    await applyDataset(prisma, target, legacy);
    await prisma.product.update({ where: { id: data.products[1].id }, data: { packageWeight: 777, stockQuantity: 123 } });
    await prisma.user.update({ where: { id: seedId('creator:1') }, data: { fullName: 'Tên tester tự sửa' } });
    const before = await prisma.financialLedger.count();
    const ordersBefore = await prisma.order.findMany({ select: { id: true, status: true }, orderBy: { id: 'asc' } });
    const plan = await enrichExistingSeed(prisma, data, false);
    expect(plan).toMatchObject({ mode: 'plan', products: 30, creators: 19, placements: 2 });
    expect(await prisma.product.count({ where: { barcode: null } })).toBe(30);
    expect(await prisma.sponsoredPlacement.count()).toBe(0);
    expect(await enrichExistingSeed(prisma, data, true)).toMatchObject({ mode: 'applied', products: 30, creators: 19, placements: 2 });
    expect(await enrichExistingSeed(prisma, data, true)).toMatchObject({ mode: 'unchanged' });
    expect(await prisma.financialLedger.count()).toBe(before);
    expect(await prisma.order.findMany({ select: { id: true, status: true }, orderBy: { id: 'asc' } })).toEqual(ordersBefore);
    expect(await prisma.product.findUnique({ where: { id: data.products[1].id } })).toMatchObject({ packageWeight: 777, stockQuantity: 123 });
    expect(await prisma.user.findUnique({ where: { id: seedId('creator:1') } })).toMatchObject({ fullName: 'Tên tester tự sửa', passwordHash: 'unchanged-password-hash' });
    expect(await prisma.product.count({ where: { barcode: null } })).toBe(0);
    expect(await prisma.sponsoredPlacement.count()).toBe(2);
    expect(await prisma.auditLog.findUnique({ where: { id: ENRICHMENT_ID } })).not.toBeNull();
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

  it('reconciles the installed snapshot and lets the real chat service clear seeded message notifications', async () => {
    await applyDataset(prisma, target, data);
    const before = await auditSeedDatabase(prisma, target, data);
    expect(before.datasetReady).toBe(true);
    expect(before.schemaHistoryReady).toBe(true);
    expect(before.fullUpgradeReady).toBe(false);
    const message = data.messages.find(
      (row) => row.id === seedId('shop-reply:1'),
    )!;
    expect(message.isRead).toBe(false);
    const chat = new ChatService(prisma as never, {} as never);
    await chat.markRead(message.conversationId, seedId('customer:1'));
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: message.id },
        })
      ).isRead,
    ).toBe(true);
    expect((await auditSeedDatabase(prisma, target, data)).datasetReady).toBe(
      true,
    );
  }, 120_000);

  it('refuses applying a new revision over v1/v2 without changing accounts or financial data', async () => {
    await applyDataset(prisma, target, data);
    for (const revision of [
      'scanms-capstone-2026-v1',
      'scanms-capstone-2026-v2',
    ]) {
      await prisma.auditLog.update({
        where: { id: MANIFEST_ID },
        data: { details: { dataset: revision } },
      });
      await expect(applyDataset(prisma, target, data)).rejects.toThrow(
        'older/different seed revision',
      );
    }
    expect(await prisma.user.count()).toBe(66);
    expect(await prisma.financialLedger.count()).toBe(data.ledgers.length);
    expect((await auditSeedDatabase(prisma, target, data)).datasetReady).toBe(
      false,
    );
  }, 120_000);

  it('detects persisted balance drift and missing fixtures without writing or repairing them', async () => {
    await applyDataset(prisma, target, data);
    await prisma.wallet.update({
      where: { id: data.wallets[0].id },
      data: { availableBalance: { increment: 1 } },
    });
    await prisma.notification.delete({ where: { id: data.messages[0].id } });
    const audit = await auditSeedDatabase(prisma, target, data);
    expect(audit.datasetReady).toBe(false);
    expect(audit.reconciliation.walletMismatches).toBe(1);
    expect(audit.reconciliation.unreadChatMismatches).toBe(1);
    expect(audit.fixtureDifferences).toEqual([
      expect.objectContaining({ table: 'notifications' }),
    ]);
    expect(
      await prisma.notification.findUnique({
        where: { id: data.messages[0].id },
      }),
    ).toBeNull();
  }, 120_000);

  it('runs the real Prisma CLI seed → check → seed again → read-only audit on a fresh database schema', async () => {
    const execute = promisify(execFile);
    const cwd = resolve(__dirname, '../../..');
    const env = {
      ...process.env,
      DATABASE_URL: target.connectionString,
      DIRECT_URL: target.connectionString,
      NODE_ENV: 'test',
      SCANMS_SEED_PASSWORD: randomUUID(),
      SCANMS_SEED_REFERENCE_DATE: '2026-10-16T05:00:00Z',
    };
    await execute(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'db', 'seed'],
      { cwd, env, windowsHide: true, timeout: 60000 },
    );
    for (const args of [['--check'], [], ['--audit']]) {
      await execute(
        process.execPath,
        [
          resolve(cwd, 'node_modules/ts-node/dist/bin.js'),
          '--project',
          'prisma/tsconfig.seed.json',
          'prisma/seed.ts',
          ...args,
        ],
        { cwd, env, windowsHide: true, timeout: 60000 },
      );
    }
    expect(await prisma.user.count()).toBe(66);
    expect(await prisma.notification.count()).toBe(160);
    expect(await prisma.auditLog.count({ where: { id: MANIFEST_ID } })).toBe(1);
    const manifest = await prisma.auditLog.findUniqueOrThrow({
      where: { id: MANIFEST_ID },
    });
    expect(manifest.details).toMatchObject({ dataset: DATASET_VERSION });
  }, 180_000);
});

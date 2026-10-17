import { Prisma, type PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  datasetCounts,
  MANIFEST_ID,
  readPersistedCounts,
} from './seed.database';
import { DATASET_VERSION, jsonObject, seedId } from './seed.helpers';
import { activeSponsoredPlacements } from '../../src/modules/stores/sponsored-placement.config';
import type { DatabaseTarget } from './seed.config';
import type { SeedDataset, SeedTable } from './seed.types';

/** Remaining missing schema contract; shipping evidence is reported separately. */
export const PENDING_HANDOVERS = [
  {
    id: 'PRODUCT_PACKAGE_FIELDS',
    owner: 'Tuấn',
    requirement: 'Persisted barcode, weight and package dimensions',
  },
] as const;

export interface MigrationHistory {
  pending: string[];
  missingLocal: string[];
  contentMismatch: string[];
  lineEndingOnly: string[];
  failed: string[];
}

export function compareMigrationHistory(
  local: Map<string, Buffer>,
  applied: {
    migration_name: string;
    checksum: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }[],
): MigrationHistory {
  const result: MigrationHistory = {
    pending: [],
    missingLocal: [],
    contentMismatch: [],
    lineEndingOnly: [],
    failed: [],
  };
  const completed = new Set<string>();
  for (const row of applied) {
    if (row.rolled_back_at) continue;
    if (!row.finished_at) {
      result.failed.push(row.migration_name);
      continue;
    }
    completed.add(row.migration_name);
    const bytes = local.get(row.migration_name);
    if (!bytes) {
      result.missingLocal.push(row.migration_name);
      continue;
    }
    const hash = (value: Buffer | string) =>
      createHash('sha256').update(value).digest('hex');
    if (hash(bytes) !== row.checksum) {
      const lf = bytes.toString('utf8').replace(/\r\n/g, '\n');
      if (
        [lf, lf.replace(/\n/g, '\r\n')].some(
          (text) => hash(text) === row.checksum,
        )
      )
        result.lineEndingOnly.push(row.migration_name);
      else result.contentMismatch.push(row.migration_name);
    }
  }
  result.pending = [...local.keys()].filter((name) => !completed.has(name));
  return result;
}

export function assertResetMigrationHistory(history: MigrationHistory): void {
  if (
    history.missingLocal.length ||
    history.contentMismatch.length ||
    history.failed.length
  ) {
    throw new Error(
      `Reset blocked: reconcile migration history first (${history.missingLocal.length} missing local files, ${history.contentMismatch.length} SQL content mismatches, ${history.failed.length} unfinished migrations). A backup does not make an incomplete migration chain safe to rebuild.`,
    );
  }
}

export async function inspectMigrationHistory(
  prisma: Pick<Prisma.TransactionClient, '$queryRaw'>,
  target: DatabaseTarget,
): Promise<MigrationHistory> {
  const directory = resolve(__dirname, '../migrations');
  const local = new Map(
    readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [
        entry.name,
        readFileSync(resolve(directory, entry.name, 'migration.sql')),
      ]),
  );
  const migrationTable = Prisma.raw(
    `"${target.schema.replace(/"/g, '""')}"."_prisma_migrations"`,
  );
  return compareMigrationHistory(
    local,
    await prisma.$queryRaw<
      {
        migration_name: string;
        checksum: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }[]
    >`SELECT migration_name, checksum, finished_at, rolled_back_at FROM ${migrationTable}`,
  );
}

/** Read-only inspection, including reconciliation after testers changed data. No PII in output. */
export async function auditSeedDatabase(
  prisma: PrismaClient,
  target: DatabaseTarget,
  data: SeedDataset,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const migrations = await inspectMigrationHistory(tx, target);
      const manifest = await tx.auditLog.findUnique({
        where: { id: MANIFEST_ID },
        select: { details: true },
      });
      const revision = jsonObject(manifest?.details).dataset;
      const expected = datasetCounts(data);
      const actual = await readPersistedCounts(tx, target, data);
      const fixtureDifferences = (Object.keys(expected) as SeedTable[])
        .filter((key) => actual[key] !== expected[key])
        .map((key) => ({
          table: key,
          expected: expected[key],
          actual: actual[key],
        }));
      const wallets = await tx.wallet.findMany({
        where: { id: { in: data.wallets.map((row) => row.id!) } },
        select: {
          id: true,
          availableBalance: true,
          pendingBalance: true,
          financialLedgers: {
            select: { amount: true, balanceBucket: true, storeId: true },
          },
          storeWallets: {
            select: {
              storeId: true,
              availableBalance: true,
              pendingBalance: true,
            },
          },
        },
      });
      let walletMismatches = 0;
      let storeWalletMismatches = 0;
      for (const wallet of wallets) {
        const sum = (bucket: string, storeId?: string) =>
          wallet.financialLedgers
            .filter(
              (entry) =>
                entry.balanceBucket === bucket &&
                (!storeId || entry.storeId === storeId),
            )
            .reduce(
              (total, entry) => total.plus(entry.amount),
              new Prisma.Decimal(0),
            );
        if (
          !sum('AVAILABLE').equals(wallet.availableBalance) ||
          !sum('PENDING').equals(wallet.pendingBalance)
        )
          walletMismatches++;
        for (const store of wallet.storeWallets)
          if (
            !sum('AVAILABLE', store.storeId).equals(store.availableBalance) ||
            !sum('PENDING', store.storeId).equals(store.pendingBalance)
          )
            storeWalletMismatches++;
      }
      // Check all incoming unread fixture messages, not just currently unread seed snapshots.
      const messages = await tx.chatMessage.findMany({
        where: { id: { in: data.messages.map((row) => row.id!) } },
        select: {
          id: true,
          isRead: true,
          senderId: true,
          conversation: {
            select: {
              customerId: true,
              collaboratorId: true,
              store: { select: { ownerId: true } },
            },
          },
        },
      });
      const notifications = await tx.notification.findMany({
        where: {
          type: 'CHAT_MESSAGE',
          id: { in: data.messages.map((row) => row.id!) },
        },
        select: { id: true, userId: true, isRead: true },
      });
      const notificationMap = new Map(
        notifications.map((row) => [row.id, row]),
      );
      const unreadChatMismatches = messages.filter((message) => {
        const conversation = message.conversation;
        const recipient =
          message.senderId === conversation.store.ownerId
            ? conversation.customerId || conversation.collaboratorId
            : conversation.store.ownerId;
        const notification = notificationMap.get(message.id);
        // Dismissing a notification need not mark the conversation read; the reverse must hold.
        return (
          !notification ||
          notification.userId !== recipient ||
          (message.isRead && !notification.isRead)
        );
      }).length;
      const total = {
        users: await tx.user.count(),
        orders: await tx.order.count(),
        ledgers: await tx.financialLedger.count(),
      };
      const sessions = await tx.liveShoppingSession.findMany({
        where: { id: { in: data.liveSessions.map((row) => row.id!) } },
        select: { governance: true, products: { select: { productId: true } } },
      });
      const livePinMismatches = sessions.filter((session) => {
        const pinned = jsonObject(session.governance).pinnedProductId;
        return (
          typeof pinned !== 'string' ||
          !session.products.some((row) => row.productId === pinned)
        );
      }).length;
      const configured = activeSponsoredPlacements(
        process.env.MARKETPLACE_SPONSORED_PLACEMENTS,
      );
      const eligible = await tx.store.findMany({
        where: {
          id: { in: configured.map((row) => row.storeId) },
          isDeleted: false,
          isActive: true,
          isVerified: true,
          onboardingStatus: 'VERIFIED',
          owner: { isActive: true },
        },
        select: { id: true },
      });
      const expectedDemoStoreIds = [seedId('store:0'), seedId('store:1')];
      const schemaHistoryReady =
        !migrations.pending.length &&
        !migrations.missingLocal.length &&
        !migrations.contentMismatch.length &&
        !migrations.failed.length;
      const datasetReady =
        revision === DATASET_VERSION &&
        !fixtureDifferences.length &&
        !walletMismatches &&
        !storeWalletMismatches &&
        !unreadChatMismatches &&
        !livePinMismatches;
      return {
        target: target.label,
        expectedRevision: DATASET_VERSION,
        installedRevision: revision ?? null,
        total,
        expected,
        actual,
        fixtureDifferences,
        migrations,
        reconciliation: {
          walletMismatches,
          storeWalletMismatches,
          unreadChatMismatches,
          livePinMismatches,
        },
        marketplaceConfiguration: {
          source: 'MARKETPLACE_SPONSORED_PLACEMENTS deployment environment',
          expectedDemoStoreIds,
          configuredActiveStoreIds: eligible.map((row) => row.id),
          requiresDeploymentConfiguration: !expectedDemoStoreIds.every((id) =>
            eligible.some((row) => row.id === id),
          ),
          autoApplied: false,
        },
        datasetReady,
        schemaHistoryReady,
        fullUpgradeReady: false,
        pendingHandovers: PENDING_HANDOVERS,
        realShipmentCount: data.orders.filter(
          (order) => jsonObject(order.rawPayload).ghnIsReal === true,
        ).length,
        transactionProvenance:
          'Seed payments/payouts are synthetic, not PayOS/bank sandbox evidence.',
      };
    },
    { timeout: 90_000, maxWait: 15_000, isolationLevel: 'RepeatableRead' },
  );
}

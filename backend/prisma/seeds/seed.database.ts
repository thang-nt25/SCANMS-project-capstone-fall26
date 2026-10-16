import { Prisma, type PrismaClient } from '@prisma/client';
import * as PrismaExports from '@prisma/client';
import type { DatabaseTarget } from './seed.config';
import type { SeedDataset, SeedTable } from './seed.types';
import { ADMIN_ID, assertSeed, DATASET_VERSION, seedId } from './seed.helpers';
import { inventoryBaseline } from './inventory.seed';

export const MANIFEST_ID = seedId('manifest');
const MODEL_NAMES: Record<SeedTable, string> = {
  users: 'User',
  tiers: 'CollaboratorTier',
  profiles: 'CollaboratorProfile',
  socialChannels: 'CollaboratorSocialChannel',
  addresses: 'CustomerAddress',
  stores: 'Store',
  products: 'Product',
  variants: 'ProductVariant',
  mediaAssets: 'MediaAsset',
  collaborations: 'StoreCollaborator',
  follows: 'StoreFollow',
  campaigns: 'Campaign',
  campaignParticipants: 'CampaignParticipant',
  campaignProducts: 'CampaignProduct',
  conversations: 'Conversation',
  messages: 'ChatMessage',
  deals: 'ExclusiveDealProposal',
  referralLinks: 'ReferralLink',
  coupons: 'Coupon',
  couponProducts: 'CouponProduct',
  redemptions: 'CouponRedemption',
  liveSessions: 'LiveShoppingSession',
  liveProducts: 'LiveSessionProduct',
  liveViewers: 'LiveSessionViewer',
  orders: 'Order',
  orderItems: 'OrderItem',
  commissions: 'Commission',
  payments: 'PaymentTransaction',
  reviews: 'ProductReview',
  samples: 'SampleProductRequest',
  sampleEvents: 'SampleRequestEvent',
  returns: 'ReturnRequest',
  returnItems: 'ReturnItem',
  returnEvents: 'ReturnEvent',
  wallets: 'Wallet',
  storeWallets: 'StoreWallet',
  ledgers: 'FinancialLedger',
  payouts: 'PayoutRequest',
  notifications: 'Notification',
};

const quoted = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;
const modelFor = (key: SeedTable) =>
  Prisma.dmmf.datamodel.models.find(
    (model) => model.name === MODEL_NAMES[key],
  )!;

/** Detect schema drift before inserting even one fixture. Never auto-apply migrations. */
export async function assertDatabaseSchema(
  prisma: PrismaClient,
  target: DatabaseTarget,
): Promise<void> {
  const columns = await prisma.$queryRaw<
    { table_name: string; column_name: string }[]
  >`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = ${target.schema}`;
  const available = new Set(
    columns.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const missing: string[] = [];
  for (const model of Prisma.dmmf.datamodel.models)
    for (const field of model.fields.filter((row) => row.kind !== 'object')) {
      const column = `${model.dbName || model.name}.${field.dbName || field.name}`;
      if (!available.has(column)) missing.push(column);
    }
  const enumValues = await prisma.$queryRaw<
    { type_name: string; value: string }[]
  >`
    SELECT t.typname AS type_name, e.enumlabel AS value
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = ${target.schema}`;
  // Prisma 7's runtime DMMF omits enum definitions, but exposes enum field names.
  const enums = new Set(
    Prisma.dmmf.datamodel.models.flatMap((model) =>
      model.fields
        .filter((field) => field.kind === 'enum')
        .map((field) => field.type),
    ),
  );
  const definitions = PrismaExports as unknown as Record<
    string,
    Record<string, string>
  >;
  for (const name of enums)
    for (const value of Object.values(definitions[name])) {
      if (
        !enumValues.some((row) => row.type_name === name && row.value === value)
      )
        missing.push(`enum ${name}.${value}`);
    }
  if (missing.length)
    throw new Error(
      `Database schema is behind the checked-out code (${missing.length} missing columns/enum values): ${missing.slice(0, 12).join(', ')}. Apply the reviewed project migrations first.`,
    );
}

type TableWriter = (
  tx: Prisma.TransactionClient,
  data: SeedDataset,
) => Prisma.PrismaPromise<Prisma.BatchPayload>;

// Explicit dependency order. Prisma checks each createMany input at compile time.
const WRITERS: Record<SeedTable, TableWriter> = {
  users: (tx, d) => tx.user.createMany({ data: d.users }),
  tiers: (tx, d) => tx.collaboratorTier.createMany({ data: d.tiers }),
  profiles: (tx, d) => tx.collaboratorProfile.createMany({ data: d.profiles }),
  socialChannels: (tx, d) =>
    tx.collaboratorSocialChannel.createMany({ data: d.socialChannels }),
  addresses: (tx, d) => tx.customerAddress.createMany({ data: d.addresses }),
  stores: (tx, d) => tx.store.createMany({ data: d.stores }),
  products: (tx, d) => tx.product.createMany({ data: d.products }),
  variants: (tx, d) => tx.productVariant.createMany({ data: d.variants }),
  collaborations: (tx, d) =>
    tx.storeCollaborator.createMany({ data: d.collaborations }),
  follows: (tx, d) => tx.storeFollow.createMany({ data: d.follows }),
  campaigns: (tx, d) => tx.campaign.createMany({ data: d.campaigns }),
  campaignParticipants: (tx, d) =>
    tx.campaignParticipant.createMany({ data: d.campaignParticipants }),
  campaignProducts: (tx, d) =>
    tx.campaignProduct.createMany({ data: d.campaignProducts }),
  conversations: (tx, d) =>
    tx.conversation.createMany({ data: d.conversations }),
  deals: (tx, d) => tx.exclusiveDealProposal.createMany({ data: d.deals }),
  referralLinks: (tx, d) =>
    tx.referralLink.createMany({ data: d.referralLinks }),
  liveSessions: (tx, d) =>
    tx.liveShoppingSession.createMany({ data: d.liveSessions }),
  liveProducts: (tx, d) =>
    tx.liveSessionProduct.createMany({ data: d.liveProducts }),
  liveViewers: (tx, d) =>
    tx.liveSessionViewer.createMany({ data: d.liveViewers }),
  coupons: (tx, d) => tx.coupon.createMany({ data: d.coupons }),
  couponProducts: (tx, d) =>
    tx.couponProduct.createMany({ data: d.couponProducts }),
  orders: (tx, d) => tx.order.createMany({ data: d.orders }),
  orderItems: (tx, d) => tx.orderItem.createMany({ data: d.orderItems }),
  payments: (tx, d) => tx.paymentTransaction.createMany({ data: d.payments }),
  commissions: (tx, d) => tx.commission.createMany({ data: d.commissions }),
  redemptions: (tx, d) =>
    tx.couponRedemption.createMany({ data: d.redemptions }),
  reviews: (tx, d) => tx.productReview.createMany({ data: d.reviews }),
  samples: (tx, d) => tx.sampleProductRequest.createMany({ data: d.samples }),
  sampleEvents: (tx, d) =>
    tx.sampleRequestEvent.createMany({ data: d.sampleEvents }),
  mediaAssets: (tx, d) => tx.mediaAsset.createMany({ data: d.mediaAssets }),
  returns: (tx, d) => tx.returnRequest.createMany({ data: d.returns }),
  returnItems: (tx, d) => tx.returnItem.createMany({ data: d.returnItems }),
  returnEvents: (tx, d) => tx.returnEvent.createMany({ data: d.returnEvents }),
  wallets: (tx, d) => tx.wallet.createMany({ data: d.wallets }),
  storeWallets: (tx, d) => tx.storeWallet.createMany({ data: d.storeWallets }),
  ledgers: (tx, d) => tx.financialLedger.createMany({ data: d.ledgers }),
  payouts: (tx, d) => tx.payoutRequest.createMany({ data: d.payouts }),
  notifications: (tx, d) =>
    tx.notification.createMany({ data: d.notifications }),
  messages: (tx, d) => tx.chatMessage.createMany({ data: d.messages }),
};

export function datasetCounts(data: SeedDataset): Record<SeedTable, number> {
  return Object.fromEntries(
    (Object.keys(data) as SeedTable[]).map((key) => [key, data[key].length]),
  ) as Record<SeedTable, number>;
}

/** Verify fixture IDs without assuming the database contains no other team data. */
export async function verifyPersistedCounts(
  tx: Prisma.TransactionClient,
  target: DatabaseTarget,
  data: SeedDataset,
): Promise<void> {
  for (const key of Object.keys(WRITERS) as SeedTable[]) {
    const model = modelFor(key);
    const table = Prisma.raw(
      `${quoted(target.schema)}.${quoted(model.dbName || model.name)}`,
    );
    let result: { count: bigint }[];
    if (key === 'liveViewers') {
      const identities = data.liveViewers.map(
        (row) => Prisma.sql`(${row.sessionId}::uuid, ${row.clientId})`,
      );
      if (!identities.length) continue;
      result =
        await tx.$queryRaw`SELECT count(*) FROM ${table} WHERE (session_id, client_id) IN (${Prisma.join(identities)})`;
    } else {
      const ids = (data[key] as { id?: string }[]).map(
        (row) => Prisma.sql`${row.id}::uuid`,
      );
      if (!ids.length) continue;
      result =
        await tx.$queryRaw`SELECT count(*) FROM ${table} WHERE id IN (${Prisma.join(ids)})`;
    }
    assertSeed(
      Number(result[0].count) === data[key].length,
      `persisted ${key} count mismatch`,
    );
  }
}

export async function applyDataset(
  prisma: PrismaClient,
  target: DatabaseTarget,
  data: SeedDataset,
): Promise<'created' | 'unchanged'> {
  await assertDatabaseSchema(prisma, target);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(170026, 2026)`;
      const manifest = await tx.auditLog.findUnique({
        where: { id: MANIFEST_ID },
      });
      if (manifest) return 'unchanged';
      for (const key of Object.keys(WRITERS) as SeedTable[])
        if (data[key].length) await WRITERS[key](tx, data);
      await verifyPersistedCounts(tx, target, data);
      await tx.auditLog.create({
        data: {
          id: MANIFEST_ID,
          userId: ADMIN_ID,
          action: 'CAPSTONE_DATASET_SEEDED',
          details: {
            dataset: DATASET_VERSION,
            counts: datasetCounts(data),
            source: 'SYNTHETIC_CAPSTONE',
            earliestOrderAt: data.orders[0].createdAt!.toString(),
            inventoryBaseline: inventoryBaseline(data),
            unsupported: [
              'SPONSORED_SHOP_PLACEMENT',
              'ADDITIVE_COMMISSION_ENGINE',
              'SHIPPING_VOUCHER_MODEL',
            ],
          },
        },
      });
      return 'created';
    },
    { maxWait: 15_000, timeout: 120_000, isolationLevel: 'ReadCommitted' },
  );
}

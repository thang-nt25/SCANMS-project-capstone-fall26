import { Prisma, type PrismaClient } from '@prisma/client';
import { hasSponsorshipCapacity } from '../../src/modules/stores/sponsorship/sponsorship-capacity';
import { ADMIN_ID, jsonObject, seedId } from './seed.helpers';
import { MANIFEST_ID, assertManifestVersion } from './seed.database';
import { CREATOR_NAMES } from './data/people.data';
import type { SeedDataset } from './seed.types';

export const ENRICHMENT_ID = seedId(
  'enrichment:public-references-packages-sponsorship:20261018:v1',
);
const packageFields = [
  'barcode',
  'packageWeight',
  'packageLength',
  'packageWidth',
  'packageHeight',
] as const;

/** Only fill unknown metadata on known fixture IDs. Never overwrite measured/user-edited fields. */
export function missingFixturePackage(
  current: { labelInfo: string | null; sku: string } & Record<
    (typeof packageFields)[number],
    string | number | null
  >,
  expected: SeedDataset['products'][number],
): Record<string, string | number> {
  if (
    current.sku !== expected.sku ||
    !current.labelInfo?.includes('EAN-13 nội bộ demo:')
  )
    return {};
  return Object.fromEntries(
    packageFields
      .filter((key) => current[key] === null)
      .map((key) => [key, expected[key]]),
  ) as Record<string, string | number>;
}

/** Additive upgrade for the installed v3 fixture cohort; no reset, account creation or financial writes. */
export async function enrichExistingSeed(
  prisma: PrismaClient,
  data: SeedDataset,
  apply: boolean,
) {
  return prisma.$transaction(
    async (tx) => {
      if (apply) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(170026, 2026)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731091, 0)`;
      } else await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const manifest = await tx.auditLog.findUnique({
        where: { id: MANIFEST_ID },
      });
      if (!manifest)
        throw new Error(
          'The reviewed v3 seed manifest is required; no unscoped database enrichment is allowed.',
        );
      assertManifestVersion(manifest.details);
      if (await tx.auditLog.findUnique({ where: { id: ENRICHMENT_ID } })) {
        return {
          mode: 'unchanged',
          products: 0,
          creators: 0,
          placements: 0,
          skipped: [] as string[],
        };
      }
      const result = {
        mode: apply ? 'applied' : 'plan',
        products: 0,
        creators: 0,
        placements: 0,
        skipped: [] as string[],
      };
      const before: Record<string, unknown>[] = [];
      for (const product of data.products) {
        const current = await tx.product.findUnique({
          where: { id: product.id! },
          select: {
            id: true,
            sku: true,
            labelInfo: true,
            barcode: true,
            packageWeight: true,
            packageLength: true,
            packageWidth: true,
            packageHeight: true,
          },
        });
        if (!current) {
          result.skipped.push(`missing-product:${product.id}`);
          continue;
        }
        const patch = missingFixturePackage(current, product);
        if (!Object.keys(patch).length) continue;
        before.push({ table: 'products', ...current });
        if (apply) {
          // Compare every observed field so a concurrent Shop edit aborts instead of being overwritten.
          const changed = await tx.product.updateMany({
            where: current,
            data: patch,
          });
          if (changed.count !== 1)
            throw new Error(
              'A product changed during enrichment; the transaction was rolled back.',
            );
        }
        result.products++;
      }
      for (let index = 0; index < CREATOR_NAMES.length; index++) {
        const userId = seedId(`creator:${index}`);
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            role: true,
          },
        });
        const channel = await tx.collaboratorSocialChannel.findUnique({
          where: { id: seedId(`social:${index}`) },
        });
        const profile = await tx.collaboratorProfile.findUnique({
          where: { userId },
        });
        const untouched =
          user?.role === 'COLLABORATOR' &&
          user.email ===
            `kol${String(index + 1).padStart(2, '0')}@seed.scanms.test` &&
          user.fullName === CREATOR_NAMES[index] &&
          channel?.channelUrl ===
            `https://social.scanms.invalid/creator/${index + 1}` &&
          profile?.bio ===
            'Hồ sơ người sáng tạo giả lập phục vụ kiểm thử Capstone SCANMS.';
        if (!untouched || !profile || !channel || !user) {
          result.skipped.push(
            `creator-edited-or-already-enriched:${index + 1}`,
          );
          continue;
        }
        const nextUser = data.users.find((row) => row.id === userId)!;
        const nextProfile = data.profiles.find((row) => row.userId === userId)!;
        const nextChannel = data.socialChannels.find(
          (row) => row.id === channel.id,
        )!;
        before.push({
          table: 'creator-reference',
          user: {
            id: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
          },
          profile: {
            id: profile.id,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            socialLinksJson: profile.socialLinksJson,
          },
          channel: {
            id: channel.id,
            channelName: channel.channelName,
            channelUrl: channel.channelUrl,
            platformName: channel.platformName,
          },
        });
        if (apply) {
          const changedUser = await tx.user.updateMany({
            where: {
              id: userId,
              fullName: user.fullName,
              avatarUrl: user.avatarUrl,
            },
            data: {
              fullName: nextUser.fullName,
              avatarUrl: nextUser.avatarUrl,
            },
          });
          const changedChannel = await tx.collaboratorSocialChannel.updateMany({
            where: { id: channel.id, channelUrl: channel.channelUrl },
            data: {
              platformName: nextChannel.platformName,
              channelName: nextChannel.channelName,
              channelUrl: nextChannel.channelUrl,
            },
          });
          const changedProfile = await tx.collaboratorProfile.updateMany({
            where: { id: profile.id, updatedAt: profile.updatedAt },
            data: {
              bio: nextProfile.bio,
              avatarUrl: nextProfile.avatarUrl,
              socialLinksJson: JSON.parse(
                JSON.stringify({
                  ...jsonObject(profile.socialLinksJson),
                  ...jsonObject(nextProfile.socialLinksJson),
                }),
              ) as Prisma.InputJsonObject,
            },
          });
          if (
            [changedUser, changedChannel, changedProfile].some(
              (changed) => changed.count !== 1,
            )
          ) {
            throw new Error(
              'A creator changed during enrichment; the transaction was rolled back.',
            );
          }
        }
        result.creators++;
      }
      const bookings = await tx.sponsoredPlacement.findMany({
        where: { status: 'APPROVED' },
        select: { storeId: true, startsAt: true, endsAt: true },
      });
      for (const placement of data.sponsoredPlacements) {
        if (
          await tx.sponsoredPlacement.findUnique({
            where: { id: placement.id! },
          })
        )
          continue;
        const store = await tx.store.findFirst({
          where: {
            id: placement.storeId,
            isActive: true,
            isDeleted: false,
            isVerified: true,
            onboardingStatus: 'VERIFIED',
            ownerId: placement.requestedById,
            owner: { isActive: true },
          },
          select: { id: true },
        });
        const window = {
          storeId: placement.storeId,
          startsAt: new Date(placement.startsAt),
          endsAt: new Date(placement.endsAt),
        };
        if (
          !store ||
          bookings.some(
            (row) =>
              row.storeId === placement.storeId &&
              row.startsAt < window.endsAt &&
              row.endsAt > window.startsAt,
          ) ||
          !hasSponsorshipCapacity(bookings, window)
        ) {
          result.skipped.push(
            `sponsored-store-ineligible-or-booked:${placement.storeId}`,
          );
          continue;
        }
        if (apply) await tx.sponsoredPlacement.create({ data: placement });
        bookings.push(window);
        result.placements++;
      }
      if (apply)
        await tx.auditLog.create({
          data: {
            id: ENRICHMENT_ID,
            userId: ADMIN_ID,
            action: 'CAPSTONE_ADDITIVE_ENRICHMENT',
            details: JSON.parse(
              JSON.stringify({
                result,
                before,
                provenance:
                  'Public name/URL reference only; all identities, metrics, package values and grants remain test fixtures. No LIVE, payment, wallet or ledger mutation.',
              }),
            ) as Prisma.InputJsonValue,
          },
        });
      return result;
    },
    { timeout: 120_000, maxWait: 15_000, isolationLevel: 'RepeatableRead' },
  );
}

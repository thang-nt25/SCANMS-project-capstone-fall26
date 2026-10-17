import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { customerIdentitySchema } from './customer-identity.validation';

const legacySchema = z.record(
  z.string().uuid(),
  customerIdentitySchema.extend({ verifiedAt: z.string().datetime() }),
);

export function parseLegacyIdentities(input: unknown) {
  const parsed = legacySchema.safeParse(input);
  if (!parsed.success) {
    // Do not include names, ID numbers or addresses in errors/logs.
    throw new Error(
      'Legacy identity file is invalid. Review UUID keys, names, 9/12-digit IDs, addresses and ISO timestamps. No data was imported.',
    );
  }
  return Object.entries(parsed.data).map(([userId, record]) => ({
    userId,
    ...record,
    verifiedAt: new Date(record.verifiedAt),
    verificationMethod: 'LEGACY_IMPORT',
  }));
}

export type LegacyIdentity = ReturnType<typeof parseLegacyIdentities>[number];

export async function importLegacyIdentities(
  prisma: PrismaClient,
  rows: LegacyIdentity[],
) {
  if (!rows.length) return { imported: 0, preserved: 0 };
  return prisma.$transaction(async (tx) => {
    const users = await tx.user.count({
      where: {
        id: { in: rows.map((row) => row.userId) },
        isActive: true,
        isDeleted: false,
      },
    });
    if (users !== rows.length) {
      throw new Error(
        'Some legacy records have no active account in the target database. No data was imported.',
      );
    }
    // Existing DB declarations win, including newer declarations made during import.
    const result = await tx.customerIdentity.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return { imported: result.count, preserved: rows.length - result.count };
  });
}

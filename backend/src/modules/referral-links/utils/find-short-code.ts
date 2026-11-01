import { Prisma, PrismaClient } from '@prisma/client';

/** Preserve existing lowercase codes while accepting legacy uppercase imports. */
export async function findShortCode<T extends Prisma.ReferralLinkFindUniqueArgs>(
  links: PrismaClient['referralLink'],
  args: T,
): Promise<Prisma.ReferralLinkGetPayload<T> | null> {
  const exact = await links.findUnique(args);
  if (exact) return exact as Prisma.ReferralLinkGetPayload<T>;
  const code = args.where.shortCode;
  if (!code) return null;
  const { where: _where, ...selection } = args;
  const query: Prisma.ReferralLinkFindManyArgs = {
    ...selection,
    where: { shortCode: { equals: code, mode: 'insensitive' } },
    take: 2,
  };
  const matches = await links.findMany(query);
  // Never guess the beneficiary if legacy codes collide ignoring case.
  return matches.length === 1 ? matches[0] as Prisma.ReferralLinkGetPayload<T> : null;
}

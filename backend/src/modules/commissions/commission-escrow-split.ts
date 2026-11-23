import { Prisma } from '@prisma/client';

/** Live uplift is earned from the purchase snapshot, independent of Deal KPI.
 * Split the already-calculated amount so partial returns/rounding stay intact.
 * regularCommissionRate is the saved rate before Live; never use today's session.
 */
export function splitCommissionEscrow(
  amount: Prisma.Decimal,
  appliedRate: Prisma.Decimal,
  tierRate: Prisma.Decimal,
  regularRate?: Prisma.Decimal | null,
) {
  if (!appliedRate.greaterThan(0))
    return { pending: amount, conditional: new Prisma.Decimal(0) };
  const liveUplift =
    regularRate == null
      ? new Prisma.Decimal(0)
      : Prisma.Decimal.max(0, appliedRate.minus(regularRate));
  const unconditionalRate = Prisma.Decimal.min(
    appliedRate,
    tierRate.plus(liveUplift),
  );
  const pending = amount
    .times(unconditionalRate)
    .dividedBy(appliedRate)
    .toDecimalPlaces(2);
  return { pending, conditional: amount.minus(pending) };
}

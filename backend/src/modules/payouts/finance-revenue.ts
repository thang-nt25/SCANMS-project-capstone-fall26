import { Prisma } from '@prisma/client';

/** Net goods only; allocate a whole-order refund proportionally when its goods/shipping split is unknown. */
export function cleanGoodsRevenue(
  order: {
    subtotalAmount?: Prisma.Decimal.Value;
    finalAmount: Prisma.Decimal.Value;
    couponDiscountAmount?: Prisma.Decimal.Value | null;
    discountAmount?: Prisma.Decimal.Value | null;
    refundedAmount?: Prisma.Decimal.Value | null;
  },
  refundedAmount?: Prisma.Decimal.Value,
) {
  const paid = Prisma.Decimal.max(0, new Prisma.Decimal(order.finalAmount));
  if (paid.isZero()) return new Prisma.Decimal(0);
  const discount = Prisma.Decimal.max(
    0,
    new Prisma.Decimal(order.couponDiscountAmount ?? order.discountAmount ?? 0),
  );
  const goods = Prisma.Decimal.max(
    0,
    new Prisma.Decimal(order.subtotalAmount ?? order.finalAmount).minus(
      discount,
    ),
  );
  const refund = Prisma.Decimal.min(
    paid,
    Prisma.Decimal.max(
      0,
      new Prisma.Decimal(refundedAmount ?? order.refundedAmount ?? 0),
    ),
  );
  return goods
    .mul(paid.minus(refund))
    .div(paid)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

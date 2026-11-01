import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;
type Money = Prisma.Decimal | number | string | null | undefined;
const decimal = (value: Money) => new Prisma.Decimal(value ?? 0);

export async function lockPricingProducts(tx: Tx, ids: string[]) {
  for (const id of [...new Set(ids)].sort())
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${id}::uuid FOR UPDATE`;
}

export function assertFloor(
  unitPrice: Money,
  floorPrice: Money,
  context = 'Sản phẩm',
) {
  if (floorPrice != null && decimal(unitPrice).lessThan(decimal(floorPrice)))
    throw new BadRequestException(
      `${context}: giá sau giảm không được thấp hơn giá sàn đã phê duyệt.`,
    );
}

/** Caller holds the product row lock. All price and status changes commit together. */
export async function reconcileProductPrice(
  tx: Tx,
  productId: string,
  now = new Date(),
) {
  await lockPricingProducts(tx, [productId]);
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    include: { variants: { where: { isActive: true } } },
  });
  const promotions = await tx.productPricePromotion.findMany({
    where: { productId, status: { in: ['APPROVED', 'ACTIVE'] } },
  });
  const active = [] as typeof promotions;
  for (const promotion of promotions) {
    if (
      promotion.endsAt <= now ||
      promotion.budgetUsed.gte(promotion.budgetTotal)
    ) {
      await tx.productPricePromotion.update({
        where: { id: promotion.id },
        data: { status: 'EXPIRED', finishedAt: now },
      });
    } else if (promotion.startsAt <= now) {
      if (promotion.status === 'APPROVED')
        await tx.productPricePromotion.update({
          where: { id: promotion.id },
          data: { status: 'ACTIVE', activatedAt: now },
        });
      active.push(promotion);
    }
  }
  const base = product.listPrice ?? product.price;
  const whole = active.find((promotion) => !promotion.variantId);
  if (!product.variants.length) {
    const price = whole?.proposedPrice ?? base;
    assertFloor(price, product.floorPrice);
    if (!price.equals(product.price))
      await tx.product.update({ where: { id: productId }, data: { price } });
  } else {
    const prices: Prisma.Decimal[] = [];
    for (const variant of product.variants) {
      const offer =
        active.find((promotion) => promotion.variantId === variant.id) ?? whole;
      const price =
        offer?.proposedPrice ?? variant.listPrice ?? variant.price ?? base;
      assertFloor(
        price,
        variant.floorPrice ?? product.floorPrice,
        `SKU ${variant.sku}`,
      );
      prices.push(price);
      if (!variant.price?.equals(price))
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { price },
        });
    }
    const minimum = Prisma.Decimal.min(...prices);
    if (!minimum.equals(product.price))
      await tx.product.update({
        where: { id: productId },
        data: { price: minimum },
      });
  }
}

export async function assertCataloguePriceEdit(
  tx: Tx,
  productId: string,
  proposedPrice: Money,
  variantId?: string,
) {
  await lockPricingProducts(tx, [productId]);
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const variant = variantId
    ? await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } })
    : null;
  if (variant && variant.productId !== productId)
    throw new BadRequestException('Phân loại không thuộc sản phẩm.');
  assertFloor(proposedPrice, variant?.floorPrice ?? product.floorPrice);
  const current = variant?.price ?? product.price;
  if (!decimal(proposedPrice).equals(current)) {
    const reserved = await tx.productPricePromotion.count({
      where: {
        productId,
        status: { in: ['APPROVED', 'ACTIVE'] },
        ...(variantId ? { OR: [{ variantId: null }, { variantId }] } : {}),
      },
    });
    if (reserved)
      throw new ConflictException(
        'Sản phẩm đang có khuyến mãi đã duyệt. Hủy hoặc chờ kết thúc trước khi đổi giá niêm yết.',
      );
  }
}

export interface CheckoutPriceLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  netGoods: number;
}

/** Run inside the order transaction AFTER creating its row, BEFORE commit.
 * Coupon/stacking reductions are included in netGoods; shipping is excluded.
 */
export async function reservePromotionBudget(
  tx: Tx,
  orderId: string,
  lines: CheckoutPriceLine[],
  now = new Date(),
) {
  await lockPricingProducts(
    tx,
    lines.map((line) => line.productId),
  );
  const reservations = new Map<
    string,
    { amount: Prisma.Decimal; quantity: number }
  >();
  for (const line of lines) {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: line.productId },
    });
    const variant = line.variantId
      ? await tx.productVariant.findUniqueOrThrow({
          where: { id: line.variantId },
        })
      : null;
    if (variant && variant.productId !== product.id)
      throw new BadRequestException('Phân loại không thuộc sản phẩm.');
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new BadRequestException('Số lượng không hợp lệ.');
    assertFloor(
      decimal(line.netGoods).div(line.quantity),
      variant?.floorPrice ?? product.floorPrice,
    );
    const currentPrice = variant?.price ?? product.price;
    if (!decimal(line.unitPrice).equals(currentPrice))
      throw new ConflictException(
        'Giá sản phẩm vừa thay đổi. Vui lòng tải lại giỏ hàng.',
      );
    const promotion = await tx.productPricePromotion.findFirst({
      where: {
        productId: line.productId,
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gt: now },
        OR: [{ variantId: variant?.id ?? null }, { variantId: null }],
      },
    });
    const list = variant?.listPrice ?? product.listPrice ?? currentPrice;
    const discount = Prisma.Decimal.max(0, list.minus(currentPrice)).mul(
      line.quantity,
    );
    if (discount.gt(0)) {
      if (!promotion || !promotion.proposedPrice.equals(currentPrice))
        throw new ConflictException(
          'Khuyến mãi chưa sẵn sàng hoặc đã kết thúc. Vui lòng tính lại giá.',
        );
      const previous = reservations.get(promotion.id);
      reservations.set(promotion.id, {
        amount: (previous?.amount ?? decimal(0)).plus(discount),
        quantity: (previous?.quantity ?? 0) + line.quantity,
      });
    }
  }
  for (const [promotionId, reservation] of reservations) {
    const changed =
      await tx.$executeRaw`UPDATE product_price_promotions SET budget_used = budget_used + ${reservation.amount}, updated_at = NOW()
      WHERE id = ${promotionId}::uuid AND status = 'ACTIVE' AND starts_at <= ${now} AND ends_at > ${now}
      AND budget_used + ${reservation.amount} <= budget_total`;
    if (changed !== 1)
      throw new ConflictException(
        'Ngân sách khuyến mãi đã hết. Vui lòng cập nhật giỏ hàng.',
      );
    await tx.productPromotionUsage.create({
      data: {
        promotionId,
        orderId,
        discountAmount: reservation.amount,
        quantity: reservation.quantity,
      },
    });
  }
}

export async function releasePromotionBudget(tx: Tx, orderId: string) {
  const usages = await tx.productPromotionUsage.findMany({
    where: { orderId, releasedAt: null },
  });
  for (const usage of usages) {
    const claimed = await tx.productPromotionUsage.updateMany({
      where: { orderId, promotionId: usage.promotionId, releasedAt: null },
      data: { releasedAt: new Date() },
    });
    if (claimed.count)
      await tx.productPricePromotion.update({
        where: { id: usage.promotionId },
        data: { budgetUsed: { decrement: usage.discountAmount } },
      });
  }
}

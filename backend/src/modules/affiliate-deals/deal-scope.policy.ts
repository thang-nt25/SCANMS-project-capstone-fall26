import { BadRequestException } from '@nestjs/common';
import { ExclusiveDealScope, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../core/database/prisma.service';

export function dealScope(
  productId: string,
  scopeType: ExclusiveDealScope = 'SINGLE_PRODUCT',
  productIds?: string[],
) {
  const ids = [...new Set(productIds || [productId])].sort();
  if (!Object.values(ExclusiveDealScope).includes(scopeType))
    throw new BadRequestException('Phạm vi VIP không hợp lệ.');
  if (
    scopeType === 'SELECTED_PRODUCTS' &&
    (ids.length < 2 || ids.length > 100 || !ids.includes(productId))
  )
    throw new BadRequestException(
      'Chọn 2–100 sản phẩm cùng gian hàng, gồm sản phẩm đại diện.',
    );
  if (
    scopeType === 'SINGLE_PRODUCT' &&
    productIds?.some((id) => id !== productId)
  )
    throw new BadRequestException(
      'Thỏa thuận một sản phẩm không được chứa SKU khác.',
    );
  return {
    scopeType,
    productIds: scopeType === 'SELECTED_PRODUCTS' ? ids : [productId],
    scopeKey:
      scopeType === 'STORE_WIDE'
        ? 'STORE_WIDE'
        : scopeType === 'SINGLE_PRODUCT'
          ? `PRODUCT:${productId}`
          : `SELECTED:${createHash('sha256').update(ids.join(',')).digest('hex')}`,
  };
}

export function sameDealScope(
  scopeKey: string,
  productId: string,
): Prisma.ExclusiveDealProposalWhereInput {
  return scopeKey.startsWith('PRODUCT:')
    ? { OR: [{ scopeKey }, { scopeKey: null, productId }] }
    : { scopeKey };
}

export async function scopedProducts(
  db: Prisma.TransactionClient | PrismaService,
  deal: {
    id: string;
    scopeType?: string;
    storeId: string;
    productId: string;
    scopeProducts?: { productId: string }[];
  },
) {
  const selected =
    deal.scopeProducts ||
    (deal.scopeType === 'SELECTED_PRODUCTS'
      ? await db.exclusiveDealProduct.findMany({
          where: { proposalId: deal.id },
          select: { productId: true },
        })
      : []);
  const ids =
    deal.scopeType === 'SELECTED_PRODUCTS'
      ? selected.map((item) => item.productId)
      : [deal.productId];
  const products = await db.product.findMany({
    where: {
      storeId: deal.storeId,
      ...(deal.scopeType !== 'STORE_WIDE' ? { id: { in: ids } } : {}),
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      isAffiliateEnabled: true,
      moderationStatus: 'APPROVED',
    },
    orderBy: { id: 'asc' },
  });
  if (
    !products.length ||
    (deal.scopeType !== 'STORE_WIDE' && products.length !== ids.length)
  )
    throw new BadRequestException(
      'Sản phẩm trong thỏa thuận không còn đủ điều kiện.',
    );
  return products;
}

/** Resolve a creator/product entitlement across all three scopes. Overlapping
 * contracts choose the most beneficial rate; expiry never rewrites old orders.
 */
export async function activeDealMap(
  db: PrismaService | Prisma.TransactionClient,
  pairs: Array<{ collaboratorId: string; productId: string; storeId?: string }>,
  now = new Date(),
) {
  const unique = [
    ...new Map(
      pairs.map((pair) => [`${pair.collaboratorId}:${pair.productId}`, pair]),
    ).values(),
  ];
  const map = new Map<string, any>();
  if (!unique.length) return map;
  const deals = await db.exclusiveDealProposal.findMany({
    where: {
      collaboratorId: {
        in: [...new Set(unique.map((pair) => pair.collaboratorId))],
      },
      status: 'APPROVED',
      closedAt: null,
      OR: [{ commitmentEndsAt: null }, { commitmentEndsAt: { gt: now } }],
    },
    include: { scopeProducts: { select: { productId: true } } },
    orderBy: [{ approvedCommissionRate: 'desc' }, { createdAt: 'desc' }],
  });
  const stores = new Map<string, string>();
  if (
    deals.some((deal) => deal.scopeType === 'STORE_WIDE') &&
    unique.some((pair) => !pair.storeId)
  ) {
    for (const product of await db.product.findMany({
      where: { id: { in: unique.map((pair) => pair.productId) } },
      select: { id: true, storeId: true },
    }))
      stores.set(product.id, product.storeId);
  }
  for (const pair of unique) {
    const eligible = deals.filter(
      (deal) =>
        deal.collaboratorId === pair.collaboratorId &&
        (!(pair.storeId || stores.get(pair.productId)) ||
          deal.storeId === (pair.storeId || stores.get(pair.productId))) &&
        (deal.scopeType === 'STORE_WIDE'
          ? deal.storeId === (pair.storeId || stores.get(pair.productId))
          : deal.scopeType === 'SELECTED_PRODUCTS'
            ? deal.scopeProducts.some(
                (item) => item.productId === pair.productId,
              )
            : deal.productId === pair.productId),
    );
    const current = eligible.sort(
      (a, b) =>
        Number(b.approvedCommissionRate) - Number(a.approvedCommissionRate) ||
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0),
    )[0];
    if (current)
      map.set(`${pair.collaboratorId}:${pair.productId}`, {
        ...current,
        productId: pair.productId,
      });
  }
  return map;
}

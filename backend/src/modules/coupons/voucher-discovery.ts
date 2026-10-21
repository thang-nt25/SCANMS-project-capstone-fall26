import { Prisma } from '@prisma/client';

export function voucherMatchesProduct(
  coupon: {
    scopeType: string;
    couponProducts: { product: { id: string } }[];
    couponCategories: { categoryName: string }[];
    campaign?: { campaignProducts: { productId: string }[] } | null;
    liveSession?: {
      products: { productId: string; variantId?: string | null }[];
    } | null;
  },
  product: { id: string; categoryName?: string | null },
) {
  let matches = coupon.scopeType === 'STORE_WIDE';
  if (coupon.scopeType === 'PRODUCTS')
    matches = coupon.couponProducts.some(
      (item) => item.product.id === product.id,
    );
  if (coupon.scopeType === 'CATEGORIES')
    matches = coupon.couponCategories.some(
      (item) =>
        item.categoryName.toLowerCase() === product.categoryName?.toLowerCase(),
    );
  if (coupon.scopeType === 'CAMPAIGN')
    matches =
      !!coupon.campaign &&
      (!coupon.campaign.campaignProducts.length ||
        coupon.campaign.campaignProducts.some(
          (item) => item.productId === product.id,
        ));
  return (
    matches &&
    (!coupon.liveSession ||
      coupon.liveSession.products.some((item) => item.productId === product.id))
  );
}

/** Public discovery must obey the same product boundaries as redemption. */
export function voucherProductWhere(coupon: {
  id: string;
  storeId: string;
  scopeType: string;
  campaignId?: string | null;
  campaign?: { campaignProducts: { productId: string }[] } | null;
  couponCategories: { categoryName: string }[];
  liveSessionId?: string | null;
}): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    storeId: coupon.storeId,
    isActive: true,
    isDeleted: false,
    moderationStatus: 'APPROVED',
    store: {
      isActive: true,
      isDeleted: false,
      owner: { isActive: true, isDeleted: false },
    },
  };
  if (coupon.scopeType === 'PRODUCTS')
    where.couponProducts = { some: { couponId: coupon.id } };
  if (coupon.scopeType === 'CATEGORIES') {
    where.OR = coupon.couponCategories.map(({ categoryName }) => ({
      categoryName: { equals: categoryName, mode: 'insensitive' },
    }));
    if (!where.OR.length) where.id = { in: [] };
  }
  if (coupon.scopeType === 'CAMPAIGN') {
    const ids =
      coupon.campaign?.campaignProducts.map((item) => item.productId) || [];
    if (!coupon.campaignId) where.id = { in: [] };
    else if (ids.length) where.id = { in: ids };
  }
  if (coupon.liveSessionId)
    where.liveSessionProducts = { some: { sessionId: coupon.liveSessionId } };
  return where;
}

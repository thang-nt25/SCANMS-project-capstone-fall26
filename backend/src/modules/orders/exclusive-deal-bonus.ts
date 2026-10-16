/** Approved VIP entitlement follows the creator and product, not the link type. */
export function exclusiveDealBonus(
  deal: { productId: string; collaboratorId: string; storeId: string; approvedCommissionRate: unknown } | undefined,
  productId: string,
  collaboratorId: string | null | undefined,
  storeId: string,
): number {
  if (!deal || !collaboratorId || deal.productId !== productId ||
      deal.collaboratorId !== collaboratorId || deal.storeId !== storeId ||
      deal.approvedCommissionRate == null) return 0;
  const rate = Number(deal.approvedCommissionRate);
  return Number.isFinite(rate) ? Math.min(3, Math.max(0, rate - 10)) : 0;
}

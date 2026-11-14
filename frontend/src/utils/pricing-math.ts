export const DEFAULT_MAX_VOUCHER_RATE = 0.1;
export const DEFAULT_MAX_COMMISSION_RATE = 0.25;

/**
 * Computes the minimum selling price required so that after applying up to
 * `maxVoucherRate`, `maxCommissionRate`, and optional `promoReserveRate`,
 * retained net revenue remains >= `floorPrice`.
 */
export function calculateMinSafePrice(
  floorPrice: number,
  maxVoucherRate = DEFAULT_MAX_VOUCHER_RATE,
  maxCommissionRate = DEFAULT_MAX_COMMISSION_RATE,
  promoReserveRate = 0,
): number {
  if (!Number.isFinite(floorPrice) || floorPrice <= 0) return 0;
  const channelFactor =
    (1 - maxVoucherRate) * (1 - maxCommissionRate) * (1 - promoReserveRate);
  if (channelFactor <= 0) return 0;
  return Math.ceil(floorPrice / channelFactor);
}

/**
 * Estimates worst-case retained net revenue per unit when max KOL voucher
 * and max KOL commission apply simultaneously.
 */
export function estimateWorstCaseNet(
  sellingPrice: number,
  maxVoucherRate = DEFAULT_MAX_VOUCHER_RATE,
  maxCommissionRate = DEFAULT_MAX_COMMISSION_RATE,
): number {
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return 0;
  return Math.round(sellingPrice * (1 - maxVoucherRate) * (1 - maxCommissionRate));
}

export function estimateMaxLossPerUnit(
  sellingPrice: number,
  floorPrice: number,
  maxVoucherRate = DEFAULT_MAX_VOUCHER_RATE,
  maxCommissionRate = DEFAULT_MAX_COMMISSION_RATE,
): number {
  if (!Number.isFinite(floorPrice) || floorPrice <= 0) return 0;
  const worstNet = estimateWorstCaseNet(
    sellingPrice,
    maxVoucherRate,
    maxCommissionRate,
  );
  return Math.max(0, Math.round(floorPrice - worstNet));
}

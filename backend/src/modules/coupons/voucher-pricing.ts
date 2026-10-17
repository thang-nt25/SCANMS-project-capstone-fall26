/** Allocate a money discount only across eligible lines, preserving its total. */
export function allocateDiscount(bases: number[], discount: number): number[] {
  const cents = bases.map(value => Math.max(0, Math.round(value * 100)));
  const total = cents.reduce((sum, value) => sum + value, 0);
  if (!total) return bases.map(() => 0);
  const target = Math.min(total, Math.max(0, Math.round(discount * 100)));
  const shares = cents.map(value => Math.floor(target * value / total));
  let remainder = target - shares.reduce((sum, value) => sum + value, 0);
  const ranked = cents.map((value, index) => ({ index, fraction: target * value / total - shares[index] }))
    .filter(row => cents[row.index] > 0).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const row of ranked) {
    if (!remainder) break;
    shares[row.index]++;
    remainder--;
  }
  return shares.map(value => value / 100);
}

export function priceVoucherLines(gross: number[], eligible: boolean[], shopDiscount: number, platformDiscount: number) {
  const shop = allocateDiscount(gross.map((value, index) => eligible[index] ? value : 0), shopDiscount);
  const afterShop = gross.map((value, index) => Math.max(0, value - shop[index]));
  const platform = allocateDiscount(afterShop, platformDiscount);
  return gross.map((value, index) => ({ gross: value, shopDiscount: shop[index], platformDiscount: platform[index],
    netGoods: Math.max(0, Math.round((afterShop[index] - platform[index]) * 100) / 100) }));
}

/** couponDiscountAmount contains goods vouchers only; discountAmount also includes ship. */
export function goodsDiscount(order: { couponDiscountAmount?: unknown; discountAmount?: unknown }): number {
  return Math.max(0, Number(order.couponDiscountAmount ?? order.discountAmount ?? 0));
}

export function liveVoucherActive(session: { status: string; inviteStatus: string; startsAt?: Date; endsAt?: Date } | null | undefined, now = new Date()): boolean {
  return !session || (session.status === 'LIVE' && session.inviteStatus === 'ACCEPTED'
    && (!session.startsAt || session.startsAt <= now) && (!session.endsAt || session.endsAt > now));
}

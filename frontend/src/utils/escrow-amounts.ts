export interface EscrowAmounts {
  commissionAmount?: unknown;
  pendingStandardAmount?: unknown;
  pendingDealAmount?: unknown;
  baseCommissionAmount?: unknown;
  dealBonusAmount?: unknown;
  dealBonusStatus?: string | null;
}

export function escrowNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function escrowAmounts(item: EscrowAmounts) {
  const standard = escrowNumber(item.pendingStandardAmount);
  const deal = escrowNumber(item.pendingDealAmount);
  if (standard !== null && deal !== null) return { standard, deal };
  // Only use an explicitly supplied legacy snapshot, never infer the split from a total alone.
  const base = escrowNumber(item.baseCommissionAmount)
    ?? (item.baseCommissionAmount === null ? escrowNumber(item.commissionAmount) : null);
  const state = item.dealBonusStatus;
  const bonus = state === 'PENDING_KPI' || state === 'QUALIFIED'
    ? escrowNumber(item.dealBonusAmount)
    : ['NONE', 'CLAWED_BACK', 'FORFEITED'].includes(state ?? '') ? 0 : null;
  return { standard: base, deal: bonus };
}

export function escrowMoney(value: unknown): string {
  const amount = escrowNumber(value);
  return amount === null ? 'Chưa có dữ liệu' : `${amount.toLocaleString('vi-VN')} ₫`;
}

export function escrowTotal(items: EscrowAmounts[], part: 'standard' | 'deal'): number | null {
  let total = 0;
  for (const item of items) {
    const amount = escrowAmounts(item)[part];
    if (amount === null) return null;
    total += amount;
  }
  return total;
}

export type SettlementProgress = {
  estimatedTotalBonus?: string | number;
  settlementStatus?: string;
  settlement?: { status: string; bonusAmount: string | number } | null;
};

// The monthly closing deadline is the end of day 5 of the following month (VN).
export function settlementStatus(yearMonth: string, progress: SettlementProgress, now = new Date()) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yearMonth);
  const neutral = (label: string) => ({ label, tone: 'neutral' as const, overdueDays: 0 });
  if (!match || !Number.isFinite(now.getTime())) return neutral('Chưa xác định kỳ');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const vnNow = new Date(now.getTime() + 7 * 3600000);
  const current = vnNow.getUTCFullYear() * 12 + vnNow.getUTCMonth();
  const selected = year * 12 + month - 1;
  if (selected > current) return neutral('Kỳ chưa bắt đầu');
  if (selected === current) return neutral('Kỳ đang diễn ra · Ước tính');
  const status = progress.settlement?.status ?? progress.settlementStatus;
  if (status === 'PAID') return neutral('Đã hoàn tất');
  if (status === 'APPROVED') return neutral('Đã duyệt · Chờ chi trả');
  if (status === 'PENDING') return neutral('Đã chốt · Chờ duyệt');
  const amount = Number(progress.estimatedTotalBonus);
  if (!Number.isFinite(amount) || amount < 0) return neutral('Chưa xác định thưởng');
  if (amount === 0) return neutral('Không phát sinh thưởng');
  const cutoff = Date.UTC(year, month, 6) - 7 * 3600000;
  if (now.getTime() < cutoff) return { label: 'Đến kỳ đối soát', tone: 'due' as const, overdueDays: 0 };
  const overdueDays = Math.floor((now.getTime() - cutoff) / 86400000) + 1;
  return { label: `Quá hạn chốt ${overdueDays} ngày`, tone: 'overdue' as const, overdueDays };
}

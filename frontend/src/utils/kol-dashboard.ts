import type { WalletSummary, LedgerHistory } from '../services/wallet.service';
import type { DashboardOverviewResponse, TimeSeriesPoint } from '../services/analytics.service';
import type { TierStatus } from '../services/tier.service';

const DAY_MS = 86_400_000;
const OFFSET_MS = 7 * 3_600_000;

/** Calendar days in Vietnam, including today up to now, independent of browser TZ. */
export function kolDashboardRange(days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 366 || !Number.isFinite(now.getTime())) throw new Error('Khoảng ngày không hợp lệ.');
  const local = new Date(now.getTime() + OFFSET_MS);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - OFFSET_MS;
  return { range: 'custom', days, startDate: new Date(today - (days - 1) * DAY_MS).toISOString(), endDate: now.toISOString() };
}

interface Sources {
  wallet: () => Promise<WalletSummary>;
  ledger: () => Promise<LedgerHistory>;
  overview: () => Promise<DashboardOverviewResponse>;
  series: () => Promise<TimeSeriesPoint[]>;
  tier: () => Promise<TierStatus>;
}
export async function loadKolDashboard(sources: Sources) {
  const keys = ['wallet', 'ledger', 'overview', 'series', 'tier'] as const;
  // Start each source independently, including synchronous failures from a client wrapper.
  const results = await Promise.allSettled(keys.map(key => Promise.resolve().then<unknown>(() => sources[key]())));
  const labels = { wallet: 'số dư ví', ledger: 'lịch sử hoa hồng', overview: 'số liệu tiếp thị', series: 'biểu đồ', tier: 'cấp bậc' };
  const errors: Partial<Record<keyof Sources, string>> = {};
  const values: Partial<Record<keyof Sources, unknown>> = {};
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled' && result.value != null) values[key] = result.value;
    else errors[key] = `Chưa tải được ${labels[key]}.`;
  });
  return {
    wallet: (values.wallet as WalletSummary | undefined) ?? null,
    ledger: (values.ledger as LedgerHistory | undefined) ?? null,
    overview: (values.overview as DashboardOverviewResponse | undefined) ?? null,
    series: Array.isArray(values.series) ? values.series as TimeSeriesPoint[] : [],
    tier: (values.tier as TierStatus | undefined) ?? null,
    errors,
  };
}

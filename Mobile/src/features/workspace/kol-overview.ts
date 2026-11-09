/** Same Vietnam calendar-day boundaries as the web KOL dashboard. */
export function kolOverviewRange(days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 366 || !Number.isFinite(now.getTime())) throw new Error("Khoảng ngày không hợp lệ.");
  const local = new Date(now.getTime() + 7 * 3600000);
  const today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 7 * 3600000;
  return { range: "custom", days: String(days), startDate: new Date(today - (days - 1) * 86400000).toISOString(), endDate: now.toISOString() };
}

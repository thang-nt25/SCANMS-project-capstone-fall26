import type { MerchantPayout, MerchantPayoutFilter, MerchantPayoutSummary } from '../services/payout.service';

export function payoutPagination(total: number, limit: number, page: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.max(1, Math.min(page, totalPages));
  return { page: current, totalPages, canPrevious: current > 1, canNext: current < totalPages };
}

// Only used by the explicitly enabled DEV fixture workspace. Production uses server aggregates.
export function fixturePayoutView(items: MerchantPayout[], options: { status: string; filter: MerchantPayoutFilter; search: string; page: number; limit: number }, now = new Date()) {
  const shifted = new Date(now.getTime() + 7 * 3600000);
  const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 7 * 3600000;
  const today = (item: MerchantPayout) => item.status === 'APPROVED' && item.processedAt != null && Date.parse(item.processedAt) >= start && Date.parse(item.processedAt) < start + 86400000;
  const tax = (item: MerchantPayout) => item.status === 'APPROVED' && Number(item.taxAmount) > 0;
  const kyc = (item: MerchantPayout) => ['PENDING', 'PROCESSING'].includes(item.status) && item.kycStatus !== 'VERIFIED';
  const sum = (rows: MerchantPayout[], field: 'netAmount' | 'taxAmount') => {
    const minor = rows.reduce((result, row) => {
      const [whole, fraction = ''] = row[field].split('.');
      return result + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    }, 0n);
    return `${minor / 100n}.${String(minor % 100n).padStart(2, '0')}`;
  };
  const pending = items.filter(item => item.status === 'PENDING'), approved = items.filter(today), taxed = items.filter(tax);
  const summary: MerchantPayoutSummary = {
    scope: 'STORE', timeZone: 'Asia/Ho_Chi_Minh', dayStart: new Date(start).toISOString(), dayEndExclusive: new Date(start + 86400000).toISOString(),
    pending: { count: pending.length, netAmount: sum(pending, 'netAmount') },
    approvedToday: { count: approved.length, netAmount: sum(approved, 'netAmount') },
    withheldTax: { count: taxed.length, amount: sum(taxed, 'taxAmount') }, kycPendingCount: items.filter(kyc).length,
  };
  const query = options.search.trim().toLowerCase();
  const matching = items.filter(item => {
    if (options.status && item.status !== options.status) return false;
    if (options.filter === 'PENDING' && item.status !== 'PENDING') return false;
    if (options.filter === 'APPROVED' && !today(item)) return false;
    if (options.filter === 'TAX' && !tax(item)) return false;
    if (options.filter === 'KYC' && !kyc(item)) return false;
    return !query || [item.id, item.collaboratorName, item.collaboratorEmail, item.collaboratorPhone, item.bankName, item.bankAccountName, item.bankAccountNumber, item.bankRefCode]
      .some(value => value?.toLowerCase().includes(query));
  });
  const pagination = payoutPagination(matching.length, options.limit, options.page);
  return { requests: matching.slice((pagination.page - 1) * options.limit, pagination.page * options.limit), total: matching.length,
    page: pagination.page, limit: options.limit, summary };
}

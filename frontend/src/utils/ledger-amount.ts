export interface LedgerAmountPresentation {
  direction: 'credit' | 'debit' | 'neutral' | 'unknown';
  text: string;
}

/** The signed amount is authoritative; a bucket/type never implies cash direction. */
export function ledgerAmountPresentation(value: unknown): LedgerAmountPresentation {
  if (typeof value !== 'string' && typeof value !== 'number') return { direction: 'unknown', text: '—' };
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) return { direction: 'unknown', text: '—' };
  const raw = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) return { direction: 'unknown', text: '—' };
  const whole = BigInt(match[2]);
  const fraction = (match[3] || '').padEnd(2, '0');
  const nonzero = whole !== 0n || fraction !== '00';
  const direction = !nonzero ? 'neutral' : match[1] === '-' ? 'debit' : 'credit';
  const decimal = fraction.replace(/0+$/, '');
  const formatted = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(whole) + (decimal ? `,${decimal}` : '');
  return { direction, text: `${direction === 'credit' ? '+' : direction === 'debit' ? '-' : ''}${formatted} ₫` };
}

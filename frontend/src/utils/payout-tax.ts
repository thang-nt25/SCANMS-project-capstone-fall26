export interface MonthlyTaxContext { policy: string; month: string; monthlyGrossBefore: string }
export const monthlyTaxBrackets = [
  { ceiling: '10000000', rate: '0.05' }, { ceiling: '30000000', rate: '0.10' },
  { ceiling: '60000000', rate: '0.20' }, { ceiling: '100000000', rate: '0.30' },
  { ceiling: null, rate: '0.35' },
];
const minor = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)); };

export function monthlyTaxPreview(gross: bigint, monthlyGross: string, brackets = monthlyTaxBrackets) {
  let remaining = gross, position = minor(monthlyGross), numerator = 0n;
  const rates: number[] = [];
  for (const bracket of brackets) {
    const room = bracket.ceiling === null ? remaining : minor(bracket.ceiling) - position;
    const portion = room <= 0n ? 0n : remaining < room ? remaining : room;
    if (portion > 0n) {
      const percent = Math.round(Number(bracket.rate) * 100);
      numerator += portion * BigInt(percent); rates.push(percent);
      remaining -= portion; position += portion;
    }
    if (remaining === 0n) break;
  }
  return { tax: (numerator + 50n) / 100n, rateLabel: rates.length > 1 ? `${rates[0]}–${rates.at(-1)}%` : `${rates[0] ?? 5}%` };
}
export function payoutTaxLabel(amount: string, context?: MonthlyTaxContext | null) {
  if (context?.policy === 'FLAT_10_PERCENT_V1') return 'Thuế TNCN · 10%';
  return context?.policy === 'MONTHLY_PROGRESSIVE_V1' ? `Thuế TNCN · ${monthlyTaxPreview(minor(amount), context.monthlyGrossBefore).rateLabel}` : 'Thuế TNCN · đã lưu';
}

export function payoutTableTaxLabel(amount: string, taxAmount: string, context?: MonthlyTaxContext | null) {
  if (context?.policy === 'FLAT_10_PERCENT_V1') return 'Thuế 10%';
  if (context?.policy === 'MONTHLY_PROGRESSIVE_V1') return `Thuế ${monthlyTaxPreview(minor(amount), context.monthlyGrossBefore).rateLabel}`;
  const gross = Number(amount), tax = Number(taxAmount);
  if (!Number.isFinite(gross) || gross <= 0 || !Number.isFinite(tax) || tax < 0) return 'Thuế đã lưu';
  return `Thuế ${(tax / gross * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
}

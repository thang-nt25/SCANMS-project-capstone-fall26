import { Prisma } from '@prisma/client';

type Amount = Prisma.Decimal.Value;
type IncomeSource = {
  id: string;
  storeId: string;
  amount: Amount;
  status: string;
};
type ExpenseSource = { id: string; storeId: string | null; amount: Amount };

export function planEarningsReconciliation(input: {
  commissions: IncomeSource[];
  bonuses: IncomeSource[];
  payouts: (ExpenseSource & { status: string })[];
  expenses?: ExpenseSource[];
}) {
  const balances = new Map<string, { available: Prisma.Decimal; pending: Prisma.Decimal }>();
  const seen = new Set<string>();
  const change = (kind: string, source: ExpenseSource, bucket: 'available' | 'pending', debit = false) => {
    const key = `${kind}:${source.id}`;
    if (seen.has(key)) throw new Error(`Duplicate reconciliation source: ${key}`);
    seen.add(key);
    if (!source.storeId) throw new Error(`Missing source store: ${key}`);
    const amount = new Prisma.Decimal(source.amount);
    if (!amount.isFinite() || amount.isNegative() || amount.decimalPlaces() > 2) {
      throw new Error(`Invalid source amount: ${key}`);
    }
    const balance = balances.get(source.storeId) ?? { available: new Prisma.Decimal(0), pending: new Prisma.Decimal(0) };
    balance[bucket] = balance[bucket].plus(debit ? amount.negated() : amount);
    balances.set(source.storeId, balance);
  };

  for (const commission of input.commissions) {
    if (commission.status === 'REVERSED') continue;
    if (!['PENDING', 'APPROVED', 'PAID'].includes(commission.status)) throw new Error(`Unknown commission status: ${commission.id}`);
    change('COMMISSION', commission, commission.status === 'PENDING' ? 'pending' : 'available');
  }
  for (const bonus of input.bonuses) {
    if (bonus.status === 'PAID') change('MONTHLY_BONUS', bonus, 'available');
  }
  for (const payout of input.payouts) {
    if (payout.status === 'REJECTED') continue;
    if (!['PENDING', 'PROCESSING', 'APPROVED'].includes(payout.status)) throw new Error(`Unknown payout status: ${payout.id}`);
    change('PAYOUT_REQUEST', payout, 'available', true);
  }
  for (const expense of input.expenses ?? []) change('EXPENSE', expense, 'available', true);

  const stores = [...balances.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([storeId, balance]) => {
    if (balance.available.isNegative() || balance.pending.isNegative()) {
      throw new Error(`Insufficient evidenced income for store ${storeId}: ${balance.available.toFixed(2)}`);
    }
    return { storeId, availableBalance: balance.available.toFixed(2), pendingBalance: balance.pending.toFixed(2) };
  });
  return {
    availableBalance: stores.reduce((sum, store) => sum.plus(store.availableBalance), new Prisma.Decimal(0)).toFixed(2),
    pendingBalance: stores.reduce((sum, store) => sum.plus(store.pendingBalance), new Prisma.Decimal(0)).toFixed(2),
    stores,
  };
}

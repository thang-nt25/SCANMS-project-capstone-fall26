import { Prisma } from '@prisma/client';

type Balances = { availableBalance: Prisma.Decimal; pendingBalance: Prisma.Decimal };

/** Store buckets are allocations within the global wallet, never extra money. */
export function walletBalanceConsistency(wallet: Balances, stores: Balances[]) {
  const allocatedAvailable = stores.reduce((sum, store) => sum.plus(store.availableBalance), new Prisma.Decimal(0));
  const allocatedPending = stores.reduce((sum, store) => sum.plus(store.pendingBalance), new Prisma.Decimal(0));
  const unallocatedAvailable = wallet.availableBalance.minus(allocatedAvailable);
  const unallocatedPending = wallet.pendingBalance.minus(allocatedPending);
  return {
    requiresReview: unallocatedAvailable.isNegative() || unallocatedPending.isNegative(),
    allocatedAvailableBalance: allocatedAvailable.toFixed(2),
    allocatedPendingBalance: allocatedPending.toFixed(2),
    unallocatedAvailableBalance: unallocatedAvailable.toFixed(2),
    unallocatedPendingBalance: unallocatedPending.toFixed(2),
  };
}

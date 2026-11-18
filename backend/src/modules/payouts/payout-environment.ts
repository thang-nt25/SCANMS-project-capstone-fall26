import type { Prisma } from '@prisma/client';

/** Legacy test payments remain historical data, never actual tax or bank cash. */
export function isTestPayout(row: { transferProvider?: string | null; bankRefCode?: string | null }) {
  return row.transferProvider === 'BIDV_SANDBOX' || !!row.bankRefCode?.startsWith('SBX-');
}
export const actualPayoutWhere: Prisma.PayoutRequestWhereInput = {
  AND: [
    { OR: [{ transferProvider: null }, { transferProvider: { not: 'BIDV_SANDBOX' } }] },
    { OR: [{ bankRefCode: null }, { NOT: { bankRefCode: { startsWith: 'SBX-' } } }] },
  ],
};

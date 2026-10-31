import { Prisma } from '@prisma/client';

export async function postFinance(
  tx: Prisma.TransactionClient,
  referenceId: string,
  event: string,
  debit: string,
  credit: string,
  amount: Prisma.Decimal,
  referenceType?: string,
) {
  if (
    !amount.isFinite() ||
    amount.lt(0) ||
    amount.decimalPlaces() > 2 ||
    debit === credit
  )
    throw new Error('Invalid accounting posting');
  if (amount.isZero()) return;
  await tx.financePosting.create({
    data: {
      eventKey: `${referenceId}:${event}`,
      referenceId,
      referenceType: referenceType ?? (event.startsWith('MONTHLY')
        ? 'MONTHLY_BONUS'
        : 'PAYOUT_REQUEST'),
      debitAccount: debit,
      creditAccount: credit,
      amount,
    },
  });
}

export async function postPayoutCompletion(
  tx: Prisma.TransactionClient,
  payout: { id: string; netAmount: Prisma.Decimal; taxAmount: Prisma.Decimal },
) {
  await postFinance(
    tx,
    payout.id,
    'PAYOUT_BANK',
    'PAYOUT_RESERVED',
    'CORPORATE_BANK',
    payout.netAmount,
  );
  await postFinance(
    tx,
    payout.id,
    'PAYOUT_TAX',
    'PAYOUT_RESERVED',
    'PIT_TAX_PAYABLE',
    payout.taxAmount,
  );
}

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function assertPayoutFunding(
  tx: Prisma.TransactionClient,
  request: {
    id: string;
    collaboratorId: string;
    storeId?: string | null;
    amount: Prisma.Decimal;
    netAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
  },
) {
  if (
    request.amount.lte(0) ||
    request.taxAmount.lt(0) ||
    request.netAmount.lte(0) ||
    !request.netAmount.plus(request.taxAmount).equals(request.amount)
  )
    throw new BadRequestException('Yêu cầu thiếu số tiền đối soát thuế hợp lệ');
  const funded = await tx.financialLedger.aggregate({
    where: {
      referenceId: request.id,
      referenceType: 'PAYOUT_REQUEST',
      transactionType: 'PAYOUT_WITHDRAW',
      balanceBucket: 'AVAILABLE',
      wallet: { collaboratorId: request.collaboratorId },
      ...(request.storeId ? { storeId: request.storeId } : {}),
    },
    _sum: { amount: true },
  });
  if (!funded._sum.amount?.equals(request.amount.negated()))
    throw new BadRequestException(
      'Không có đủ bút toán giữ tiền cho yêu cầu này',
    );
}

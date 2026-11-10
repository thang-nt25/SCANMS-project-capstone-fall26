import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Amount = Prisma.Decimal;
export interface RefundLine {
  orderItemId: string;
  quantity: number;
}
interface Item {
  id: string;
  quantity: number;
  unitPrice: Amount;
  calculatedCommissionAmount: Amount;
  appliedCommissionRate?: Amount;
  referralLink?: { collaboratorId: string } | null;
}
interface Income {
  collaboratorId: string;
  commissionAmount: Amount;
  baseCommissionAmount: Amount | null;
  baseCommissionRate: Amount | null;
  dealBonusAmount: Amount | null;
}

/** Use the remaining line snapshot, never the monetary proportion of unrelated products. */
export function allocateItemClawback(
  items: Item[],
  incomes: Income[],
  lines: RefundLine[],
  refundedQuantities: Map<string, number>,
  fallbackCollaboratorId: string | null,
) {
  const itemAmounts = new Map<string, Amount>();
  const incomeAmounts = new Map<string, { base: Amount; deal: Amount }>();
  for (const line of lines) {
    const item = items.find((row) => row.id === line.orderItemId);
    const available = item
      ? item.quantity - (refundedQuantities.get(item.id) ?? 0)
      : 0;
    if (
      !item ||
      itemAmounts.has(item.id) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > available
    )
      throw new ConflictException(
        'Số lượng hoàn không khớp snapshot dòng hàng',
      );
    const amount = item.calculatedCommissionAmount
      .mul(line.quantity)
      .div(available)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    itemAmounts.set(item.id, amount);
    if (amount.isZero()) continue;
    const collaboratorId = incomes.some(
      (row) => row.collaboratorId === item.referralLink?.collaboratorId,
    )
      ? item.referralLink!.collaboratorId
      : incomes.some((row) => row.collaboratorId === fallbackCollaboratorId)
        ? fallbackCollaboratorId
        : incomes.length === 1
          ? incomes[0].collaboratorId
          : null;
    if (!collaboratorId && incomes.length)
      throw new ConflictException(
        'Thiếu snapshot đối tác của dòng hàng; cần đối soát trước khi hoàn tiền',
      );
    const income = incomes.find((row) => row.collaboratorId === collaboratorId);
    if (!income) continue; // Income has not been posted yet; updating the item snapshot is sufficient.
    const total = incomeAmounts.get(income.collaboratorId) ?? {
      base: new Prisma.Decimal(0),
      deal: new Prisma.Decimal(0),
    };
    const hasDeal = (
      income.dealBonusAmount ?? new Prisma.Decimal(0)
    ).greaterThan(0);
    if (hasDeal && !item.appliedCommissionRate?.greaterThan(0))
      throw new ConflictException(
        'Thiếu tỷ lệ thù lao gốc của dòng hàng; cần đối soát trước khi hoàn tiền',
      );
    // Monetary refunds already scale the remaining line snapshot. Splitting that
    // amount by its original rates also preserves earlier monetary adjustments.
    const base = hasDeal
      ? Prisma.Decimal.min(
          amount,
          amount
            .mul(income.baseCommissionRate ?? 10)
            .div(item.appliedCommissionRate!)
            .toDecimalPlaces(2),
        )
      : amount;
    total.base = total.base.add(base);
    total.deal = total.deal.add(amount.minus(base));
    incomeAmounts.set(income.collaboratorId, total);
  }
  return { itemAmounts, incomeAmounts };
}

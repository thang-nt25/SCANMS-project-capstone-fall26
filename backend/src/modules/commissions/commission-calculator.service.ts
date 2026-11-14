import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface CommissionItemInput {
  id: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  customCommissionRate: Prisma.Decimal | null;
  appliedCommissionRate?: Prisma.Decimal;
  calculatedCommissionAmount?: Prisma.Decimal;
  commissionSnapshotAt?: Date | null;
}

export interface CalculatedCommissionItem {
  orderItemId: string;
  appliedCommissionRate: Prisma.Decimal;
  calculatedCommissionAmount: Prisma.Decimal;
}

export interface CalculatedOrderCommission {
  items: CalculatedCommissionItem[];
  totalCommissionAmount: Prisma.Decimal;
}

@Injectable()
export class CommissionCalculatorService {
  calculateOrderCommission(
    orderItems: CommissionItemInput[],
    _defaultCommissionRate: Prisma.Decimal,
    tierBonusRate: Prisma.Decimal,
    discountAmount = new Prisma.Decimal(0),
  ): CalculatedOrderCommission {
    const fallbackGrossSubtotal = orderItems.reduce(
      (sum, item) => sum.plus(item.unitPrice.times(item.quantity)),
      new Prisma.Decimal(0),
    );
    const clampedDiscount = Prisma.Decimal.min(
      fallbackGrossSubtotal,
      Prisma.Decimal.max(0, discountAmount),
    );
    const items = orderItems.map((item) => {
      // Existing non-zero snapshots are authoritative; zero placeholders from imports are not.
      if (
        item.commissionSnapshotAt ||
        item.appliedCommissionRate?.greaterThan(0) ||
        item.calculatedCommissionAmount?.greaterThan(0)
      ) {
        return {
          orderItemId: item.id,
          appliedCommissionRate:
            item.appliedCommissionRate ?? new Prisma.Decimal(0),
          calculatedCommissionAmount:
            item.calculatedCommissionAmount ?? new Prisma.Decimal(0),
        };
      }
      // New calculations always use the platform base, even for legacy/imported
      // products. The snapshot branch above preserves already agreed orders.
      const baseRate = new Prisma.Decimal(10);
      const tierBonus = Prisma.Decimal.min(3, Prisma.Decimal.max(0, tierBonusRate));
      const appliedCommissionRate = Prisma.Decimal.min(25, baseRate.plus(tierBonus));
      const lineGross = item.unitPrice.times(item.quantity);
      const lineDiscount = fallbackGrossSubtotal.greaterThan(0)
        ? clampedDiscount.times(lineGross).dividedBy(fallbackGrossSubtotal)
        : new Prisma.Decimal(0);
      const itemSubtotal = Prisma.Decimal.max(0, lineGross.minus(lineDiscount));
      const calculatedCommissionAmount = itemSubtotal
        .times(appliedCommissionRate)
        .dividedBy(100)
        .toDecimalPlaces(2);

      return {
        orderItemId: item.id,
        appliedCommissionRate,
        calculatedCommissionAmount,
      };
    });

    return {
      items,
      totalCommissionAmount: items.reduce(
        (total, item) => total.plus(item.calculatedCommissionAmount),
        new Prisma.Decimal(0),
      ),
    };
  }
}

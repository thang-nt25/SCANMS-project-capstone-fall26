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
    defaultCommissionRate: Prisma.Decimal,
    tierBonusRate: Prisma.Decimal,
    discountAmount = new Prisma.Decimal(0),
  ): CalculatedOrderCommission {
    const gross = orderItems.reduce(
      (sum, item) => sum.plus(item.unitPrice.times(item.quantity)),
      new Prisma.Decimal(0),
    );
    const netRatio = gross.isZero()
      ? new Prisma.Decimal(0)
      : Prisma.Decimal.max(0, gross.minus(discountAmount)).div(gross);
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
      const baseRate = item.customCommissionRate ?? defaultCommissionRate;
      const uncappedRate = baseRate.plus(tierBonusRate);
      const appliedCommissionRate = uncappedRate.greaterThan(100)
        ? new Prisma.Decimal(100)
        : uncappedRate;
      const itemSubtotal = item.unitPrice.times(item.quantity);
      const calculatedCommissionAmount = itemSubtotal
        .times(netRatio)
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

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface CommissionItemInput {
  id: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  customCommissionRate: Prisma.Decimal | null;
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
  ): CalculatedOrderCommission {
    const items = orderItems.map((item) => {
      const baseRate = item.customCommissionRate ?? defaultCommissionRate;
      const uncappedRate = baseRate.plus(tierBonusRate);
      const appliedCommissionRate = uncappedRate.greaterThan(100)
        ? new Prisma.Decimal(100)
        : uncappedRate;
      const itemSubtotal = item.unitPrice.times(item.quantity);
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

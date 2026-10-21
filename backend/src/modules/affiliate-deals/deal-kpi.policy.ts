import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const DEAL_SETTLEMENT_DAYS = 14;
export function validateDealKpi(
  targetOrders?: number,
  commitmentDays?: number,
) {
  if (
    !Number.isInteger(targetOrders) ||
    targetOrders! < 1 ||
    targetOrders! > 1000000
  )
    throw new BadRequestException(
      'Cần nhập mục tiêu từ 1 đến 1.000.000 đơn nguyên.',
    );
  if (
    !Number.isInteger(commitmentDays) ||
    commitmentDays! < 1 ||
    commitmentDays! > 366
  )
    throw new BadRequestException('Kỳ cam kết phải từ 1 đến 366 ngày.');
  return { targetOrders: targetOrders!, commitmentDays: commitmentDays! };
}

export function dealWindow(days: number, now = new Date()) {
  const commitmentEndsAt = new Date(now.getTime() + days * 86400000);
  return {
    commitmentStartedAt: now,
    commitmentEndsAt,
    settlementEndsAt: new Date(
      commitmentEndsAt.getTime() + DEAL_SETTLEMENT_DAYS * 86400000,
    ),
  };
}

export interface KpiDeal {
  productId: string;
  storeId: string;
  collaboratorId: string;
  status: string;
  targetOrders?: number | null;
  commitmentStartedAt?: Date | null;
  commitmentEndsAt?: Date | null;
  settlementEndsAt?: Date | null;
  closedAt?: Date | null;
}

export function dealOrderWhere(deal: KpiDeal): Prisma.OrderWhereInput {
  return {
    storeId: deal.storeId,
    createdAt: { gte: deal.commitmentStartedAt!, lt: deal.commitmentEndsAt! },
    orderItems: {
      some: {
        productId: deal.productId,
        OR: [
          { referralLink: { collaboratorId: deal.collaboratorId } },
          // Legacy orders have order-level attribution, but never override another item's link.
          {
            referralLinkId: null,
            order: { attributedCollaboratorId: deal.collaboratorId },
          },
        ],
      },
    },
  };
}

export function evaluateDealKpi(
  deal: KpiDeal,
  completedOrders: number,
  pendingOrders: number,
  now = new Date(),
) {
  const configured = !!(
    deal.targetOrders &&
    deal.commitmentStartedAt &&
    deal.commitmentEndsAt &&
    deal.settlementEndsAt
  );
  const state = deal.closedAt
    ? 'CLOSED'
    : deal.status === 'PENDING'
      ? 'PENDING'
      : deal.status === 'REJECTED'
        ? 'REJECTED'
        : !configured
          ? 'LEGACY'
          : now < deal.commitmentEndsAt!
            ? 'ACTIVE'
            : now < deal.settlementEndsAt!
              ? 'SETTLING'
              : completedOrders >= deal.targetOrders!
                ? 'ACHIEVED'
                : 'REVIEW_REQUIRED';
  return {
    state,
    targetOrders: deal.targetOrders || null,
    completedOrders,
    pendingOrders,
    missingOrders: Math.max(0, (deal.targetOrders || 0) - completedOrders),
    percent: deal.targetOrders
      ? Math.min(100, Math.floor((completedOrders / deal.targetOrders) * 100))
      : 0,
    startsAt: deal.commitmentStartedAt || null,
    endsAt: deal.commitmentEndsAt || null,
    settlementEndsAt: deal.settlementEndsAt || null,
    serverTime: now,
    canTerminate: state === 'REVIEW_REQUIRED',
  };
}

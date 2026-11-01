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
  id?: string;
  scopeType?: string;
  scopeProducts?: { productId: string }[];
  targetRevenue?: Prisma.Decimal | number | null;
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
        ...(deal.scopeType === 'STORE_WIDE'
          ? {}
          : {
              productId:
                deal.scopeType === 'SELECTED_PRODUCTS'
                  ? {
                      in: (deal.scopeProducts || []).map(
                        (item) => item.productId,
                      ),
                    }
                  : deal.productId,
            }),
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

export function validateRevenueKpi(
  targetRevenue: number,
  commitmentDays?: number,
) {
  if (
    !Number.isFinite(targetRevenue) ||
    targetRevenue < 1 ||
    targetRevenue > 1e12
  )
    throw new BadRequestException(
      'Mục tiêu doanh thu phải từ 1 đến 1.000 tỷ đồng.',
    );
  validateDealKpi(1, commitmentDays);
  return { targetRevenue, commitmentDays: commitmentDays! };
}

/** Revenue is calculated from the checkout snapshot, never shipping or another
 * creator's items. Old orders without snapshots allocate goods discount pro rata. */
export function eligibleRevenue(order: any, deal: KpiDeal): number {
  const items = order.orderItems || [];
  const gross = items.reduce(
    (sum: number, item: any) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
  const snapshots = order.rawPayload?.goodsPricing;
  return items.reduce((sum: number, item: any) => {
    const inScope =
      deal.scopeType === 'STORE_WIDE' ||
      (deal.scopeType === 'SELECTED_PRODUCTS'
        ? deal.scopeProducts?.some(
            (entry) => entry.productId === item.productId,
          )
        : item.productId === deal.productId);
    const attributed = item.referralLinkId
      ? item.referralLink?.collaboratorId === deal.collaboratorId
      : order.attributedCollaboratorId === deal.collaboratorId;
    if (!inScope || !attributed) return sum;
    const snapshot = Array.isArray(snapshots)
      ? snapshots.find(
          (entry: any) =>
            entry.productId === item.productId &&
            (entry.variantId || null) === (item.variantId || null),
        )
      : null;
    const amount =
      snapshot?.netGoods != null
        ? Number(snapshot.netGoods)
        : Number(item.unitPrice) *
          item.quantity *
          (gross
            ? Math.max(
                0,
                gross -
                  Number(
                    order.couponDiscountAmount ?? order.discountAmount ?? 0,
                  ),
              ) / gross
            : 0);
    return sum + Math.max(0, amount);
  }, 0);
}

export function evaluateRevenueKpi(
  deal: KpiDeal,
  validRevenue: number,
  pendingRevenue: number,
  completedOrders = 0,
  pendingOrders = 0,
  now = new Date(),
) {
  const target = Number(deal.targetRevenue || 0);
  const legacy = evaluateDealKpi(
    { ...deal, targetOrders: 1 },
    validRevenue >= target ? 1 : 0,
    pendingOrders,
    now,
  );
  return {
    ...legacy,
    targetOrders: deal.targetOrders || null,
    completedOrders,
    pendingOrders,
    targetRevenue: target,
    validRevenue: Math.round(validRevenue * 100) / 100,
    pendingRevenue: Math.round(pendingRevenue * 100) / 100,
    missingRevenue: Math.max(0, target - validRevenue),
    percent: target
      ? Math.min(100, Math.floor((validRevenue / target) * 100))
      : 0,
    kpiType: 'REVENUE',
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
    : deal.status === 'PENDING_ADMIN_APPROVAL'
      ? 'PENDING_ADMIN_APPROVAL'
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

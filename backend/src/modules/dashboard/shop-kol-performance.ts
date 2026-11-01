import { BadRequestException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { QueryReferralOrdersDto } from './dto/dashboard-analytics.dto';
import { VIETNAM_OFFSET_MS, vietnamDayStart } from './analytics-time';

/** Periods use Vietnam calendar days; summary covers ALL pages, not only 20 rows. */
export function shopKolOrderFilter(
  storeId: string | null,
  kolId: string,
  query: QueryReferralOrdersDto,
  now = new Date(),
): Prisma.OrderWhereInput {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      kolId,
    )
  )
    throw new BadRequestException('Mã KOC không hợp lệ.');
  if (
    query.status &&
    query.status !== 'ALL' &&
    !Object.values(OrderStatus).includes(query.status as OrderStatus)
  )
    throw new BadRequestException('Trạng thái đơn hàng không hợp lệ.');
  const period = query.period || 'all';
  if (!['all', '7d', '30d', 'month'].includes(period))
    throw new BadRequestException('Khoảng thời gian không hợp lệ.');
  let start: Date | undefined;
  if (period === '7d' || period === '30d')
    start = new Date(
      vietnamDayStart(now).getTime() - (period === '7d' ? 6 : 29) * 86400000,
    );
  if (period === 'month') {
    const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
    start = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) -
        VIETNAM_OFFSET_MS,
    );
  }
  return {
    attributedCollaboratorId: kolId,
    ...(storeId ? { storeId } : {}),
    store: { isDeleted: false, deletedAt: null },
    ...(query.status && query.status !== 'ALL'
      ? { status: query.status as OrderStatus }
      : {}),
    createdAt: { ...(start ? { gte: start } : {}), lte: now },
  };
}

export async function readShopKolPerformance(
  prisma: PrismaService,
  storeId: string | null,
  kolId: string,
  query: QueryReferralOrdersDto,
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const where = shopKolOrderFilter(storeId, kolId, query);
  const completedWhere: Prisma.OrderWhereInput = {
    AND: [
      where,
      { status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } },
    ],
  };
  // One read snapshot keeps the list and aggregates consistent during updates.
  const [total, orders, successful, commissions] = await prisma.$transaction(
    [
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          externalOrderSn: true,
          status: true,
          finalAmount: true,
          createdAt: true,
          customerName: true,
          orderItems: {
            select: {
              quantity: true,
              unitPrice: true,
              appliedCommissionRate: true,
              calculatedCommissionAmount: true,
              product: { select: { title: true } },
            },
          },
          commissions: {
            where: {
              collaboratorId: kolId,
              status: { in: ['PENDING', 'APPROVED', 'PAID'] },
            },
            select: { commissionAmount: true },
          },
        },
      }),
      prisma.order.aggregate({
        where: completedWhere,
        _sum: { finalAmount: true, refundedAmount: true },
        _count: { _all: true },
      }),
      prisma.commission.aggregate({
        where: {
          collaboratorId: kolId,
          status: { in: ['PENDING', 'APPROVED', 'PAID'] },
          order: completedWhere,
        },
        _sum: { commissionAmount: true },
      }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return {
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalOrders: successful._count._all,
      totalRevenue: Math.max(
        0,
        Number(successful._sum.finalAmount ?? 0) -
          Number(successful._sum.refundedAmount ?? 0),
      ),
      // An accrued commission is not proof that a payout has been made.
      accruedCommission: Number(commissions._sum.commissionAmount ?? 0),
      period: query.period || 'all',
    },
    items: orders.map((order) => {
      const amount = order.commissions.reduce(
        (sum, commission) => sum + Number(commission.commissionAmount),
        0,
      );
      const first = order.orderItems[0];
      const title = first?.product.title || 'Sản phẩm tiếp thị';
      return {
        id: order.id,
        orderCode: order.externalOrderSn,
        createdAt: order.createdAt,
        customerName: order.customerName,
        productTitle:
          order.orderItems.length > 1
            ? `${title} (+${order.orderItems.length - 1})`
            : title,
        finalAmount: Number(order.finalAmount),
        orderTotal: Number(order.finalAmount),
        commissionAmount: amount,
        commissionEarned: amount,
        commissionRate: first ? Number(first.appliedCommissionRate) : null,
        status: order.status,
      };
    }),
  };
}

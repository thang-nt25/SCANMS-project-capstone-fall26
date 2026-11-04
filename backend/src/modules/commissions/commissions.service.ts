import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import {
  CommissionStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { CommissionCalculatorService } from './commission-calculator.service';
import { tierBonusByName } from './commission-policy';
import { isSelfReferral, requiresReferralReview } from './self-referral';
import { managedStoreWhere } from '../../common/store-access';
import {
  COMMISSION_ELIGIBLE_ORDER_STATUSES,
  COMMISSION_HOLD_DAYS,
  COMMISSION_PROCESSING_BATCH_SIZE,
  COMMISSION_REVERSAL_ORDER_STATUSES,
} from './commission.constants';

export interface CommissionReconciliationSummary {
  created: number;
  approved: number;
  reversed: number;
  failed: number;
}

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: CommissionCalculatorService,
    private readonly walletsService: WalletsService,
  ) {}

  async reconcileCommissions(
    now = new Date(),
  ): Promise<CommissionReconciliationSummary> {
    const summary: CommissionReconciliationSummary = {
      created: 0,
      approved: 0,
      reversed: 0,
      failed: 0,
    };

    const reversalCandidates = await this.prisma.commission.findMany({
      where: {
        status: { in: [CommissionStatus.PENDING, CommissionStatus.APPROVED] },
        order: { status: { in: COMMISSION_REVERSAL_ORDER_STATUSES } },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: COMMISSION_PROCESSING_BATCH_SIZE,
    });
    await this.processCandidates(
      reversalCandidates,
      (id) => this.reverseCommission(id, now),
      () => summary.reversed++,
      summary,
      'reverse',
    );

    let cursor: string | undefined;
    // Scan past rejected/self-referral orders without modifying receipt dates.
    // A keyset cursor remains stable while successful rows leave the queue.
    while (summary.created < COMMISSION_PROCESSING_BATCH_SIZE) {
      const eligibleOrders = await this.prisma.order.findMany({
        where: {
          status: { in: COMMISSION_ELIGIBLE_ORDER_STATUSES },
          attributedCollaboratorId: { not: null },
          attributedCollaborator: {
            is: {
              role: UserRole.COLLABORATOR,
              isActive: true,
              isDeleted: false,
            },
          },
          commissions: { none: {} },
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: COMMISSION_PROCESSING_BATCH_SIZE,
      });
      await this.processCandidates(
        eligibleOrders,
        (id) => this.createPendingCommission(id, now),
        () => summary.created++,
        summary,
        'create',
      );
      if (eligibleOrders.length < COMMISSION_PROCESSING_BATCH_SIZE) break;
      const nextCursor = eligibleOrders[eligibleOrders.length - 1].id;
      if (nextCursor === cursor) break;
      cursor = nextCursor;
    }

    const matureCommissions = await this.prisma.commission.findMany({
      where: {
        status: CommissionStatus.PENDING,
        availableAt: { lte: now },
        order: {
          status: { in: COMMISSION_ELIGIBLE_ORDER_STATUSES },
          OR: [
            { returnRequest: { is: null } },
            {
              returnRequest: { is: { status: { in: ['CLOSED', 'EXPIRED'] } } },
            },
            {
              returnRequest: {
                is: { status: 'COMPLETED', resolution: 'EXCHANGE' },
              },
            },
          ],
        },
      },
      select: { id: true },
      orderBy: { availableAt: 'asc' },
      take: COMMISSION_PROCESSING_BATCH_SIZE,
    });
    await this.processCandidates(
      matureCommissions,
      (id) => this.approveMatureCommission(id, now),
      () => summary.approved++,
      summary,
      'approve',
    );

    return summary;
  }

  async createPendingCommission(orderId: string, now = new Date()) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOrder(tx, orderId);
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            store: { select: { defaultCommissionRate: true } },
            attributedCollaborator: {
              select: {
                id: true,
                role: true,
                email: true,
                phoneNumber: true,
                isActive: true,
                isDeleted: true,
                collaboratorProfile: {
                  select: {
                    tier: {
                      select: { name: true, extraBonusPercentage: true },
                    },
                  },
                },
              },
            },
            orderItems: {
              include: {
                product: { select: { customCommissionRate: true } },
              },
            },
            commissions: { select: { id: true } },
          },
        });

        if (!this.isOrderEligible(order) || order.commissions.length > 0) {
          return false;
        }

        const collaborator = order.attributedCollaborator;
        if (isSelfReferral(order, collaborator)) return false;
        if (
          !collaborator ||
          collaborator.role !== UserRole.COLLABORATOR ||
          !collaborator.isActive ||
          collaborator.isDeleted
        ) {
          return false;
        }

        const tier = collaborator.collaboratorProfile?.tier;
        const tierBonusRate = new Prisma.Decimal(
          tier?.name
            ? tierBonusByName(tier.name)
            : Math.min(3, Math.max(0, Number(tier?.extraBonusPercentage || 0))),
        );
        const calculation = this.calculator.calculateOrderCommission(
          order.orderItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customCommissionRate: item.product.customCommissionRate,
            appliedCommissionRate: item.appliedCommissionRate,
            calculatedCommissionAmount: item.calculatedCommissionAmount,
            commissionSnapshotAt: item.commissionSnapshotAt,
          })),
          order.store.defaultCommissionRate,
          tierBonusRate,
          new Prisma.Decimal(
            order.couponDiscountAmount ?? order.discountAmount ?? 0,
          ).plus(order.refundedAmount ?? 0),
        );

        for (const item of calculation.items) {
          if (
            order.orderItems.find(
              (original) => original.id === item.orderItemId,
            )?.commissionSnapshotAt
          )
            continue;
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: {
              appliedCommissionRate: item.appliedCommissionRate,
              calculatedCommissionAmount: item.calculatedCommissionAmount,
              commissionSnapshotAt: now,
            },
          });
        }

        // Receipt/completion is stable; metadata edits must not restart escrow.
        const receiptAt =
          order.deliveredAt ?? order.completedAt ?? order.updatedAt;
        const eligibleAt =
          receiptAt.getTime() <= now.getTime() ? receiptAt : now;
        const availableAt = new Date(
          eligibleAt.getTime() + COMMISSION_HOLD_DAYS * 86400000,
        );
        const hasPayableCommission =
          calculation.totalCommissionAmount.greaterThan(0);
        const commission = await tx.commission.create({
          data: {
            orderId: order.id,
            collaboratorId: collaborator.id,
            commissionAmount: calculation.totalCommissionAmount,
            storeWalletTracked: true,
            status: hasPayableCommission
              ? CommissionStatus.PENDING
              : CommissionStatus.APPROVED,
            eligibleAt,
            availableAt,
            approvedAt: hasPayableCommission ? null : now,
          },
        });
        if (hasPayableCommission) {
          await this.walletsService.creditPendingBalance(
            tx,
            collaborator.id,
            calculation.totalCommissionAmount,
            { id: commission.id, type: 'COMMISSION' },
            order.storeId,
          );
        }

        return true;
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }

  async approveMatureCommission(commissionId: string, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const initialCommission = await tx.commission.findUnique({
        where: { id: commissionId },
        select: { orderId: true },
      });
      if (!initialCommission) {
        return false;
      }

      await this.lockOrder(tx, initialCommission.orderId);
      await this.lockCommission(tx, commissionId);
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
        include: {
          order: {
            select: {
              status: true,
              rawPayload: true,
              storeId: true,
              returnRequest: {
                select: {
                  status: true,
                  resolution: true,
                  dispute: { select: { status: true } },
                },
              },
            },
          },
        },
      });
      if (
        !commission ||
        commission.status !== CommissionStatus.PENDING ||
        commission.availableAt.getTime() > now.getTime() ||
        !COMMISSION_ELIGIBLE_ORDER_STATUSES.includes(commission.order.status) ||
        requiresReferralReview(commission.order)
      ) {
        return false;
      }

      const claim = commission.order.returnRequest;
      if (
        claim &&
        (!(
          ['CLOSED', 'EXPIRED'].includes(claim.status) ||
          (claim.status === 'COMPLETED' && claim.resolution === 'EXCHANGE')
        ) ||
          claim.dispute?.status === 'OPEN')
      )
        return false;

      if (commission.commissionAmount.greaterThan(0)) {
        await this.walletsService.releasePendingBalance(
          tx,
          commission.collaboratorId,
          commission.commissionAmount,
          { id: commission.id, type: 'COMMISSION' },
          commission.storeWalletTracked ? commission.order.storeId : undefined,
        );
      }
      await tx.commission.update({
        where: { id: commission.id },
        data: {
          status: CommissionStatus.APPROVED,
          approvedAt: now,
        },
      });

      return true;
    });
  }

  async reverseCommission(commissionId: string, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const initialCommission = await tx.commission.findUnique({
        where: { id: commissionId },
        select: { orderId: true },
      });
      if (!initialCommission) {
        return false;
      }

      await this.lockOrder(tx, initialCommission.orderId);
      await this.lockCommission(tx, commissionId);
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
        include: { order: { select: { status: true, storeId: true } } },
      });
      if (
        !commission ||
        commission.status === CommissionStatus.REVERSED ||
        !COMMISSION_REVERSAL_ORDER_STATUSES.includes(commission.order.status)
      ) {
        return false;
      }

      if (commission.commissionAmount.greaterThan(0)) {
        if (commission.status === CommissionStatus.PENDING) {
          await this.walletsService.reversePendingBalance(
            tx,
            commission.collaboratorId,
            commission.commissionAmount,
            { id: commission.id, type: 'COMMISSION' },
            commission.storeWalletTracked
              ? commission.order.storeId
              : undefined,
          );
        } else {
          await this.walletsService.reverseAvailableBalance(
            tx,
            commission.collaboratorId,
            commission.commissionAmount,
            { id: commission.id, type: 'COMMISSION' },
            commission.storeWalletTracked
              ? commission.order.storeId
              : undefined,
          );
        }
      }

      await tx.commission.update({
        where: { id: commission.id },
        data: {
          status: CommissionStatus.REVERSED,
          reversedAt: now,
        },
      });

      return true;
    });
  }

  /**
   * Master Plan 4.3: seven calendar days, with claims/review holding release.
   */
  getEscrowPolicyInfo(sampleDate?: string) {
    const targetDate = sampleDate ? new Date(sampleDate) : new Date();
    if (!Number.isFinite(targetDate.getTime())) throw new BadRequestException('Ngày kiểm tra Escrow không hợp lệ');
    const calculation = {
      startDate: targetDate,
      availableAt: new Date(
        targetDate.getTime() + COMMISSION_HOLD_DAYS * 86400000,
      ),
      baseHoldDays: COMMISSION_HOLD_DAYS,
      holidayDaysAdded: 0,
      totalHoldDays: COMMISSION_HOLD_DAYS,
      holidaysEncountered: [],
      isCurrentlyHoliday: false,
    };
    return {
      policy: {
        baseHoldDays: COMMISSION_HOLD_DAYS,
        description:
          'Hoa hồng được bảo chứng 7 ngày lịch kể từ khi giao thành công; không cộng ngày lễ. Đơn có đổi trả, tranh chấp hoặc cần thẩm định tiếp tục được tạm giữ.',
        currentStatus:
          'Giải tỏa khi đủ thời gian và không còn điều kiện tạm giữ',
      },
      calculation,
    };
  }

  async reviewReferral(
    orderId: string,
    reviewer: Pick<AuthenticatedUser, 'id' | 'role'>,
    outcome: string,
    reason: string,
  ) {
    if (
      ![UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN].includes(
        reviewer.role as any,
      )
    )
      throw new ForbiddenException();
    if (
      !['CLEARED', 'SELF_REFERRAL'].includes(outcome) ||
      typeof reason !== 'string' ||
      reason.trim().length < 10 ||
      reason.length > 1000
    )
      throw new BadRequestException(
        'Cần kết luận và lý do thẩm định từ 10 đến 1000 ký tự.',
      );
    return this.prisma.$transaction(async (tx) => {
      await this.lockOrder(tx, orderId);
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { commissions: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (!requiresReferralReview(order))
        throw new ConflictException('Đơn không còn chờ thẩm định tự mua');
      if (order.commissions.some((c) => c.status === CommissionStatus.APPROVED))
        throw new ConflictException(
          'Hoa hồng đã giải tỏa; cần xử lý ngoại lệ tài chính trước khi kết luận.',
        );
      if (outcome === 'SELF_REFERRAL') {
        const raw = (order.rawPayload ?? {}) as Prisma.JsonObject;
        const reservations = raw.campaignBonusReservations;
        if (
          reservations &&
          typeof reservations === 'object' &&
          !Array.isArray(reservations)
        ) {
          for (const [campaignId, value] of Object.entries(reservations)) {
            const amount = Number(value);
            if (
              /^[0-9a-f-]{36}$/i.test(campaignId) &&
              Number.isFinite(amount) &&
              amount > 0
            ) {
              await tx.$executeRaw`UPDATE campaigns SET bonus_budget_used = GREATEST(0, bonus_budget_used - ${amount}) WHERE id = ${campaignId}::uuid`;
            }
          }
        }
        for (const commission of order.commissions) {
          if (commission.status !== CommissionStatus.PENDING) continue;
          if (commission.commissionAmount.gt(0))
            await this.walletsService.reversePendingBalance(
              tx,
              commission.collaboratorId,
              commission.commissionAmount,
              { id: commission.id, type: 'COMMISSION' },
              commission.storeWalletTracked ? order.storeId : undefined,
            );
          await tx.commission.update({
            where: { id: commission.id },
            data: {
              status: CommissionStatus.REVERSED,
              commissionAmount: new Prisma.Decimal(0),
              reversedAt: new Date(),
            },
          });
        }
        await tx.orderItem.updateMany({
          where: { orderId },
          data: {
            appliedCommissionRate: 0,
            calculatedCommissionAmount: 0,
            commissionSnapshotAt: new Date(),
          },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          rawPayload: {
            ...((order.rawPayload as Prisma.JsonObject) ?? {}),
            selfReferralReviewRequired: false,
            selfReferralDetected: outcome === 'SELF_REFERRAL',
            ...(outcome === 'SELF_REFERRAL'
              ? { campaignBonusReservations: {} }
              : {}),
            selfReferralReview: {
              outcome,
              reason: reason.trim(),
              reviewerId: reviewer.id,
              reviewedAt: new Date().toISOString(),
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewer.id,
          action: 'REVIEW_SELF_REFERRAL',
          details: { orderId, outcome, reason: reason.trim() },
        },
      });
      return { orderId, outcome };
    });
  }

  /**
   * Lấy chi tiết đếm ngược và trạng thái Escrow của một đơn hàng cụ thể
   */
  async getOrderEscrowDetails(
    orderId: string,
    viewer: Pick<AuthenticatedUser, 'id' | 'role'>,
  ) {
    if (!viewer?.id)
      throw new ForbiddenException('Không có quyền xem hoa hồng');
    const where: Prisma.CommissionWhereInput = { orderId };
    if (viewer.role === UserRole.COLLABORATOR) {
      where.collaboratorId = viewer.id;
    } else if (viewer.role === UserRole.SHOP_MANAGER) {
      where.order = { store: managedStoreWhere(viewer.id) };
    } else if (
      viewer.role !== UserRole.SYSTEM_ADMIN &&
      viewer.role !== UserRole.SYSTEM_MANAGER
    ) {
      throw new ForbiddenException('Không có quyền xem hoa hồng');
    }
    const commission = await this.prisma.commission.findFirst({
      where,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            updatedAt: true,
            rawPayload: true,
            externalOrderSn: true,
            returnRequest: {
              select: {
                status: true,
                resolution: true,
                dispute: { select: { status: true } },
              },
            },
            store: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!commission) {
      return null;
    }

    const now = new Date();
    const isMatured = commission.availableAt.getTime() <= now.getTime();
    const remainingMs = Math.max(
      0,
      commission.availableAt.getTime() - now.getTime(),
    );
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);
    const remainingHoursInDay = remainingHours % 24;

    const claim = commission.order.returnRequest;
    const isFrozenDueToDispute =
      requiresReferralReview(commission.order) ||
      [OrderStatus.RETURN_REQUESTED, OrderStatus.DISPUTED].includes(
        commission.order.status as any,
      ) ||
      Boolean(
        claim &&
        (!(
          ['CLOSED', 'EXPIRED'].includes(claim.status) ||
          (claim.status === 'COMPLETED' && claim.resolution === 'EXCHANGE')
        ) ||
          claim.dispute?.status === 'OPEN'),
      );
    const isReversed = commission.status === CommissionStatus.REVERSED;
    const isReleased = commission.status === CommissionStatus.APPROVED;
    const canRelease =
      !isFrozenDueToDispute &&
      !isReversed &&
      !isReleased &&
      isMatured &&
      COMMISSION_ELIGIBLE_ORDER_STATUSES.includes(commission.order.status);

    return {
      commissionId: commission.id,
      orderId: commission.orderId,
      orderSn: commission.order.externalOrderSn,
      storeName: commission.order.store.name,
      commissionAmount: Number(commission.commissionAmount),
      status: commission.status,
      eligibleAt: commission.eligibleAt,
      availableAt: commission.availableAt,
      isMatured,
      isFrozen: isFrozenDueToDispute,
      canRelease,
      releaseState: isReversed
        ? 'REVERSED'
        : isReleased
          ? 'RELEASED'
          : isFrozenDueToDispute
            ? 'FROZEN'
            : canRelease
              ? 'READY'
              : 'HOLDING',
      isHolidayPaused: false,
      currentHolidayName: undefined,
      remainingTime: {
        totalHours: remainingHours,
        days: remainingDays,
        hours: remainingHoursInDay,
        formatted: isReversed
          ? 'Đã thu hồi hoa hồng'
          : isReleased
            ? 'Đã giải tỏa'
            : isFrozenDueToDispute
              ? 'Tạm giữ do đổi trả / khiếu nại'
              : canRelease
                ? 'Đã đáo hạn (Sẵn sàng giải ngân)'
                : `${remainingDays} ngày ${remainingHoursInDay} giờ`,
      },
    };
  }

  private isOrderEligible(
    order: {
      status: OrderStatus;
      attributedCollaboratorId: string | null;
    } | null,
  ): order is NonNullable<typeof order> {
    return Boolean(
      order?.attributedCollaboratorId &&
      COMMISSION_ELIGIBLE_ORDER_STATUSES.includes(order.status),
    );
  }

  private async processCandidates(
    candidates: Array<{ id: string }>,
    processor: (id: string) => Promise<boolean>,
    onProcessed: () => void,
    summary: CommissionReconciliationSummary,
    action: string,
  ): Promise<void> {
    for (const candidate of candidates) {
      try {
        if (await processor(candidate.id)) {
          onProcessed();
        }
      } catch (error: unknown) {
        summary.failed++;
        this.logger.error(
          `Failed to ${action} commission candidate id=${candidate.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }
  }

  private lockOrder(tx: Prisma.TransactionClient, orderId: string) {
    return tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`,
    );
  }

  private lockCommission(tx: Prisma.TransactionClient, commissionId: string) {
    return tx.$queryRaw(
      Prisma.sql`SELECT id FROM commissions WHERE id = ${commissionId}::uuid FOR UPDATE`,
    );
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

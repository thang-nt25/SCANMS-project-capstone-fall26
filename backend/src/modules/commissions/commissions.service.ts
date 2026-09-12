import { Injectable, Logger } from '@nestjs/common';
import {
  CommissionStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { CommissionCalculatorService } from './commission-calculator.service';
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
      orderBy: { updatedAt: 'asc' },
      take: COMMISSION_PROCESSING_BATCH_SIZE,
    });
    await this.processCandidates(
      eligibleOrders,
      (id) => this.createPendingCommission(id, now),
      () => summary.created++,
      summary,
      'create',
    );

    const matureCommissions = await this.prisma.commission.findMany({
      where: {
        status: CommissionStatus.PENDING,
        availableAt: { lte: now },
        order: { status: { in: COMMISSION_ELIGIBLE_ORDER_STATUSES } },
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
                isActive: true,
                isDeleted: true,
                collaboratorProfile: {
                  select: {
                    tier: { select: { extraBonusPercentage: true } },
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
        if (
          !collaborator ||
          collaborator.role !== UserRole.COLLABORATOR ||
          !collaborator.isActive ||
          collaborator.isDeleted
        ) {
          return false;
        }

        const tierBonusRate =
          collaborator.collaboratorProfile?.tier?.extraBonusPercentage ??
          new Prisma.Decimal(0);
        const calculation = this.calculator.calculateOrderCommission(
          order.orderItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customCommissionRate: item.product.customCommissionRate,
          })),
          order.store.defaultCommissionRate,
          tierBonusRate,
        );

        for (const item of calculation.items) {
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: {
              appliedCommissionRate: item.appliedCommissionRate,
              calculatedCommissionAmount: item.calculatedCommissionAmount,
            },
          });
        }

        const eligibleAt =
          order.updatedAt.getTime() <= now.getTime() ? order.updatedAt : now;
        const availableAt = this.addDays(eligibleAt, COMMISSION_HOLD_DAYS);
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
        include: { order: { select: { status: true, storeId: true } } },
      });
      if (
        !commission ||
        commission.status !== CommissionStatus.PENDING ||
        commission.availableAt.getTime() > now.getTime() ||
        !COMMISSION_ELIGIBLE_ORDER_STATUSES.includes(commission.order.status)
      ) {
        return false;
      }

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

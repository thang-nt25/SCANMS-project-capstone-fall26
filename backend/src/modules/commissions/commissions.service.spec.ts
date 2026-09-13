import {
  CommissionStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { CommissionCalculatorService } from './commission-calculator.service';
import { CommissionsService } from './commissions.service';

describe('CommissionsService', () => {
  const orderId = '34f823c1-583d-4fa0-9ec2-e4d4567a8812';
  const collaboratorId = 'f10dcbe5-18c9-4508-9497-987bed517a91';
  const commissionId = '31086775-eeaf-4c5d-ac74-f45712014811';

  function createService() {
    let orderItemUpdateInput: unknown;
    let commissionCreateInput: unknown;
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: { findUnique: jest.fn() },
      orderItem: {
        update: jest.fn((input: unknown) => {
          orderItemUpdateInput = input;
          return Promise.resolve({});
        }),
      },
      commission: {
        findUnique: jest.fn(),
        create: jest.fn((input: unknown) => {
          commissionCreateInput = input;
          return Promise.resolve({ id: commissionId });
        }),
        update: jest.fn().mockResolvedValue({ id: commissionId }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
      order: { findMany: jest.fn().mockResolvedValue([]) },
      commission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const wallets = {
      creditPendingBalance: jest.fn().mockResolvedValue({}),
      releasePendingBalance: jest.fn().mockResolvedValue({}),
      reversePendingBalance: jest.fn().mockResolvedValue({}),
      reverseAvailableBalance: jest.fn().mockResolvedValue({}),
    };
    const service = new CommissionsService(
      prisma as unknown as PrismaService,
      new CommissionCalculatorService(),
      wallets as unknown as WalletsService,
    );

    return {
      prisma,
      service,
      tx,
      wallets,
      getOrderItemUpdateInput: () => orderItemUpdateInput,
      getCommissionCreateInput: () => commissionCreateInput,
    };
  }

  it('creates one pending commission and credits the pending wallet atomically', async () => {
    const {
      service,
      tx,
      wallets,
      getOrderItemUpdateInput,
      getCommissionCreateInput,
    } = createService();
    const eligibleAt = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-02T00:00:00.000Z');
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      attributedCollaboratorId: collaboratorId,
      status: OrderStatus.DELIVERED,
      updatedAt: eligibleAt,
      store: { defaultCommissionRate: new Prisma.Decimal('10') },
      attributedCollaborator: {
        id: collaboratorId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
        collaboratorProfile: {
          tier: { extraBonusPercentage: new Prisma.Decimal('2') },
        },
      },
      orderItems: [
        {
          id: 'item-id',
          quantity: 2,
          unitPrice: new Prisma.Decimal('100000'),
          product: { customCommissionRate: new Prisma.Decimal('15') },
        },
      ],
      commissions: [],
    });

    await expect(service.createPendingCommission(orderId, now)).resolves.toBe(
      true,
    );

    const itemUpdate = getOrderItemUpdateInput() as {
      data: {
        appliedCommissionRate: Prisma.Decimal;
        calculatedCommissionAmount: Prisma.Decimal;
      };
    };
    expect(itemUpdate.data.appliedCommissionRate.toString()).toBe('17');
    expect(itemUpdate.data.calculatedCommissionAmount.toString()).toBe('34000');
    const create = getCommissionCreateInput() as {
      data: {
        orderId: string;
        collaboratorId: string;
        status: CommissionStatus;
        eligibleAt: Date;
        availableAt: Date;
        commissionAmount: Prisma.Decimal;
      };
    };
    expect(create.data).toMatchObject({
      orderId,
      collaboratorId,
      status: CommissionStatus.PENDING,
      eligibleAt,
      availableAt: new Date('2026-01-15T00:00:00.000Z'),
    });
    expect(create.data.commissionAmount.toString()).toBe('34000');
    expect(wallets.creditPendingBalance).toHaveBeenCalledTimes(1);
  });

  it('moves a mature pending commission to approved in one transaction', async () => {
    const { service, tx, wallets } = createService();
    const now = new Date('2026-02-01T00:00:00.000Z');
    tx.commission.findUnique
      .mockResolvedValueOnce({ orderId })
      .mockResolvedValueOnce({
        id: commissionId,
        orderId,
        collaboratorId,
        commissionAmount: new Prisma.Decimal('34000'),
        status: CommissionStatus.PENDING,
        availableAt: new Date('2026-01-31T00:00:00.000Z'),
        order: { status: OrderStatus.COMPLETED },
      });

    await expect(
      service.approveMatureCommission(commissionId, now),
    ).resolves.toBe(true);

    expect(wallets.releasePendingBalance).toHaveBeenCalledTimes(1);
    expect(tx.commission.update).toHaveBeenCalledWith({
      where: { id: commissionId },
      data: { status: CommissionStatus.APPROVED, approvedAt: now },
    });
  });

  it('claws an approved commission back from the available wallet', async () => {
    const { service, tx, wallets } = createService();
    const now = new Date('2026-02-02T00:00:00.000Z');
    tx.commission.findUnique
      .mockResolvedValueOnce({ orderId })
      .mockResolvedValueOnce({
        id: commissionId,
        orderId,
        collaboratorId,
        commissionAmount: new Prisma.Decimal('34000'),
        status: CommissionStatus.APPROVED,
        order: { status: OrderStatus.RETURNED },
      });

    await expect(service.reverseCommission(commissionId, now)).resolves.toBe(
      true,
    );

    expect(wallets.reverseAvailableBalance).toHaveBeenCalledTimes(1);
    expect(tx.commission.update).toHaveBeenCalledWith({
      where: { id: commissionId },
      data: { status: CommissionStatus.REVERSED, reversedAt: now },
    });
  });

  it('claws a pending commission back from the pending wallet', async () => {
    const { service, tx, wallets } = createService();
    const now = new Date('2026-02-02T00:00:00.000Z');
    tx.commission.findUnique
      .mockResolvedValueOnce({ orderId })
      .mockResolvedValueOnce({
        id: commissionId,
        orderId,
        collaboratorId,
        commissionAmount: new Prisma.Decimal('34000'),
        status: CommissionStatus.PENDING,
        order: { status: OrderStatus.CANCELLED },
      });

    await expect(service.reverseCommission(commissionId, now)).resolves.toBe(
      true,
    );

    expect(wallets.reversePendingBalance).toHaveBeenCalledTimes(1);
    expect(wallets.reverseAvailableBalance).not.toHaveBeenCalled();
  });
});

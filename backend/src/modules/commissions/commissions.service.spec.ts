import {
  CommissionStatus,
  DealBonusStatus,
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
      creditConditionalDealEscrow: jest.fn().mockResolvedValue({}),
      forfeitConditionalDealBonus: jest.fn().mockResolvedValue({}),
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

  it('uses original goods value for unsnapshotted remuneration regardless of discounts', async () => {
    const { service, tx, getOrderItemUpdateInput } = createService();
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      attributedCollaboratorId: collaboratorId,
      status: OrderStatus.DELIVERED,
      updatedAt: new Date('2026-10-01'),
      couponDiscountAmount: new Prisma.Decimal(20000),
      discountAmount: new Prisma.Decimal(45000),
      store: { defaultCommissionRate: new Prisma.Decimal(10) },
      attributedCollaborator: {
        id: collaboratorId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
        collaboratorProfile: {
          tier: { name: 'Gold', extraBonusPercentage: new Prisma.Decimal(2) },
        },
      },
      orderItems: [
        {
          id: 'line',
          quantity: 1,
          unitPrice: new Prisma.Decimal(250000),
          product: { customCommissionRate: new Prisma.Decimal(10) },
        },
      ],
      commissions: [],
    });
    await expect(
      service.createPendingCommission(orderId, new Date('2026-10-02')),
    ).resolves.toBe(true);
    expect(
      Number(
        (getOrderItemUpdateInput() as any).data.calculatedCommissionAmount,
      ),
    ).toBe(30000);
  });

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
    expect(itemUpdate.data.appliedCommissionRate.toString()).toBe('12');
    expect(itemUpdate.data.calculatedCommissionAmount.toString()).toBe('24000');
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
    expect(create.data.commissionAmount.toString()).toBe('24000');
    expect(wallets.creditPendingBalance).toHaveBeenCalledTimes(1);
  });

  it('splits commission into tier base and conditional escrow when deal uplift exists', async () => {
    const { service, tx, wallets, getCommissionCreateInput } = createService();
    const eligibleAt = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-02T00:00:00.000Z');
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      attributedCollaboratorId: collaboratorId,
      status: OrderStatus.DELIVERED,
      updatedAt: eligibleAt,
      storeId: 'store-1',
      store: { defaultCommissionRate: new Prisma.Decimal('10') },
      attributedCollaborator: {
        id: collaboratorId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
        collaboratorProfile: {
          tier: { name: 'Vàng', extraBonusPercentage: new Prisma.Decimal('2') }, // 12% tier base
        },
      },
      orderItems: [
        {
          id: 'item-vip',
          quantity: 1,
          unitPrice: new Prisma.Decimal('1000000'), // 1M VND
          appliedCommissionRate: new Prisma.Decimal('15'), // 15% VIP Deal
          calculatedCommissionAmount: new Prisma.Decimal('150000'),
          commissionSnapshotAt: now,
          product: { customCommissionRate: null },
        },
      ],
      commissions: [],
    });

    await expect(service.createPendingCommission(orderId, now)).resolves.toBe(
      true,
    );

    const create = getCommissionCreateInput() as {
      data: {
        commissionAmount: Prisma.Decimal;
        baseCommissionRate: Prisma.Decimal;
        baseCommissionAmount: Prisma.Decimal;
        dealBonusRate: Prisma.Decimal;
        dealBonusAmount: Prisma.Decimal;
        dealBonusStatus: DealBonusStatus;
      };
    };
    expect(create.data.commissionAmount.toString()).toBe('150000');
    expect(create.data.baseCommissionRate.toString()).toBe('12');
    expect(create.data.baseCommissionAmount.toString()).toBe('120000'); // 12% protected base
    expect(create.data.dealBonusAmount.toString()).toBe('30000'); // 3% escrow uplift
    expect(create.data.dealBonusStatus).toBe(DealBonusStatus.PENDING_KPI);

    // Wallets: 120k to pendingBalance, 30k to conditionalDealEscrowBalance
    expect(wallets.creditPendingBalance).toHaveBeenCalledWith(
      tx,
      collaboratorId,
      new Prisma.Decimal('120000'),
      expect.anything(),
      'store-1',
    );
    expect(wallets.creditConditionalDealEscrow).toHaveBeenCalledWith(
      tx,
      collaboratorId,
      new Prisma.Decimal('30000'),
    );
  });

  it('posts only the remaining base and deal amounts after a line was partially refunded', async () => {
    const { service, tx, getCommissionCreateInput } = createService();
    tx.order.findUnique.mockResolvedValue({
      id: orderId,
      attributedCollaboratorId: collaboratorId,
      status: OrderStatus.DELIVERED,
      updatedAt: new Date(),
      storeId: 'store-1',
      store: { defaultCommissionRate: new Prisma.Decimal(10) },
      attributedCollaborator: {
        id: collaboratorId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
        collaboratorProfile: {
          tier: { name: 'Đồng', extraBonusPercentage: new Prisma.Decimal(0) },
        },
      },
      orderItems: [
        {
          id: 'partial',
          quantity: 2,
          unitPrice: new Prisma.Decimal(100000),
          appliedCommissionRate: new Prisma.Decimal(16),
          calculatedCommissionAmount: new Prisma.Decimal(16000),
          commissionSnapshotAt: new Date(),
          product: { customCommissionRate: null },
        },
      ],
      commissions: [],
    });
    await service.createPendingCommission(orderId, new Date());
    const data = (getCommissionCreateInput() as any).data;
    expect(data.commissionAmount.toString()).toBe('16000');
    expect(data.baseCommissionAmount.toString()).toBe('10000');
    expect(data.dealBonusAmount.toString()).toBe('6000');
  });

  function historicalDealFixture() {
    const f = createService();
    const purchaseAt = new Date('2026-11-01T00:00:00Z');
    const now = new Date('2026-11-09T00:00:00Z');
    const order = {
      id: orderId,
      storeId: 'store',
      createdAt: purchaseAt,
      deliveredAt: now,
      updatedAt: now,
      attributedCollaboratorId: collaboratorId,
      status: OrderStatus.DELIVERED,
      commissions: [],
      rawPayload: {},
      store: { defaultCommissionRate: new Prisma.Decimal(10) },
      attributedCollaborator: {
        id: collaboratorId,
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
        collaboratorProfile: { tier: { name: 'Bronze' } },
      },
      orderItems: [
        {
          id: 'line',
          productId: 'product',
          quantity: 1,
          unitPrice: new Prisma.Decimal(450000),
          appliedCommissionRate: new Prisma.Decimal(16),
          calculatedCommissionAmount: new Prisma.Decimal(72000),
          commissionSnapshotAt: purchaseAt,
          product: { customCommissionRate: null },
        },
      ],
    };
    f.tx.order.findUnique.mockResolvedValue(order);
    const findFirst = jest.fn().mockResolvedValue({
      id: 'historical-deal',
      approvedCommissionRate: new Prisma.Decimal(16),
      closedAt: null,
    });
    Object.assign(f.tx, { exclusiveDealProposal: { findFirst } });
    return { ...f, order, purchaseAt, now, findFirst };
  }

  it('keeps the historical 16% deal conditional when delivery is after its expiry', async () => {
    const f = historicalDealFixture();
    await f.service.createPendingCommission(orderId, f.now);
    const data = (f.getCommissionCreateInput() as any).data;
    expect(data.baseCommissionAmount.toString()).toBe('45000');
    expect(data.dealBonusAmount.toString()).toBe('27000');
    expect(data.dealBonusStatus).toBe(DealBonusStatus.PENDING_KPI);
    expect(data.dealProposalId).toBe('historical-deal');
    expect(f.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lte: f.purchaseAt },
          AND: expect.arrayContaining([
            {
              OR: [
                { commitmentEndsAt: null },
                { commitmentEndsAt: { gt: f.purchaseAt } },
              ],
            },
            {
              OR: [
                { commitmentStartedAt: { lte: f.purchaseAt } },
                {
                  commitmentStartedAt: null,
                  reviewedAt: { lte: f.purchaseAt },
                },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it('uses the captured deal identity instead of a later agreement', async () => {
    const f = historicalDealFixture();
    f.order.rawPayload = {
      goodsPricing: [{ commissionDealId: 'historical-deal' }],
    };
    await f.service.createPendingCommission(orderId, f.now);
    expect(f.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['historical-deal'] },
        }),
      }),
    );
  });

  it('keeps explicitly non-deal income out of conditional escrow', async () => {
    const f = historicalDealFixture();
    f.order.rawPayload = { goodsPricing: [{ commissionDealId: null }] };
    await f.service.createPendingCommission(orderId, f.now);
    expect(f.findFirst).not.toHaveBeenCalled();
    const data = (f.getCommissionCreateInput() as any).data;
    expect(data.baseCommissionAmount.toString()).toBe('72000');
    expect(data.dealBonusAmount.toString()).toBe('0');
  });

  it('requires reconciliation for an already closed historical deal', async () => {
    const f = historicalDealFixture();
    f.findFirst.mockResolvedValue({
      id: 'historical-deal',
      approvedCommissionRate: new Prisma.Decimal(16),
      closedAt: f.now,
    });
    await expect(
      f.service.createPendingCommission(orderId, f.now),
    ).rejects.toThrow('cần đối soát kết quả KPI');
    expect(f.tx.commission.create).not.toHaveBeenCalled();
    expect(f.wallets.creditPendingBalance).not.toHaveBeenCalled();
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

  it.each([
    ['REQUESTED', null, false],
    ['REFUND_PROCESSING', 'REFUND', false],
    ['REFUNDED', 'REFUND', false],
    ['COMPLETED', 'EXCHANGE', true],
    ['CLOSED', null, true],
  ])(
    'guards mature escrow with return status %s',
    async (status, resolution, released) => {
      const { service, tx, wallets } = createService();
      tx.commission.findUnique
        .mockResolvedValueOnce({ orderId })
        .mockResolvedValueOnce({
          id: commissionId,
          orderId,
          collaboratorId,
          commissionAmount: new Prisma.Decimal('72000'),
          status: CommissionStatus.PENDING,
          availableAt: new Date('2026-01-01'),
          order: {
            status: OrderStatus.COMPLETED,
            returnRequests: [{ status, resolution, dispute: null }],
          },
        });
      expect(
        await service.approveMatureCommission(
          commissionId,
          new Date('2026-02-01'),
        ),
      ).toBe(released);
      expect(wallets.releasePendingBalance).toHaveBeenCalledTimes(
        released ? 1 : 0,
      );
    },
  );

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

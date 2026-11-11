import { ConflictException, ForbiddenException } from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ReturnRequestStatus,
  ReturnResolution,
  UserRole,
} from '@prisma/client';
import { ReturnService } from './return.service';

function fixture(
  status: ReturnRequestStatus = ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
) {
  const amount = new Prisma.Decimal(521001);
  const current: any = {
    id: 'return-1',
    customerId: 'customer-1',
    orderId: 'order-1',
    status,
    resolution: ReturnResolution.REFUND,
    originalOrderStatus: OrderStatus.COMPLETED,
    items: [],
    events: [],
    shipments: [],
    refund: { amount, method: 'WALLET', status: 'PENDING', processedAt: null },
    order: {
      id: 'order-1',
      status: OrderStatus.RETURN_REQUESTED,
      externalOrderSn: 'DH-1',
      finalAmount: amount,
      refundedAmount: new Prisma.Decimal(0),
      orderItems: [],
      store: { id: 'store-1', ownerId: 'shop-1' },
      paymentTransactions: [],
    },
  };
  let shoppingBalance = new Prisma.Decimal(100000);
  let transactionTail = Promise.resolve();
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'return-1' }]),
    returnRequest: {
      findUnique: jest.fn(async () => current),
      updateMany: jest.fn(async ({ where, data }) => {
        if (current.status !== where.status) return { count: 0 };
        Object.assign(current, data);
        return { count: 1 };
      }),
    },
    order: {
      updateMany: jest.fn(async ({ where, data }) => {
        if (current.order.status !== where.status) return { count: 0 };
        Object.assign(current.order, data);
        return { count: 1 };
      }),
    },
    refund: {
      create: jest.fn(async ({ data }) => {
        current.refund = { ...data };
      }),
      upsert: jest.fn(async ({ update }) => {
        Object.assign(current.refund, update);
      }),
      update: jest.fn(async ({ data }) => {
        Object.assign(current.refund, data);
      }),
    },
    dispute: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    returnEvent: {
      create: jest.fn(async ({ data }) => {
        current.events.push(data);
      }),
    },
    notification: { create: jest.fn() },
  };
  const prisma: any = {
    dispute: {
      findUnique: jest.fn(async () => ({
        id: 'dispute-1',
        status: 'OPEN',
        returnRequest: current,
      })),
    },
    $transaction: jest.fn((work: (client: any) => Promise<unknown>) => {
      // Model transaction serialization/rollback; production uses PostgreSQL row locks.
      const result = transactionTail.then(async () => {
        const before = {
          status: current.status,
          refund: { ...current.refund },
          events: [...current.events],
          order: { ...current.order },
          shoppingBalance,
        };
        try {
          return await work(tx);
        } catch (error) {
          Object.assign(current, {
            status: before.status,
            refund: before.refund,
            events: before.events,
            order: before.order,
          });
          shoppingBalance = before.shoppingBalance;
          throw error;
        }
      });
      transactionTail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }),
  };
  const walletsService: any = {
    refundToWallet: jest.fn(async (_tx, _customer, value) => {
      shoppingBalance = shoppingBalance.add(value);
    }),
  };
  const commissionRulesService: any = {
    handleRefundAdjustment: jest.fn(async (_store, _order, value) => {
      current.order.refundedAmount = current.order.refundedAmount.add(value);
    }),
  };
  const service: any = new ReturnService(
    prisma,
    {} as never,
    undefined,
    walletsService,
    undefined,
    commissionRulesService,
  );
  service.scopedDetail = jest.fn(async () => current);
  service.getOne = jest.fn(async () => current);
  return {
    service,
    current,
    tx,
    walletsService,
    commissionRulesService,
    balance: () => shoppingBalance.toFixed(2),
  };
}

describe('Flow 4 customer consent gates refund settlement', () => {
  it.each([UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN])(
    'approval by %s creates a pending refund without moving money',
    async (role) => {
      const {
        service,
        current,
        tx,
        balance,
        walletsService,
        commissionRulesService,
      } = fixture(ReturnRequestStatus.DISPUTED);
      current.order.status = OrderStatus.DISPUTED;
      await service.resolveDispute('manager-1', role, 'dispute-1', {
        ruling: 'APPROVE_REFUND',
        liability: 'SHOP_FAULT',
        notes: 'Đồng ý hoàn khách do sản phẩm bị hư.',
      });
      expect(current.status).toBe(
        ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
      );
      expect(current.refund.status).toBe('PENDING');
      expect(current.refund.processedAt).toBeNull();
      expect(balance()).toBe('100000.00');
      expect(current.order.refundedAmount.toString()).toBe('0');
      expect(walletsService.refundToWallet).not.toHaveBeenCalled();
      expect(
        commissionRulesService.handleRefundAdjustment,
      ).not.toHaveBeenCalled();
      expect(tx.refund.upsert).toHaveBeenCalledTimes(1);
    },
  );

  it('shop inspection also waits for customer consent', async () => {
    const {
      service,
      current,
      balance,
      walletsService,
      commissionRulesService,
    } = fixture(ReturnRequestStatus.INSPECTING);
    await service.inspect('shop-1', UserRole.SHOP_MANAGER, current.id, {
      resolution: 'REFUND',
      liability: 'SHOP_FAULT',
      notes: 'Đã kiểm tra sản phẩm lỗi cần hoàn tiền.',
    });
    expect(current.status).toBe(
      ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
    );
    expect(current.refund.status).toBe('PENDING');
    expect(balance()).toBe('100000.00');
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
    expect(
      commissionRulesService.handleRefundAdjustment,
    ).not.toHaveBeenCalled();
  });

  it('customer consent credits the wallet, claws back income and completes the case once', async () => {
    const {
      service,
      current,
      balance,
      walletsService,
      commissionRulesService,
      tx,
    } = fixture();
    await service.confirmCompletion(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(current.status).toBe(ReturnRequestStatus.COMPLETED);
    expect(current.refund.status).toBe('SUCCEEDED');
    expect(balance()).toBe('621001.00');
    expect(current.order.refundedAmount.toString()).toBe('521001');
    expect(current.order.status).toBe(OrderStatus.RETURNED);
    expect(current.events).toContainEqual(
      expect.objectContaining({
        type: 'CUSTOMER_REFUND_CONFIRMED',
        actorId: 'customer-1',
      }),
    );
    expect(walletsService.refundToWallet).toHaveBeenCalledTimes(1);
    expect(commissionRulesService.handleRefundAdjustment).toHaveBeenCalledTimes(
      1,
    );
  });

  it('repeated or concurrent confirmations cannot credit the same refund twice', async () => {
    const {
      service,
      current,
      balance,
      walletsService,
      commissionRulesService,
    } = fixture();
    await Promise.all([
      service.confirmCompletion('customer-1', UserRole.CUSTOMER, current.id),
      service.confirmCompletion('customer-1', UserRole.CUSTOMER, current.id),
    ]);
    await service.confirmCompletion(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(balance()).toBe('621001.00');
    expect(walletsService.refundToWallet).toHaveBeenCalledTimes(1);
    expect(commissionRulesService.handleRefundAdjustment).toHaveBeenCalledTimes(
      1,
    );
  });

  it.each([
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_MANAGER,
    UserRole.SYSTEM_ADMIN,
  ])('the purchaser can confirm using their %s account', async (role) => {
    const { service, current, balance } = fixture();
    await service.confirmCompletion('customer-1', role, current.id);
    expect(balance()).toBe('621001.00');
  });

  it('another account, including a manager, cannot consent on behalf of the purchaser', async () => {
    const { service, current, balance, walletsService } = fixture();
    await expect(
      service.confirmCompletion(
        'manager-1',
        UserRole.SYSTEM_MANAGER,
        current.id,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(balance()).toBe('100000.00');
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
  });

  it.each([
    ReturnRequestStatus.REFUND_PENDING,
    ReturnRequestStatus.REFUND_FAILED,
  ])(
    'older %s cases can still be confirmed by the customer',
    async (status) => {
      const { service, current, balance } = fixture(status);
      await service.confirmCompletion(
        'customer-1',
        UserRole.CUSTOMER,
        current.id,
      );
      expect(current.status).toBe(ReturnRequestStatus.COMPLETED);
      expect(balance()).toBe('621001.00');
    },
  );

  it('already-paid legacy cases close without credit or clawback again', async () => {
    const { service, current, walletsService, commissionRulesService } =
      fixture();
    current.refund.status = 'SUCCEEDED';
    await service.confirmCompletion(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(current.status).toBe(ReturnRequestStatus.COMPLETED);
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
    expect(
      commissionRulesService.handleRefundAdjustment,
    ).not.toHaveBeenCalled();
  });

  it('rolls back consent and financial changes on wallet failure and allows a safe retry', async () => {
    const { service, current, walletsService, balance } = fixture();
    walletsService.refundToWallet.mockRejectedValueOnce(
      new Error('Wallet unavailable'),
    );
    await expect(
      service.confirmCompletion('customer-1', UserRole.CUSTOMER, current.id),
    ).rejects.toThrow('Wallet unavailable');
    expect(current.status).toBe(
      ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
    );
    expect(current.refund.status).toBe('PENDING');
    expect(current.order.refundedAmount.toString()).toBe('0');
    expect(
      current.events.some(
        (event) => event.type === 'CUSTOMER_REFUND_CONFIRMED',
      ),
    ).toBe(false);
    expect(balance()).toBe('100000.00');
    await service.confirmCompletion(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(balance()).toBe('621001.00');
  });

  it('rejects mismatched refund amounts instead of silently reducing a promised refund', async () => {
    const { service, current, walletsService } = fixture();
    current.order.refundedAmount = new Prisma.Decimal(100000);
    await expect(
      service.confirmCompletion('customer-1', UserRole.CUSTOMER, current.id),
    ).rejects.toThrow(ConflictException);
    expect(current.status).toBe(
      ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION,
    );
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
  });
});

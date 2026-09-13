import { ConflictException } from '@nestjs/common';
import { OrderSourcePlatform, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ManualOrdersService } from './manual-orders.service';

describe('ManualOrdersService', () => {
  const manager = {
    id: 'b20bff87-86c9-40e2-9ad8-e916cab93827',
    role: UserRole.SHOP_MANAGER,
  };
  const store = {
    id: 'bd50c6a6-58f1-4acf-895a-715566fca863',
    ownerId: manager.id,
    isDeleted: false,
  };
  const product = {
    id: 'c4cd91b8-b9f7-434c-804a-4c9ef0d3c821',
    sku: 'SERUM-B5',
    title: 'Serum B5',
    price: 150000,
  };
  const dto: CreateManualOrderDto = {
    externalOrderSn: 'MANUAL-001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    shippingAddress: 'Quận 1, TP.HCM',
    discountAmount: 10000,
    items: [{ sku: product.sku, quantity: 2 }],
  };

  function createService() {
    const prisma = {
      store: { findFirst: jest.fn() },
      order: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    return {
      prisma,
      service: new ManualOrdersService(prisma as unknown as PrismaService),
    };
  }

  it('creates order and items atomically without commission records', async () => {
    const { prisma, service } = createService();
    const createdOrder = { id: 'order-id', orderItems: [] };
    const createOrder = jest.fn((input: unknown) => {
      void input;
      return Promise.resolve(createdOrder);
    });

    prisma.store.findFirst.mockResolvedValue(store);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.product.findMany.mockResolvedValue([product]);
    prisma.$transaction.mockImplementation(
      (callback: (tx: { order: { create: typeof createOrder } }) => unknown) =>
        callback({ order: { create: createOrder } }),
    );

    const result = await service.createManualOrder(manager, dto);
    const createInput = createOrder.mock.calls[0][0] as {
      data: {
        sourcePlatform: OrderSourcePlatform;
        subtotalAmount: number;
        finalAmount: number;
        orderItems: {
          create: Array<{
            appliedCommissionRate: number;
            calculatedCommissionAmount: number;
          }>;
        };
      };
    };

    expect(result.order).toBe(createdOrder);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createInput.data.sourcePlatform).toBe(OrderSourcePlatform.INTERNAL);
    expect(String(createInput.data.subtotalAmount)).toBe('300000');
    expect(String(createInput.data.finalAmount)).toBe('290000');
    expect(createInput.data.orderItems.create[0]).toMatchObject({
      appliedCommissionRate: 0,
      calculatedCommissionAmount: 0,
    });
  });

  it('rejects a duplicate manual order before opening a transaction', async () => {
    const { prisma, service } = createService();
    prisma.store.findFirst.mockResolvedValue(store);
    prisma.order.findFirst.mockResolvedValue({ id: 'existing-order' });

    await expect(
      service.createManualOrder(manager, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

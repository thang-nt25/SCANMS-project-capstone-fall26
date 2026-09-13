import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderSourcePlatform, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ManualOrdersService } from './manual-orders.service';
import { CouponsService } from '../coupons/coupons.service';
import { ManualPaymentMethod } from './dto/create-manual-order.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

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
    stockQuantity: 10,
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
    const coupons = { validateCoupon: jest.fn() };
    return {
      prisma,
      service: new ManualOrdersService(
        prisma as unknown as PrismaService,
        coupons as unknown as CouponsService,
      ),
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
        callback({
          order: { create: createOrder },
          $queryRaw: jest.fn().mockResolvedValue([
            {
              id: product.id,
              stock_quantity: product.stockQuantity,
              is_active: true,
              is_deleted: false,
            },
          ]),
        } as Parameters<typeof callback>[0]),
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

  it('accepts the nested customer contract and validates mandatory fields and positive prices', async () => {
    const valid = {
      customer: {
        name: 'QA',
        phone: '0902233445',
        email: 'qa@example.test',
        address: 'Road',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
      },
      paymentMethod: 'COD',
      shippingFee: 30000,
      items: [{ productId: product.id, quantity: 1, unitPrice: 150000 }],
    };
    expect(
      await validate(plainToInstance(CreateManualOrderDto, valid)),
    ).toHaveLength(0);
    for (const change of [
      { shippingFee: undefined },
      { paymentMethod: 'CASH' },
      { customer: { ...valid.customer, district: '', email: 'bad' } },
      { items: [{ productId: product.id, quantity: 1, unitPrice: 0 }] },
    ])
      expect(
        (
          await validate(
            plainToInstance(CreateManualOrderDto, { ...valid, ...change }),
          )
        ).length,
      ).toBeGreaterThan(0);
  });

  it('saves shipping/payment/customer metadata, checks aggregate stock and rejects tampered totals', async () => {
    const { prisma, service } = createService();
    prisma.store.findFirst.mockResolvedValue(store);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.product.findMany.mockResolvedValue([product]);
    const create = jest.fn((input: unknown) => {
      void input;
      return Promise.resolve({ id: 'created' });
    });
    const query = jest.fn().mockResolvedValue([
      {
        id: product.id,
        stock_quantity: 2,
        is_active: true,
        is_deleted: false,
      },
    ]);
    prisma.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ order: { create }, $queryRaw: query }),
    );
    const payload = {
      ...dto,
      shippingFee: 30000,
      paymentMethod: ManualPaymentMethod.COD,
      customer: {
        name: 'QA',
        phone: '+84 902233445',
        email: 'qa@example.test',
        address: 'Road',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
      },
      totalAmount: 320000,
    };
    await service.createManualOrder(manager, payload);
    const createInput = create.mock.calls[0][0] as {
      data: {
        finalAmount: unknown;
        shippingFee: unknown;
        shippingAddress: string;
        rawPayload: unknown;
        customerPhone: string;
      };
    };
    const data = createInput.data;
    expect(String(data.finalAmount)).toBe('320000');
    expect(String(data.shippingFee)).toBe('30000');
    expect(data.customerPhone).toBe('0902233445');
    expect(data.shippingAddress).toBe('Road, Dịch Vọng, Cầu Giấy, Hà Nội');
    expect(data.rawPayload).toMatchObject({
      paymentMethod: 'COD',
      customer: { email: 'qa@example.test' },
    });
    create.mockClear();
    await expect(
      service.createManualOrder(manager, { ...payload, totalAmount: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createManualOrder(manager, {
        ...payload,
        items: [
          { sku: product.sku, quantity: 2 },
          { sku: product.sku, quantity: 1 },
        ],
      }),
    ).rejects.toThrow('tồn kho');
    expect(create).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
  });
});

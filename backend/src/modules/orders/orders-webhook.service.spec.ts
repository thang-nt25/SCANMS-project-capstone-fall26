import { OrderSourcePlatform } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ExternalOrderPlatform,
  OrderWebhookDto,
} from './dto/order-webhook.dto';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';
import { CouponsService } from '../coupons/coupons.service';
import { CacheService } from '../../core/cache/cache.service';
import { WalletsService } from '../wallets/wallets.service';
import { FinancialLedgerService } from '../wallets/financial-ledger.service';

describe('OrdersService FR-19 webhook', () => {
  const store = {
    id: '9192a8f8-a2ad-4d24-a0e7-bcf9ac0b57f5',
    slug: 'sora-skin',
    isDeleted: false,
  };
  const product = {
    id: 'a6741067-3d00-41c0-9aa8-50b32e2a1c89',
    sku: 'SERUM-B5',
    title: 'Serum B5',
  };
  const dto: OrderWebhookDto = {
    source: ExternalOrderPlatform.SHOPEE,
    storeId: store.id,
    payload: {
      order_sn: 'SPX-1001',
      recipient_address: { name: 'Nguyen Van A', phone: '0901234567' },
      item_list: [
        {
          item_name: product.title,
          item_sku: product.sku,
          model_quantity: 2,
          model_discounted_price: 150000,
        },
      ],
      total_amount: 300000,
    },
  };

  function createService() {
    const prisma = {
      store: { findUnique: jest.fn() },
      order: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new OrdersService(
      prisma as unknown as PrismaService,
      new OrderWebhookNormalizerService(),
      {} as CouponsService,
      {} as CacheService,
      new ConfigService(),
      new WalletsService(new FinancialLedgerService()),
    );
    return { prisma, service };
  }

  it('creates the order and its items in one transaction without commission logic', async () => {
    const { prisma, service } = createService();
    const createdOrder = {
      id: 'order-id',
      sourcePlatform: OrderSourcePlatform.SHOPEE,
      externalOrderSn: 'SPX-1001',
      orderItems: [],
    };
    const createOrder = jest.fn(
      (input: unknown): Promise<typeof createdOrder> => {
        void input;
        return Promise.resolve(createdOrder);
      },
    );

    prisma.store.findUnique.mockResolvedValue(store);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.product.findMany.mockResolvedValue([product]);
    prisma.$transaction.mockImplementation(
      (callback: (tx: { order: { create: typeof createOrder } }) => unknown) =>
        callback({ order: { create: createOrder } }),
    );

    const result = await service.receiveWebhook(dto);
    const createInput = createOrder.mock.calls[0][0] as {
      data: {
        sourcePlatform: OrderSourcePlatform;
        externalOrderSn: string;
        orderItems: {
          create: Array<{
            productId: string;
            quantity: number;
            appliedCommissionRate: number;
            calculatedCommissionAmount: number;
          }>;
        };
      };
    };

    expect(result.created).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createInput.data.sourcePlatform).toBe(OrderSourcePlatform.SHOPEE);
    expect(createInput.data.externalOrderSn).toBe('SPX-1001');
    expect(createInput.data.orderItems.create).toEqual([
      expect.objectContaining({
        productId: product.id,
        quantity: 2,
        appliedCommissionRate: 0,
        calculatedCommissionAmount: 0,
      }),
    ]);
  });

  it('returns an idempotent response without creating duplicate items', async () => {
    const { prisma, service } = createService();
    const existingOrder = {
      id: 'existing-order-id',
      sourcePlatform: OrderSourcePlatform.SHOPEE,
      externalOrderSn: 'SPX-1001',
      orderItems: [{ id: 'existing-item-id' }],
    };

    prisma.store.findUnique.mockResolvedValue(store);
    prisma.order.findFirst.mockResolvedValue(existingOrder);

    const result = await service.receiveWebhook(dto);

    expect(result).toMatchObject({ created: false, idempotent: true });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

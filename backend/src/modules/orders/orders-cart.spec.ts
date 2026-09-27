import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../core/cache/cache.service';
import { CheckoutMetricsService } from './checkout-metrics.service';
import { WalletsService } from '../wallets/wallets.service';
import { CouponsService } from '../coupons/coupons.service';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';

describe('OrdersService - Cart Validation & Multi-store Checkout', () => {
  let service: OrdersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'test-jwt-secret' } },
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn() } },
        {
          provide: CheckoutMetricsService,
          useValue: {
            recordIdempotencyConflict: jest.fn(),
            recordIdempotentReplay: jest.fn(),
            recordStockAnomaly: jest.fn(),
          },
        },
        { provide: WalletsService, useValue: {} },
        { provide: CouponsService, useValue: { validateCoupon: jest.fn() } },
        { provide: OrderWebhookNormalizerService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('validateCart should correctly identify available stock and price changes', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        title: 'Áo thun Polo',
        sku: 'POLO-01',
        price: '250000',
        stockQuantity: 10,
        isActive: true,
        store: { id: 'store-1', name: 'Shop A', slug: 'shop-a', isActive: true, isDeleted: false },
        variants: [
          { id: 'var-1', name: 'Size L', sku: 'POLO-01-L', price: '260000', stockQuantity: 5, isActive: true },
        ],
      },
    ]);

    const result = await service.validateCart({
      items: [
        {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 2,
          clientPrice: 200000, // Client had old price 200,000; DB is 260,000
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.isValid).toBe(false); // Because price changed
    expect(result.hasPriceChange).toBe(true);
    expect(result.items[0].currentPrice).toBe(260000);
    expect(result.items[0].priceChanged).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('validateCart should report out of stock when requested quantity exceeds stock', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-2',
        title: 'Kem Dưỡng Da',
        sku: 'CREAM-01',
        price: '300000',
        stockQuantity: 1,
        isActive: true,
        store: { id: 'store-2', name: 'Shop B', slug: 'shop-b', isActive: true, isDeleted: false },
        variants: [],
      },
    ]);

    const result = await service.validateCart({
      items: [
        {
          productId: 'prod-2',
          quantity: 5, // Exceeds available 1
          clientPrice: 300000,
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.hasOutOfStock).toBe(true);
    expect(result.items[0].outOfStock).toBe(true);
    expect(result.warnings[0]).toContain('chỉ còn 1 sản phẩm trong kho');
  });

  it('createOrder with two variants of the same product should succeed and use correct variant prices', async () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    const variantId1 = '22222222-2222-4222-8222-222222222221';
    const variantId2 = '22222222-2222-4222-8222-222222222222';
    const storeId = '33333333-3333-4333-8333-333333333333';

    // 1 Product record in DB
    prisma.product.findMany.mockResolvedValue([
      {
        id: productId,
        storeId,
        title: 'Áo thun Polo Luxury',
        price: '200000',
        stockQuantity: 50,
        isActive: true,
        isDeleted: false,
        store: { id: storeId, name: 'Sora Shop', slug: 'sora-shop', isActive: true, isDeleted: false },
      },
    ]);

    prisma.order.findUnique.mockResolvedValue(null);

    // Mock productVariant findMany
    prisma.productVariant = {
      findMany: jest.fn().mockResolvedValue([
        { id: variantId1, productId, name: 'Size M', price: '220000', stockQuantity: 10, isActive: true },
        { id: variantId2, productId, name: 'Size L', price: '250000', stockQuantity: 10, isActive: true },
      ]),
    };

    let savedOrderData: any = null;
    prisma.$transaction = jest.fn().mockImplementation(async (callback: any) => {
      const txMock = {
        store: {
          findUnique: jest.fn().mockResolvedValue({ id: storeId, name: 'Sora Shop', isActive: true, isDeleted: false }),
        },
        $executeRaw: jest.fn().mockResolvedValue(1), // stock deduction successful
        order: {
          create: jest.fn().mockImplementation(async ({ data }: any) => {
            savedOrderData = data;
            return {
              id: 'order-123',
              storeId,
              externalOrderSn: 'ORD-TEST-123',
              subtotalAmount: data.subtotalAmount,
              discountAmount: data.discountAmount,
              shippingFee: data.shippingFee,
              finalAmount: data.finalAmount,
              status: 'PENDING',
              rawPayload: data.rawPayload,
              orderItems: data.orderItems.create.map((it: any) => ({
                ...it,
                product: { id: it.productId, title: 'Áo thun Polo Luxury', sku: 'POLO', imageUrl: '', categoryName: '' },
                variant: { id: it.variantId, name: it.variantId === variantId1 ? 'Size M' : 'Size L', sku: 'POLO-V' },
              })),
              store: { id: storeId, name: 'Sora Shop', slug: 'sora-shop' },
            };
          }),
        },
      };
      return callback(txMock);
    });

    const result = await service.createOrder({
      customerName: 'Nguyễn Văn A',
      customerPhone: '0987654321',
      shippingAddress: '123 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
      paymentMethod: 'COD',
      idempotencyKey: 'test-variant-order-1',
      items: [
        { productId, variantId: variantId1, quantity: 1 },
        { productId, variantId: variantId2, quantity: 2 },
      ],
    });

    expect(result.publicOrderCode).toBe('ORD-TEST-123');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Subtotal: (220,000 * 1) + (250,000 * 2) = 720,000
    expect(Number(savedOrderData.subtotalAmount)).toBe(720000);
    expect(Number(savedOrderData.finalAmount)).toBe(720000);
    expect(savedOrderData.orderItems.create[0].unitPrice).toBe(220000);
    expect(savedOrderData.orderItems.create[1].unitPrice).toBe(250000);
  });

  it('createOrder for multi-store cart executes within a single atomic $transaction and rolls back if any shop fails', async () => {
    const storeAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const storeBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const prodAId = '11111111-1111-1111-1111-111111111111';
    const prodBId = '22222222-2222-2222-2222-222222222222';

    prisma.product.findMany.mockResolvedValue([
      {
        id: prodAId,
        storeId: storeAId,
        title: 'Sản phẩm Shop A',
        price: '100000',
        stockQuantity: 10,
        isActive: true,
        isDeleted: false,
        store: { id: storeAId, name: 'Shop A', slug: 'shop-a', isActive: true, isDeleted: false },
      },
      {
        id: prodBId,
        storeId: storeBId,
        title: 'Sản phẩm Shop B',
        price: '200000',
        stockQuantity: 5,
        isActive: true,
        isDeleted: false,
        store: { id: storeBId, name: 'Shop B', slug: 'shop-b', isActive: true, isDeleted: false },
      },
    ]);

    prisma.order.findUnique.mockResolvedValue(null);
    prisma.order.findMany = jest.fn().mockResolvedValue([]); // No existing idempotent sub-orders
    prisma.productVariant = { findMany: jest.fn().mockResolvedValue([]) };

    // Simulate Shop B out of stock error inside the single atomic transaction
    let transactionExecuted = false;
    prisma.$transaction = jest.fn().mockImplementation(async (callback: any) => {
      transactionExecuted = true;
      let executeCount = 0;
      const txMock = {
        store: {
          findUnique: jest.fn().mockImplementation(({ where }: any) => {
            if (where.id === storeAId) return { id: storeAId, name: 'Shop A', isActive: true, isDeleted: false };
            return { id: storeBId, name: 'Shop B', isActive: true, isDeleted: false };
          }),
        },
        $executeRaw: jest.fn().mockImplementation(() => {
          executeCount++;
          if (executeCount === 2) {
            // Shop B out of stock
            return 0;
          }
          return 1;
        }),
        order: {
          create: jest.fn().mockResolvedValue({ id: 'sub-order-1' }),
        },
      };
      return callback(txMock);
    });

    await expect(
      service.createOrder({
        customerName: 'Nguyễn Văn B',
        customerPhone: '0987654322',
        shippingAddress: '456 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội',
        paymentMethod: 'COD',
        idempotencyKey: 'multi-store-test-rollback',
        items: [
          { productId: prodAId, quantity: 1 },
          { productId: prodBId, quantity: 10 }, // Out of stock on Shop B
        ],
      }),
    ).rejects.toThrow('PRODUCT_OUT_OF_STOCK');

    expect(transactionExecuted).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

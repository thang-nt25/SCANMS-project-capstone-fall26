import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProductsService } from '../products.service';

describe('Product variant images', () => {
  const productId = 'a1a1a1a1-1111-4111-8111-111111111111';
  const variantId = 'b2b2b2b2-2222-4222-8222-222222222222';
  const prisma: any = {
    store: { findFirst: jest.fn() },
    product: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    mediaAsset: { create: jest.fn(), createMany: jest.fn() },
    productVariant: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (transaction: any) => any) => callback(prisma)),
  };
  const cache = { delPrefix: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(prisma, {} as any, cache as any);
    prisma.product.findFirst.mockResolvedValue({
      id: productId,
      store: { ownerId: 'shop-owner', isVerified: true, onboardingStatus: 'VERIFIED' },
      variants: [{ id: variantId }, { id: 'c3c3c3c3-3333-4333-8333-333333333333' }],
    });
    prisma.productVariant.findMany.mockResolvedValue([]);
    prisma.productVariant.update.mockImplementation((args: any) => ({ id: args.where.id, ...args.data }));
    prisma.productVariant.create.mockImplementation((args: any) => ({ id: 'new-variant', ...args.data }));
    prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.update.mockResolvedValue({ id: productId, stockQuantity: 20 });
  });

  it('saves a distinct image URL per SKU and deactivates removed variants', async () => {
    const result = await service.syncProductVariants('shop-owner', UserRole.SHOP_MANAGER, productId, {
      variants: [
        {
          id: variantId,
          sku: 'serum-30ml',
          name: 'Dung tích 30 ml',
          price: 350000,
          stockQuantity: 12,
          imageUrl: 'https://cdn.scanms.vn/serum-30ml.jpg',
          attributes: { volume: '30 ml', formula: 'Serum lỏng' },
        },
        {
          sku: 'serum-50ml',
          name: 'Dung tích 50 ml',
          price: 490000,
          stockQuantity: 8,
          imageUrl: 'https://cdn.scanms.vn/serum-50ml.jpg',
          attributes: { volume: '50 ml', formula: 'Serum lỏng' },
        },
      ],
    });

    expect(prisma.productVariant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: variantId },
      data: expect.objectContaining({ imageUrl: 'https://cdn.scanms.vn/serum-30ml.jpg' }),
    }));
    expect(prisma.productVariant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productId,
        sku: 'SERUM-50ML',
        imageUrl: 'https://cdn.scanms.vn/serum-50ml.jpg',
        attributes: { volume: '50 ml', formula: 'Serum lỏng' },
      }),
    }));
    expect(prisma.productVariant.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productId, isActive: true }),
      data: { isActive: false },
    }));
    expect(result.variants).toHaveLength(2);
    expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: { stockQuantity: 20 } });
  });

  it('rejects attempts to edit another shop’s product variants', async () => {
    await expect(
      service.syncProductVariants('someone-else', UserRole.SHOP_MANAGER, productId, { variants: [] }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.productVariant.create).not.toHaveBeenCalled();
  });

  it('creates a complete product with its variants and combined stock without optional commission or sample settings', async () => {
    prisma.store.findFirst.mockResolvedValue({ id: 'store-1', isVerified: true, onboardingStatus: 'VERIFIED' });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockImplementation((args: any) => ({ id: productId, ...args.data }));

    const result = await service.create('shop-owner', UserRole.SHOP_MANAGER, {
      storeId: 'store-1', sku: 'SERUM-1', title: 'Serum dưỡng da',
      categoryName: 'Mỹ phẩm & Chăm sóc da',
      description: 'Serum dưỡng da cấp ẩm và hỗ trợ phục hồi hàng rào bảo vệ da.',
      ingredients: 'Niacinamide 5%, Panthenol 2%', origin: 'Việt Nam',
      labelInfo: 'Hướng dẫn sử dụng: thoa đều trên da sạch; tránh tiếp xúc với mắt.',
      originProofLinks: ['https://brand.example/origin'],
      labelProofImages: ['https://cdn.scanms.vn/label.jpg'],
      imageUrl: 'https://cdn.scanms.vn/serum-main.jpg',
      stockQuantity: 20,
      price: 350000,
      variants: [
        { sku: 'SERUM-1-30ML', name: '30 ml · Serum lỏng · Chai nhỏ giọt', attributes: { volume: '30 ml', formula: 'Serum lỏng', package: 'Chai nhỏ giọt' }, price: 350000, stockQuantity: 12, imageUrl: 'https://cdn.scanms.vn/30.jpg' },
        { sku: 'SERUM-1-50ML', name: '50 ml · Serum lỏng · Chai nhỏ giọt', attributes: { volume: '50 ml', formula: 'Serum lỏng', package: 'Chai nhỏ giọt' }, price: 490000, stockQuantity: 8, imageUrl: 'https://cdn.scanms.vn/50.jpg' },
      ],
    } as any);

    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        stockQuantity: 20,
        variants: { create: expect.arrayContaining([
          expect.objectContaining({ attributes: expect.objectContaining({ volume: '30 ml' }), imageUrl: 'https://cdn.scanms.vn/30.jpg' }),
          expect.objectContaining({ attributes: expect.objectContaining({ volume: '50 ml' }), imageUrl: 'https://cdn.scanms.vn/50.jpg' }),
        ]) },
      }),
    }));
    expect(result.product.id).toBe(productId);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a new product missing required evidence and details before persisting it', async () => {
    prisma.store.findFirst.mockResolvedValue({ id: 'store-1', isVerified: true, onboardingStatus: 'VERIFIED' });

    await expect(service.create('shop-owner', UserRole.SHOP_MANAGER, {
      storeId: 'store-1', sku: 'SERUM-EMPTY', title: 'Serum chưa đủ hồ sơ', price: 350000,
      stockQuantity: 10, imageUrl: 'https://cdn.scanms.vn/serum.jpg',
    } as any)).rejects.toThrow(BadRequestException);

    expect(prisma.product.create).not.toHaveBeenCalled();
  });
});

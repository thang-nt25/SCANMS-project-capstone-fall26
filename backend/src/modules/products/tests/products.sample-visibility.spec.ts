import { BadRequestException } from '@nestjs/common';
import { ProductModerationStatus, UserRole } from '@prisma/client';
import { ProductsService } from '../products.service';

describe('sample policy and product approval visibility', () => {
  const productId = '00000000-0000-4000-8000-000000000030';
  const storeId = '00000000-0000-4000-8000-000000000010';
  function fixture() {
    const product = { id: productId, storeId, sku: 'SAMPLE-AUDIT', title: 'Áo mẫu', description: 'Mô tả đã duyệt', price: 250000,
      moderationStatus: ProductModerationStatus.APPROVED, isActive: true, sampleGrantedCount: 0, mediaAssets: [],
      store: { id: storeId, ownerId: 'shop-owner', isVerified: true, onboardingStatus: 'VERIFIED' } };
    const prisma: any = {
      product: { findUnique: jest.fn().mockResolvedValue(product), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...product, ...data })) },
      mediaAsset: { findMany: jest.fn().mockResolvedValue([]) },
      productVariant: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 4 }) },
    };
    prisma.$transaction = jest.fn((callback: (tx: any) => Promise<any>) => callback(prisma));
    const service = new ProductsService(prisma, {} as any, { delPrefix: jest.fn() } as any);
    return { service, prisma };
  }
  it('keeps approval and active state when the Shop only enables samples and quota', async () => {
    const { service, prisma } = fixture();
    const result = await service.update('shop-owner', UserRole.SHOP_MANAGER, productId, { sampleEnabled: true, sampleQuota: 2 });
    expect(result.requiresModeration).toBe(false);
    expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: productId }, data: expect.objectContaining({ sampleEnabled: true }) });
    expect(prisma.product.update.mock.calls[0][0].data).not.toHaveProperty('moderationStatus');
    expect(prisma.product.update.mock.calls[0][0].data).not.toHaveProperty('isActive');
  });
  it('still requires approval when real description changes accompany a sample-policy edit', async () => {
    const { service, prisma } = fixture();
    const result = await service.update('shop-owner', UserRole.SHOP_MANAGER, productId, { sampleEnabled: true, sampleQuota: 2, description: 'Nội dung mới' });
    expect(result.requiresModeration).toBe(true);
    expect(prisma.product.update.mock.calls[0][0].data).toMatchObject({ moderationStatus: 'DRAFT', isActive: false });
  });
  it('never exposes draft products to a KOL just because sample policy is enabled', async () => {
    const { service, prisma } = fixture();
    await service.findAll({ storeId }, { id: 'kol-user', role: UserRole.COLLABORATOR });
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      storeId, moderationStatus: 'APPROVED', isActive: true,
    }) }));
  });
  it('sets every active SKU to zero with a parent stock edit', async () => {
    const { service, prisma } = fixture();
    prisma.productVariant.findMany.mockResolvedValue(Array.from({ length: 4 }, () => ({ stockQuantity: 51 })));
    await service.update('shop-owner', UserRole.SHOP_MANAGER, productId, { stockQuantity: 0 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stockQuantity: 0 }) }));
    expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
      where: { productId, isActive: true },
      data: { stockQuantity: 0 },
    });
  });
  it('rejects an ambiguous parent stock edit when SKUs have different quantities', async () => {
    const { service, prisma } = fixture();
    prisma.productVariant.findMany.mockResolvedValue([{ stockQuantity: 51 }, { stockQuantity: 51 }]);
    await expect(service.update('shop-owner', UserRole.SHOP_MANAGER, productId, { stockQuantity: 100 }))
      .rejects.toThrow(BadRequestException);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

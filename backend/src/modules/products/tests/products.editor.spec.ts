import { UserRole } from '@prisma/client';
import { ProductsService } from '../products.service';

describe('Atomic product editor', () => {
  let product: any;
  let conflict: boolean;
  let tx: any;
  let prisma: any;
  let cache: any;
  let service: ProductsService;
  const dto = { title: 'Updated product', stockQuantity: 5, variants: [{
    sku: 'NEW-SKU', name: 'Blue', attributes: { color: 'Blue' }, price: 100000,
    stockQuantity: 5, imageUrl: 'https://example.com/blue.jpg',
  }] };

  beforeEach(() => {
    product = { id: 'p1', title: 'Original', price: 100000, storeId: 's1',
      isDeleted: false, moderationStatus: 'APPROVED', sampleGrantedCount: 0, variants: [], mediaAssets: [],
      store: { ownerId: 'owner', isVerified: true, onboardingStatus: 'VERIFIED' } };
    conflict = false;
    tx = {
      $queryRaw: jest.fn(async () => []),
      productPricePromotion: { count: jest.fn(async () => 0) },
      product: {
        findUnique: jest.fn(async () => structuredClone(product)),
        findUniqueOrThrow: jest.fn(async () => structuredClone(product)),
        findFirst: jest.fn(async () => structuredClone(product)),
        update: jest.fn(async ({ data }) => Object.assign(product, data)),
      },
      mediaAsset: { findMany: jest.fn(async () => []) },
      productVariant: {
        findMany: jest.fn(async () => conflict ? [{ sku: 'NEW-SKU' }] : []),
        create: jest.fn(async ({ data }) => ({ id: 'new-id', ...data })),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
    };
    prisma = { $transaction: jest.fn(async (callback) => {
      const before = structuredClone(product);
      try { return await callback(tx); }
      catch (error) { product = before; throw error; }
    }) };
    cache = { delPrefix: jest.fn(async () => {}) };
    service = new ProductsService(prisma, {} as any, cache);
  });

  it('persists product and SKUs through one transaction and invalidates cache after success', async () => {
    const result = await service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', dto);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.update).toHaveBeenCalled();
    expect(tx.productVariant.create).toHaveBeenCalled();
    expect(product.title).toBe('Updated product');
    expect(result.requiresModeration).toBe(true);
    expect(cache.delPrefix).toHaveBeenCalled();
  });

  it('rolls back the product when a variant SKU conflicts, and does not invalidate cache', async () => {
    conflict = true;
    await expect(service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', dto)).rejects.toThrow('SKU');
    expect(tx.product.update).toHaveBeenCalled();
    expect(product.title).toBe('Original');
    expect(product.moderationStatus).toBe('APPROVED');
    expect(cache.delPrefix).not.toHaveBeenCalled();
  });

  it('saves a product group independently of the locked store industry and requires review', async () => {
    Object.assign(product, { categoryName: 'Mỹ phẩm & Chăm sóc da', productGroup: null });
    const result = await service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', { productGroup: '  Serum  ' });
    expect(product.productGroup).toBe('Serum');
    expect(product.categoryName).toBe('Mỹ phẩm & Chăm sóc da');
    expect(result.requiresModeration).toBe(true);
  });

  it('preserves an existing group when an older client omits it, and allows explicitly clearing it', async () => {
    product.productGroup = 'Serum';
    await service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', { origin: 'Việt Nam' });
    expect(product.productGroup).toBe('Serum');
    await service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', { productGroup: '' });
    expect(product.productGroup).toBeNull();
  });

  it('rejects activating an incomplete legacy parcel before any product write', async () => {
    await expect(service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', {
      isActive: true,
    })).rejects.toThrow('đóng gói');
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it('rejects clearing a shipping measurement on a live product', async () => {
    Object.assign(product, { isActive: true, packageWeight: 150,
      packageLength: 10, packageWidth: 8, packageHeight: 15 });
    await expect(service.updateEditor('owner', UserRole.SHOP_MANAGER, 'p1', {
      packageHeight: null,
    } as any)).rejects.toThrow('đóng gói');
    expect(tx.product.update).not.toHaveBeenCalled();
  });
});

import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('Public purchasable stock', () => {
  const fixture = () => ({
    id: 'product', sku: 'QA-STOCK', stockQuantity: 999, isActive: true, isDeleted: false, moderationStatus: 'APPROVED',
    store: { isActive: true, isDeleted: false, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true } },
    variants: [{ id: 'small', stockQuantity: 20, isActive: true }, { id: 'large', stockQuantity: 15, isActive: true }, { id: 'hidden', stockQuantity: 100, isActive: false }],
  });
  function setup(row: object | null) {
    const prisma = { product: { findFirst: jest.fn().mockResolvedValue(row) } };
    return new ProductsService(prisma as never, {} as never, {} as never);
  }
  it('uses active variant quantities rather than stale parent stock', async () => {
    const result = await setup(fixture()).getRealtimeStock('QA-STOCK');
    expect(result.stockQuantity).toBe(35);
    expect(result.variants).toEqual([{ id: 'small', stockQuantity: 20, isActive: true }, { id: 'large', stockQuantity: 15, isActive: true }, { id: 'hidden', stockQuantity: 0, isActive: false }]);
  });
  it('reports no purchasable stock when the product is inactive', async () => {
    const result = await setup({ ...fixture(), isActive: false }).getRealtimeStock('QA-STOCK');
    expect(result).toMatchObject({ stockQuantity: 0, inStock: false, status: 'OUT_OF_STOCK' });
    expect(result.variants.every(variant => variant.stockQuantity === 0)).toBe(true);
  });
  it('supports a product without variants', async () => {
    expect(await setup({ ...fixture(), variants: [], stockQuantity: 3 }).getRealtimeStock('QA-STOCK'))
      .toMatchObject({ stockQuantity: 3, inStock: true, status: 'LOW_STOCK', variants: [] });
  });
  it.each([null, { ...fixture(), moderationStatus: 'PENDING' }, { ...fixture(), store: { ...fixture().store, isVerified: false } }])(
    'does not expose stock for unpublished products or ineligible stores', async row => {
      await expect(setup(row).getRealtimeStock('QA-STOCK')).rejects.toThrow(NotFoundException);
    },
  );
});

import { ConflictException } from '@nestjs/common';
import {
  assertProductIdentity,
  productNameSimilarity,
} from '../product-identity.policy';

describe('Product catalogue identity', () => {
  it('recognizes reordered Vietnamese names without claiming semantic AI', () => {
    expect(
      productNameSimilarity(
        'Serum Vitamin C dưỡng sáng 30ml',
        'Serum dưỡng sáng Vitamin C 30ml',
      ),
    ).toBe(100);
    expect(
      productNameSimilarity('Serum dưỡng da 30ml', 'Nồi chiên không dầu 5L'),
    ).toBeLessThan(80);
    expect(productNameSimilarity('', '')).toBe(0);
  });
  it('locks a shared barcode and scoped SKU before checking identity', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      product: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await assertProductIdentity(tx, {
      storeId: 'store',
      sku: ' serum-30 ',
      barcode: '8938500123456',
      id: 'edited',
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'edited' },
          OR: [
            {
              storeId: 'store',
              sku: { equals: 'SERUM-30', mode: 'insensitive' },
            },
            { barcode: '8938500123456' },
          ],
        }),
      }),
    );
  });
  it('rejects the same physical barcode even when the SKU differs', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      product: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ sku: 'OTHER', barcode: '8938500123456' }),
      },
    };
    await expect(
      assertProductIdentity(tx, {
        storeId: 'store',
        sku: 'NEW',
        barcode: '8938500123456',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

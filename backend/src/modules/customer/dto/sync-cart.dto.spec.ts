import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SyncCustomerCartDto } from './sync-cart.dto';

describe('Central cart input validation', () => {
  const productV4 = '550e8400-e29b-41d4-a716-446655440000';
  const variantV4 = '550e8400-e29b-41d4-a716-446655440001';
  const productV5 = '550e8400-e29b-51d4-a716-446655440000';
  const variantV5 = '550e8400-e29b-51d4-a716-446655440001';

  async function errorsFor(items: unknown[], extra: object = {}) {
    return validate(plainToInstance(SyncCustomerCartDto, { items, ...extra }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('accepts database-generated UUID v4 products/variants', async () => {
    await expect(
      errorsFor([{ productId: productV4, variantId: variantV4, quantity: 1 }]),
    ).resolves.toHaveLength(0);
  });

  it('accepts deterministic seed UUID v5 products/variants', async () => {
    await expect(
      errorsFor([{ productId: productV5, variantId: variantV5, quantity: 1 }]),
    ).resolves.toHaveLength(0);
  });

  it('accepts a base product without a variant and allows an empty cart', async () => {
    await expect(
      errorsFor([{ productId: productV5, quantity: 1 }]),
    ).resolves.toHaveLength(0);
    await expect(errorsFor([])).resolves.toHaveLength(0);
  });

  it.each(['not-a-uuid', 'base', 'PRODUCT-SKU-1'])(
    'rejects malformed IDs %s',
    async (id) => {
      expect(
        (await errorsFor([{ productId: id, quantity: 1 }])).length,
      ).toBeGreaterThan(0);
      expect(
        (
          await errorsFor([
            { productId: productV4, variantId: id, quantity: 1 },
          ])
        ).length,
      ).toBeGreaterThan(0);
    },
  );

  it.each([0, -1, 1.5, 1000])(
    'rejects invalid quantity %p',
    async (quantity) => {
      expect(
        (await errorsFor([{ productId: productV4, quantity }])).length,
      ).toBeGreaterThan(0);
    },
  );

  it('rejects a forged cart owner at both request and item levels', async () => {
    expect((await errorsFor([], { userId: productV4 })).length).toBeGreaterThan(
      0,
    );
    expect(
      (
        await errorsFor([
          { productId: productV4, quantity: 1, userId: productV4 },
        ])
      ).length,
    ).toBeGreaterThan(0);
  });
});

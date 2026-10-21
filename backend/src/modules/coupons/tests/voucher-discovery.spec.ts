import {
  voucherMatchesProduct,
  voucherProductWhere,
} from '../voucher-discovery';
import { CouponsService } from '../coupons.service';
import { NotFoundException } from '@nestjs/common';

describe('Voucher discovery and immediate use', () => {
  const product = { id: 'product-1', categoryName: 'Chăm sóc da' };
  const base = {
    id: 'voucher-1',
    storeId: 'shop-1',
    scopeType: 'STORE_WIDE',
    couponProducts: [],
    couponCategories: [],
    campaign: null,
    liveSession: null,
  };
  it('allows store-wide vouchers', () =>
    expect(voucherMatchesProduct(base, product)).toBe(true));
  it('does not advertise a product-restricted voucher on another product', () => {
    const coupon = {
      ...base,
      scopeType: 'PRODUCTS',
      couponProducts: [{ product: { id: 'product-2' } }],
    };
    expect(voucherMatchesProduct(coupon, product)).toBe(false);
    expect(voucherMatchesProduct(coupon, { id: 'product-2' })).toBe(true);
  });
  it('matches category case-insensitively and rejects missing categories', () => {
    const coupon = {
      ...base,
      scopeType: 'CATEGORIES',
      couponCategories: [{ categoryName: 'CHĂM SÓC DA' }],
    };
    expect(voucherMatchesProduct(coupon, product)).toBe(true);
    expect(voucherMatchesProduct(coupon, { id: product.id })).toBe(false);
  });
  it('honors campaign product restrictions and empty campaign-wide scope', () => {
    expect(
      voucherMatchesProduct({ ...base, scopeType: 'CAMPAIGN' }, product),
    ).toBe(false);
    expect(
      voucherMatchesProduct(
        { ...base, scopeType: 'CAMPAIGN', campaign: { campaignProducts: [] } },
        product,
      ),
    ).toBe(true);
    expect(
      voucherMatchesProduct(
        {
          ...base,
          scopeType: 'CAMPAIGN',
          campaign: { campaignProducts: [{ productId: 'other' }] },
        },
        product,
      ),
    ).toBe(false);
  });
  it('intersects live-session products with ordinary voucher scope', () => {
    expect(
      voucherMatchesProduct(
        { ...base, liveSession: { products: [{ productId: 'other' }] } },
        product,
      ),
    ).toBe(false);
    expect(
      voucherMatchesProduct(
        { ...base, liveSession: { products: [{ productId: product.id }] } },
        product,
      ),
    ).toBe(true);
  });
  it('public product discovery excludes deleted, inactive and unapproved products', () => {
    expect(voucherProductWhere(base)).toMatchObject({
      storeId: 'shop-1',
      isActive: true,
      isDeleted: false,
      moderationStatus: 'APPROVED',
      store: {
        isActive: true,
        isDeleted: false,
        owner: { isActive: true, isDeleted: false },
      },
    });
  });
  it('uses coupon relations instead of trusting product IDs from the browser', () => {
    expect(
      voucherProductWhere({ ...base, scopeType: 'PRODUCTS' }),
    ).toMatchObject({ couponProducts: { some: { couponId: base.id } } });
  });
  it('empty category and unbound campaign scopes return no products', () => {
    expect(
      voucherProductWhere({ ...base, scopeType: 'CATEGORIES' }),
    ).toMatchObject({ id: { in: [] } });
    expect(
      voucherProductWhere({ ...base, scopeType: 'CAMPAIGN' }),
    ).toMatchObject({ id: { in: [] } });
  });
  it('applies the live session restriction to the product query', () => {
    expect(
      voucherProductWhere({ ...base, liveSessionId: 'live-1' }),
    ).toMatchObject({ liveSessionProducts: { some: { sessionId: 'live-1' } } });
  });
  it('refuses expired vouchers before exposing eligible products', async () => {
    const prisma = { product: { findMany: jest.fn() } };
    const service = new CouponsService(prisma as any, {} as any);
    jest.spyOn(service, 'getPublicAvailableCoupons').mockResolvedValue([]);
    await expect(service.getVoucherProducts(base.id)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
  it('immediate use does not require a saved-coupon record', async () => {
    const prisma = {
      coupon: { findUnique: jest.fn().mockResolvedValue(base) },
      product: { findMany: jest.fn().mockResolvedValue([product]) },
    };
    const service = new CouponsService(prisma as any, {} as any);
    jest
      .spyOn(service, 'getPublicAvailableCoupons')
      .mockResolvedValue([{ id: base.id, code: 'DEAL30' }] as any);
    expect(await service.getVoucherProducts(base.id)).toMatchObject({
      voucher: { code: 'DEAL30' },
      products: [product],
    });
  });
  it('filters out exhausted budgets before displaying product vouchers', async () => {
    const prisma = {
      coupon: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              ...base,
              usageLimitTotal: null,
              budgetTotal: 100,
              budgetUsed: 100,
            },
          ]),
      },
    };
    const service = new CouponsService(prisma as any, {} as any);
    expect(await service.getPublicStoreCoupons('shop-1')).toEqual([]);
  });
  it('paginates eligible products without returning the lookahead row', async () => {
    const prisma = {
      coupon: { findUnique: jest.fn().mockResolvedValue(base) },
      product: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            Array.from({ length: 25 }, (_, index) => ({ id: String(index) })),
          ),
      },
    };
    const service = new CouponsService(prisma as any, {} as any);
    jest
      .spyOn(service, 'getPublicAvailableCoupons')
      .mockResolvedValue([{ id: base.id }] as any);
    const result = await service.getVoucherProducts(base.id, 2);
    expect(result.products).toHaveLength(24);
    expect(result.hasMore).toBe(true);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 24, take: 25 }),
    );
  });
  it.each([0, -1, 1.5, 10001])(
    'rejects invalid discovery page %s',
    async (page) => {
      const service = new CouponsService({} as any, {} as any);
      await expect(service.getVoucherProducts(base.id, page)).rejects.toThrow(
        'Trang sản phẩm không hợp lệ.',
      );
    },
  );
  it('rejects products outside the requested shop before fetching vouchers', async () => {
    const prisma = {
      product: { findFirst: jest.fn().mockResolvedValue(null) },
      coupon: { findMany: jest.fn() },
    };
    const service = new CouponsService(prisma as any, {} as any);
    await expect(
      service.getPublicStoreCoupons('shop-1', 'foreign-product'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.coupon.findMany).not.toHaveBeenCalled();
  });
});

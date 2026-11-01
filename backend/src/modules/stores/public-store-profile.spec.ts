import { StoresService } from './stores.service';
import { publicBusinessProfile } from './public-store-profile';
import { publicChatPerformance } from './shop-response.query';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateStoreDto } from './dto/update-store.dto';

describe('Public storefront profile', () => {
  it('validates the optional public company name and supports clearing a legacy name', async () => {
    expect(
      await validate(
        plainToInstance(UpdateStoreDto, { companyName: 'A'.repeat(201) }),
      ),
    ).toHaveLength(1);
    expect(
      await validate(plainToInstance(UpdateStoreDto, { companyName: 123 })),
    ).not.toHaveLength(0);
    expect(
      await validate(plainToInstance(UpdateStoreDto, { companyName: '' })),
    ).toHaveLength(0);
    expect(
      publicBusinessProfile({ businessName: 'Legacy company' }, null)
        .companyName,
    ).toBe('Legacy company');
    expect(
      publicBusinessProfile(
        { companyName: null, businessName: 'Legacy company' },
        null,
      ).companyName,
    ).toBeNull();
  });

  it('updates only the current shop public name while preserving private onboarding details', async () => {
    const store = {
      id: 'shop',
      slug: 'shop',
      onboardingData: {
        taxCode: 'PRIVATE_TAX',
        payoutBankAccountNumber: 'PRIVATE_BANK',
      },
    };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ storeId: 'shop' }) },
      store: {
        findFirst: jest.fn().mockResolvedValue(store),
        update: jest.fn().mockResolvedValue(store),
      },
    };
    const cache: any = { del: jest.fn() };
    const service = new StoresService(prisma, cache);
    await service.updateMyStore('owner', {
      companyName: '  Registered Company  ',
    });
    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shop' },
        data: expect.objectContaining({
          onboardingData: {
            ...store.onboardingData,
            companyName: 'Registered Company',
          },
        }),
      }),
    );
    expect(cache.del).toHaveBeenCalledWith('stores:public:id:v2:shop');
    await service.updateMyStore('owner', { companyName: '' });
    expect(prisma.store.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingData: { ...store.onboardingData, companyName: null },
        }),
      }),
    );
  });
  it('returns real counts and allowlisted company/location fields without leaking KYC or banking data', async () => {
    const prisma: any = {
      store: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'shop',
          slug: 'shop',
          name: 'Test Shop',
          createdAt: new Date(),
          _count: { products: 3, follows: 7 },
          onboardingData: {
            companyName: 'Registered Company',
            warehouseAddress: '123 Private Street, Ward A, District B, City C',
            payoutBankAccountNumber: 'PRIVATE_BANK',
            taxCode: 'PRIVATE_TAX',
          },
          returnWarehouse: { phone: 'PRIVATE_PHONE' },
        }),
      },
      product: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ categoryName: 'Electronics' }]),
      },
      productReview: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _count: { rating: 0 }, _avg: { rating: null } }),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { eligibleCount: 5n, respondedCount: 2n, averageMinutes: 4 },
        ]),
    };
    const result = await new StoresService(prisma).getPublicStoreById('shop');
    expect(result).toMatchObject({
      productCount: 3,
      followerCount: 7,
      companyName: 'Registered Company',
      location: 'Ward A, District B, City C',
      rating: null,
      reviewCount: 0,
      chatPerformance: { responseRate: 40, averageResponseMinutes: 4 },
    });
    for (const value of [
      'PRIVATE_BANK',
      'PRIVATE_TAX',
      'PRIVATE_PHONE',
      '123 Private Street',
    ])
      expect(JSON.stringify(result)).not.toContain(value);
    expect(result).not.toHaveProperty('onboardingData');
    expect(result).not.toHaveProperty('returnWarehouse');
    expect(result).not.toHaveProperty('_count');
  });
  it('does not invent a legal company, rating or response rate when no evidence exists', () => {
    expect(publicBusinessProfile(null, null)).toEqual({
      companyName: null,
      location: null,
    });
    expect(
      publicBusinessProfile(
        { warehouseAddress: 'Unstructured private address' },
        null,
      ).location,
    ).toBeNull();
    expect(
      publicChatPerformance({
        eligibleCount: 0n,
        respondedCount: 0n,
        averageMinutes: null,
      }),
    ).toMatchObject({
      responseRate: null,
      averageResponseMinutes: null,
      conversationCount: 0,
    });
  });
  it('invalidates both public ID and slug caches after following', async () => {
    const cache: any = { del: jest.fn() };
    const prisma: any = { storeFollow: { upsert: jest.fn() } };
    const service = new StoresService(prisma, cache);
    jest
      .spyOn(service, 'getPublicStoreById')
      .mockResolvedValue({ id: 'shop', slug: 'test-shop' } as any);
    await service.setFollow('shop', 'customer', true);
    expect(cache.del).toHaveBeenCalledWith('stores:public:id:v2:shop');
    expect(cache.del).toHaveBeenCalledWith('stores:public:id:v2:test-shop');
  });
});

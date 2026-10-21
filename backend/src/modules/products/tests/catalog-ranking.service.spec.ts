import { ProductsService } from '../products.service';
import { validate } from 'class-validator';
import { TrackAnalyticsEventDto, LandingAnalyticsEvent } from '../dto/track-event.dto';

describe('public catalogue real metrics', () => {
  it.each(['add_to_cart', 'order_complete'])('accepts the product page event %s', async event => {
    const dto = Object.assign(new TrackAnalyticsEventDto(), {
      eventId: '00000000-0000-4000-8000-000000000001', event,
      productId: '96b1caac-3cf2-5e06-aeed-b41cf7aaf8ac',
    });
    expect(await validate(dto)).toHaveLength(0);
    dto.event = 'unsupported_event' as any;
    expect((await validate(dto)).map(error => error.property)).toContain('event');
  });
  it('preserves database ranking and serializes counts without exposing commission to buyers', async () => {
    const prisma: any = {
      product: { count: jest.fn().mockResolvedValue(2), findMany: jest.fn().mockResolvedValue([
        { id: 'lower', title: 'Lower', createdAt: new Date('2026-01-01') },
        { id: 'higher', title: 'Higher', createdAt: new Date('2026-01-02') },
      ]) },
      $queryRaw: jest.fn().mockResolvedValue([
        { id: 'higher', soldCount: 7n, viewCount: 3n }, { id: 'lower', soldCount: 0n, viewCount: 0n },
      ]),
    };
    const service = new ProductsService(prisma, {} as any, {} as any);
    const result = await service.findPublicMarketplace({ sortBy: 'sales', limit: 2 });
    expect(result.items.map(item => item.id)).toEqual(['higher', 'lower']);
    expect(result.items[0]).toMatchObject({ soldCount: 7, viewCount: 3 });
    expect(result.items[1]).toMatchObject({ soldCount: 0, viewCount: 0 });
    expect(() => JSON.stringify(result)).not.toThrow();
    const query = prisma.product.findMany.mock.calls[0][0];
    expect(query.select.createdAt).toBe(true);
    expect(query.select).not.toHaveProperty('customCommissionRate');
    expect(query.select.store.select).not.toHaveProperty('defaultCommissionRate');
    expect(result.pagination).toMatchObject({ total: 2, totalPages: 1 });
  });
  it('accepts real seed product/store UUIDs while preserving the unique v4 event ID requirement', async () => {
    const dto = Object.assign(new TrackAnalyticsEventDto(), {
      eventId: '00000000-0000-4000-8000-000000000001', event: LandingAnalyticsEvent.PAGE_VIEW,
      productId: '96b1caac-3cf2-5e06-aeed-b41cf7aaf8ac', storeId: '066a89f6-36c2-53da-b63b-bd7ce1afb2cb',
    });
    expect(await validate(dto)).toHaveLength(0);
    dto.productId = 'not-a-product-id';
    expect((await validate(dto)).map(error => error.property)).toContain('productId');
    dto.eventId = dto.storeId!;
    expect((await validate(dto)).map(error => error.property)).toContain('eventId');
  });
});

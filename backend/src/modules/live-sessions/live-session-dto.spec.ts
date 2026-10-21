import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLiveSessionDto, GenerateLiveLinkCodeDto } from './dto/create-live-session.dto';

describe('Live session UUID validation', () => {
  const v5 = '2f67001b-09a5-5958-85fd-5f401831c871';
  const v4 = 'c06131c0-d692-49f9-857d-8fc6b8df52d6';
  it.each([v4, v5])('accepts valid shop and creator identifiers: %s', async id => {
    const errors = await validate(plainToInstance(GenerateLiveLinkCodeDto, { storeId: id, creatorId: id }));
    expect(errors).toHaveLength(0);
  });
  it('still rejects malformed identifiers', async () => {
    const errors = await validate(plainToInstance(GenerateLiveLinkCodeDto, { storeId: 'not-an-id', creatorId: 'invalid' }));
    expect(errors.map(e => e.property)).toEqual(expect.arrayContaining(['storeId', 'creatorId']));
  });
  it('accepts fixture UUIDs for products and variants when creating a session', async () => {
    const errors = await validate(plainToInstance(CreateLiveSessionDto, {
      storeId: v5, creatorId: v5, productIds: [v5], variantIds: [v5], title: 'Sale Live',
      platform: 'SCANMS', liveUrl: 'http://localhost:5173/live/abcdEFGH1234',
      startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(),
      discountType: 'PERCENTAGE', discountValue: 10, usageLimitTotal: 10, usageLimitPerCustomer: 1, commissionRate: 2,
    }));
    expect(errors).toHaveLength(0);
  });
});

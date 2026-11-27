import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicCouponsController } from '../coupons.controller';
import { CouponsService } from '../coupons.service';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';

const seedId = '2f67001b-09a5-5958-85fd-5f401831c871';
const v4Id = '00000000-0000-4000-8000-000000000001';

describe('public checkout UUID validation', () => {
  let app: INestApplication;
  const service = {
    getPublicStoreCoupons: jest.fn().mockResolvedValue([]),
    validateCoupon: jest.fn().mockResolvedValue({ discountAmount: 10000 }),
    getEligibleProductCoupons: jest.fn().mockResolvedValue([]),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicCouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
    }).overrideGuard(OptionalJwtAuthGuard).useValue({ canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      if (req.headers.authorization === 'Bearer fixture-customer') req.user = { id: v4Id };
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => jest.clearAllMocks());

  it.each([seedId, v4Id])('returns an empty legacy list for a valid store UUID: %s', async id => {
    await request(app.getHttpServer()).get(`/coupons/stores/${id}/available`).expect(200, []);
    expect(service.getPublicStoreCoupons).not.toHaveBeenCalled();
  });
  it('rejects malformed store IDs before querying vouchers', async () => {
    await request(app.getHttpServer()).get('/coupons/stores/not-a-uuid/available').expect(400);
    expect(service.getPublicStoreCoupons).not.toHaveBeenCalled();
  });
  it.each(['/coupons/available', `/coupons/store/${seedId}`])(
    'returns no codes on the legacy route %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect('Cache-Control', 'private, no-store').expect(200, []);
    },
  );
  it('does not reveal a code from the coupon ID', async () => {
    await request(app.getHttpServer()).get(`/coupons/${seedId}/products`).expect(404);
  });
  it('accepts seeded product, variant and store IDs during voucher validation', async () => {
    await request(app.getHttpServer()).post('/coupons/validate').send({
      code: 'TEST10', storeId: seedId,
      items: [{ productId: seedId, variantId: seedId, storeId: seedId, quantity: 1 }],
    }).expect(200);
    expect(service.validateCoupon).toHaveBeenCalledTimes(1);
  });
  it('still rejects invalid item IDs', async () => {
    await request(app.getHttpServer()).post('/coupons/validate').send({
      code: 'TEST10', items: [{ productId: 'invalid', quantity: 1 }],
    }).expect(400);
    expect(service.validateCoupon).not.toHaveBeenCalled();
  });
  it('returns no discoverable codes for a signed-in customer and disables shared caching', async () => {
    const result = await request(app.getHttpServer()).get(`/coupons/stores/${seedId}/product-eligible`)
      .query({ productId: seedId, variantId: seedId, quantity: 2 }).set('Authorization', 'Bearer fixture-customer').expect(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(result.body).toEqual([]);
    expect(service.getEligibleProductCoupons).not.toHaveBeenCalled();
  });
  it.each([{ quantity: 0 }, { quantity: 1.5 }, { customerId: v4Id }, { variantId: 'invalid' }])('rejects invalid or forged suggestion context: %j', async query => {
    await request(app.getHttpServer()).get(`/coupons/stores/${seedId}/product-eligible`).query({ productId: seedId, ...query }).expect(400);
    expect(service.getEligibleProductCoupons).not.toHaveBeenCalled();
  });
});

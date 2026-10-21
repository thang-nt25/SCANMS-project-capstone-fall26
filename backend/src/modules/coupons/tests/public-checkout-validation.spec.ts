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

  it.each([seedId, v4Id])('loads vouchers for an existing UUID version: %s', async id => {
    await request(app.getHttpServer()).get(`/coupons/stores/${id}/available`).expect(200);
    expect(service.getPublicStoreCoupons).toHaveBeenCalledWith(id);
  });
  it('rejects malformed store IDs before querying vouchers', async () => {
    await request(app.getHttpServer()).get('/coupons/stores/not-a-uuid/available').expect(400);
    expect(service.getPublicStoreCoupons).not.toHaveBeenCalled();
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
  it('uses verified session identity for contextual suggestions and disables shared caching', async () => {
    const result = await request(app.getHttpServer()).get(`/coupons/stores/${seedId}/product-eligible`)
      .query({ productId: seedId, variantId: seedId, quantity: 2 }).set('Authorization', 'Bearer fixture-customer').expect(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(service.getEligibleProductCoupons).toHaveBeenCalledWith(seedId, expect.objectContaining({ productId: seedId, quantity: 2 }), v4Id, expect.any(String));
  });
  it.each([{ quantity: 0 }, { quantity: 1.5 }, { customerId: v4Id }, { variantId: 'invalid' }])('rejects invalid or forged suggestion context: %j', async query => {
    await request(app.getHttpServer()).get(`/coupons/stores/${seedId}/product-eligible`).query({ productId: seedId, ...query }).expect(400);
    expect(service.getEligibleProductCoupons).not.toHaveBeenCalled();
  });
});

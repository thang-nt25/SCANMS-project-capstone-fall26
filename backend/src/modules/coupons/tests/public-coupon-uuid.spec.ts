import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PublicCouponsController } from '../coupons.controller';
import { CouponsService } from '../coupons.service';

import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';

describe('Public voucher discovery and redemption UUID compatibility', () => {
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const productId = '12345678-1234-5123-8123-123456789abc';
  const variantId = '12345678-1234-5123-8123-123456789abd';
  let app: INestApplication;
  const service = {
    getPublicStoreCoupons: jest.fn().mockResolvedValue([{ code: 'SHOP10K97' }]),
    validateCoupon: jest.fn().mockResolvedValue({ valid: true, discountAmount: 25000 }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicCouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => jest.clearAllMocks());

  it('publishes vouchers for seeded UUID v5 shops without login', async () => {
    const response = await request(app.getHttpServer()).get(`/coupons/stores/${storeId}/available?productId=${productId}`).expect(200);
    expect(response.body).toEqual([{ code: 'SHOP10K97' }]);
    expect(service.getPublicStoreCoupons).toHaveBeenCalledWith(storeId, productId);
  });
  it('continues supporting ordinary UUID v4 shops', async () => {
    await request(app.getHttpServer()).get('/coupons/stores/12345678-1234-4123-8123-123456789abc/available').expect(200);
  });
  it('rejects malformed shop IDs before calling the service', async () => {
    await request(app.getHttpServer()).get('/coupons/stores/not-a-uuid/available').expect(400);
    expect(service.getPublicStoreCoupons).not.toHaveBeenCalled();
  });
  it('validates UUID v5 product, shop and variant IDs when applying a code', async () => {
    await request(app.getHttpServer()).post('/coupons/validate').send({
      code: 'SHOP10K97', storeId,
      items: [{ productId, variantId, storeId, quantity: 1 }],
    }).expect(200);
    expect(service.validateCoupon).toHaveBeenCalled();
  });
  it('still rejects malformed product IDs in coupon validation', async () => {
    await request(app.getHttpServer()).post('/coupons/validate').send({
      code: 'SHOP10K97', storeId, items: [{ productId: 'invalid', quantity: 1 }],
    }).expect(400);
    expect(service.validateCoupon).not.toHaveBeenCalled();
  });
});

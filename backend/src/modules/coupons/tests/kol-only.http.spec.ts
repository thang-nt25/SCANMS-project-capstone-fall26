import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PublicCouponsController } from '../coupons.controller';
import { CouponsService } from '../coupons.service';

/** Exercise actual routes, DTOs and role guards without connecting to the group DB. */
describe('KOL-only coupon HTTP compatibility', () => {
  let app: INestApplication;
  let role: UserRole = UserRole.CUSTOMER;
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const service = new CouponsService(
    new Proxy(
      {},
      {
        get() {
          throw new Error('Retired coupon routes must not access the database');
        },
      },
    ) as never,
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicCouponsController],
      providers: [{ provide: CouponsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = { id, role };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    role = UserRole.CUSTOMER;
  });

  it('does not expose the old saved inventory', async () => {
    for (const path of [
      '/coupons/saved',
      '/coupons/saved/details',
      '/coupons/saved/expired',
    ])
      await request(app.getHttpServer()).get(path).expect(200, []);
  });
  it('returns 410 for customer save/remove without writing records', async () => {
    await request(app.getHttpServer()).post(`/coupons/saved/${id}`).expect(410);
    await request(app.getHttpServer())
      .delete(`/coupons/saved/${id}`)
      .expect(410);
  });
  it('keeps the Customer role guard on compatibility routes', async () => {
    role = UserRole.COLLABORATOR;
    await request(app.getHttpServer()).get('/coupons/saved').expect(403);
    await request(app.getHttpServer()).post(`/coupons/saved/${id}`).expect(403);
  });
  it('rejects retail stacking through the old public API', async () => {
    await request(app.getHttpServer())
      .post('/coupons/preview-stacked')
      .send({
        code: 'LEGACY10',
        storeId: id,
        benefitType: 'GOODS',
        goodsSubtotal: 200000,
        shippingFee: 25000,
        shopDiscount: 0,
      })
      .expect(410);
  });
});

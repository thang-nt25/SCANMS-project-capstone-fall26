import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { SponsorshipController } from './sponsorship/sponsorship.controller';
import { SponsorshipService } from './sponsorship/sponsorship.service';
import { ProductsController } from '../products/products.controller';
import { ProductsService } from '../products/products.service';
import { CacheService } from '../../core/cache/cache.service';
import { GhnService } from '../shipping/ghn.service';
import { LiveSessionsController } from '../live-sessions/live-sessions.controller';
import { LiveSessionsService } from '../live-sessions/live-sessions.service';
import { LiveGovernanceService } from '../live-sessions/live-governance.service';
import { buildDataset } from '../../../prisma/seeds/build-dataset';
import { applyDataset } from '../../../prisma/seeds/seed.database';
import { parseDatabaseTarget } from '../../../prisma/seeds/seed.config';
import { buildMarketplaceDemoPlan } from '../../../prisma/seeds/marketplace.seed';
import { seedId } from '../../../prisma/seeds/seed.helpers';

const connectionString = process.env.SEED_TEST_DATABASE_URL;
(connectionString ? describe : describe.skip)(
  'Quy marketplace APIs with Thinh seed fixtures',
  () => {
    let app: INestApplication;
    let prisma: PrismaClient;
    let pool: Pool;
    let ownerToken: string;
    let customerToken: string;
    let shopTwoToken: string;
    let adminToken: string;
    const context = {
      referenceDate: new Date(),
      frontendUrl: 'http://localhost:5173',
      passwordHash: 'test-only',
      shipping: [],
    };
    const data = buildDataset(context);
    const plan = buildMarketplaceDemoPlan(data, context);
    const previousPlacements = process.env.MARKETPLACE_SPONSORED_PLACEMENTS;

    beforeAll(async () => {
      const url = new URL(connectionString!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.port !== '55433' ||
        url.pathname !== '/scanms_seed_test'
      ) {
        throw new Error(
          'Only isolated loopback scanms_seed_test on port 55433 is allowed.',
        );
      }
      const schema = `marketplace_test_${randomUUID().replace(/-/g, '')}`;
      url.searchParams.set('schema', schema);
      const target = parseDatabaseTarget(url.toString());
      pool = new Pool({
        connectionString: target.connectionString,
        max: 3,
        connectionTimeoutMillis: 10000,
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA "${schema}"`);
      await promisify(execFile)(
        process.execPath,
        [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
        {
          cwd: resolve(__dirname, '../../..'),
          windowsHide: true,
          timeout: 120000,
          env: {
            ...process.env,
            DATABASE_URL: target.connectionString,
            DIRECT_URL: target.connectionString,
          },
        },
      );
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      await applyDataset(prisma, target, data);
      const secret = 'marketplace-isolated-jwt-test-secret';
      const module = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret }),
          PassportModule.register({ defaultStrategy: 'jwt' }),
        ],
        controllers: [StoresController, LiveSessionsController, SponsorshipController, ProductsController],
        providers: [
          StoresService,
          SponsorshipService,
          ProductsService,
          { provide: CacheService, useValue: { delPrefix: jest.fn().mockResolvedValue(0) } },
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: new ConfigService({ JWT_SECRET: secret }),
          },
          { provide: PrismaService, useValue: prisma },
          // Payment/governance collaborators are deliberately not invoked by public read or pin APIs.
          {
            provide: LiveSessionsService,
            useValue: new LiveSessionsService(
              prisma as never,
              {} as never,
              {} as never,
            ),
          },
          { provide: LiveGovernanceService, useValue: {} },
        ],
      }).compile();
      app = module.createNestApplication({ logger: false });
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.init();
      const jwt = module.get(JwtService);
      ownerToken = jwt.sign({
        sub: seedId('shop-owner:0'),
        role: 'SHOP_MANAGER',
      });
      shopTwoToken = jwt.sign({
        sub: seedId('shop-owner:1'),
        role: 'SHOP_MANAGER',
      });
      customerToken = jwt.sign({ sub: seedId('customer:0'), role: 'CUSTOMER' });
      adminToken = jwt.sign({ sub: seedId('user:admin'), role: 'SYSTEM_ADMIN' });
    }, 120000);

    afterAll(async () => {
      if (previousPlacements === undefined)
        delete process.env.MARKETPLACE_SPONSORED_PLACEMENTS;
      else process.env.MARKETPLACE_SPONSORED_PLACEMENTS = previousPlacements;
      await app?.close();
      await prisma?.$disconnect();
      await pool?.end();
    });

    it('returns all 15 seed partners with actual product counts, ratings and active campaign links', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/stores/marketplace')
        .expect(200);
      expect(response.body).toHaveLength(15);
      for (const store of response.body) {
        const reviews = data.reviews.filter((review) =>
          data.products.some(
            (product) =>
              product.storeId === store.id && product.id === review.productId,
          ),
        );
        expect(store.totalProducts).toBe(2);
        expect(store.reviewCount).toBe(reviews.length);
        expect(store.rating).toBe(5);
        expect(store.activeCampaign?.id).toBe(
          data.campaigns.find((campaign) => campaign.storeId === store.id)?.id,
        );
      }
    });

    it('shows two explicitly configured demo sponsored stores; none when the configuration is empty, expired or unconfirmed', async () => {
      process.env.MARKETPLACE_SPONSORED_PLACEMENTS = JSON.stringify(
        plan.placements,
      );
      const response = await request(app.getHttpServer())
        .get('/api/stores/public/placements')
        .expect(200);
      expect(
        response.body.map((row: { store: { id: string } }) => row.store.id),
      ).toEqual(plan.placements.map((row) => row.storeId));
      expect(
        response.body.every((row: { headline: string }) =>
          row.headline.startsWith('[DEMO]'),
        ),
      ).toBe(true);
      for (const value of [
        '[]',
        JSON.stringify(
          plan.placements.map((row) => ({ ...row, paymentStatus: 'PENDING' })),
        ),
        JSON.stringify(
          plan.placements.map((row) => ({
            ...row,
            endsAt: new Date(Date.now() - 1000).toISOString(),
          })),
        ),
      ]) {
        process.env.MARKETPLACE_SPONSORED_PLACEMENTS = value;
        expect(
          (
            await request(app.getHttpServer())
              .get('/api/stores/public/placements')
              .expect(200)
          ).body,
        ).toEqual([]);
      }
    });

    it('returns no fabricated rating if approved reviews are absent', async () => {
      const ids = data.products
        .filter((row) => row.storeId === seedId('store:0'))
        .map((row) => row.id!);
      await prisma.productReview.updateMany({
        where: { productId: { in: ids } },
        data: { isApproved: false },
      });
      try {
        const response = await request(app.getHttpServer())
          .get('/api/stores/marketplace')
          .expect(200);
        expect(
          response.body.find(
            (row: { id: string }) => row.id === seedId('store:0'),
          ),
        ).toMatchObject({ rating: null, reviewCount: 0 });
      } finally {
        await prisma.productReview.updateMany({
          where: { productId: { in: ids } },
          data: { isApproved: true },
        });
      }
    });

    it('weights the shop rating by actual review count instead of averaging product averages', async () => {
      const review = data.reviews[0];
      await prisma.productReview.update({
        where: { id: review.id },
        data: { rating: 1 },
      });
      try {
        const productIds = data.products
          .filter((product) => product.storeId === seedId('store:0'))
          .map((product) => product.id!);
        const reviews = await prisma.productReview.findMany({
          where: { productId: { in: productIds }, isApproved: true },
          select: { rating: true },
        });
        const expected =
          Math.round(
            (reviews.reduce((sum, row) => sum + row.rating, 0) /
              reviews.length) *
              10,
          ) / 10;
        const response = await request(app.getHttpServer())
          .get('/api/stores/marketplace')
          .expect(200);
        expect(
          response.body.find(
            (row: { id: string }) => row.id === seedId('store:0'),
          ),
        ).toMatchObject({ rating: expected, reviewCount: reviews.length });
      } finally {
        await prisma.productReview.update({
          where: { id: review.id },
          data: { rating: 5 },
        });
      }
    });

    it('persists sponsorship request → approval → public display → cancellation with ownership and evidence checks', async () => {
      process.env.MARKETPLACE_SPONSORED_PLACEMENTS = '[]';
      const now = Date.now();
      const payload = { requestKey: randomUUID(), headline: 'Gian hàng đối tác được sàn cấp vị trí', startsAt: new Date(now - 60000).toISOString(), endsAt: new Date(now + 7200000).toISOString() };
      const http = app.getHttpServer();
      await request(http).post('/api/sponsored-placements').send(payload).expect(401);
      await request(http).post('/api/sponsored-placements').auth(customerToken, { type: 'bearer' }).send(payload).expect(403);
      await request(http).post('/api/sponsored-placements').auth(ownerToken, { type: 'bearer' }).send({ ...payload, headline: '     ' }).expect(400);
      const created = await request(http).post('/api/sponsored-placements').auth(ownerToken, { type: 'bearer' }).send(payload).expect(201);
      const id = created.body.id;
      const retry = await request(http).post('/api/sponsored-placements').auth(ownerToken, { type: 'bearer' }).send(payload).expect(201);
      expect(retry.body.id).toBe(id);
      await request(http).post('/api/sponsored-placements').auth(ownerToken, { type: 'bearer' }).send({ ...payload, headline: 'Khác nội dung cùng khóa' }).expect(409);
      const foreignList = await request(http).get('/api/sponsored-placements').auth(shopTwoToken, { type: 'bearer' }).expect(200);
      expect(foreignList.body.items).toEqual([]);
      await request(http).patch(`/api/sponsored-placements/${id}/review`).auth(ownerToken, { type: 'bearer' }).send({ decision: 'REJECT', note: 'Shop tự duyệt' }).expect(403);
      await request(http).patch(`/api/sponsored-placements/${id}/cancel`).auth(shopTwoToken, { type: 'bearer' }).send({ note: 'Shop khác hủy' }).expect(404);
      await request(http).patch(`/api/sponsored-placements/${id}/review`).auth(adminToken, { type: 'bearer' }).send({ decision: 'APPROVE', note: 'Thiếu chứng từ đối soát', fundingType: 'PAID', amount: 100000 }).expect(400);
      // Exercise the DB check as well as DTO/service validation: NULL must not bypass CHECK.
      await expect(prisma.sponsoredPlacement.update({ where: { id }, data: { status: 'APPROVED', reviewedById: seedId('user:admin'), reviewedAt: new Date(), reviewNote: 'Thiếu thông tin hình thức cấp' } })).rejects.toThrow();
      const approved = await request(http).patch(`/api/sponsored-placements/${id}/review`).auth(adminToken, { type: 'bearer' }).send({ decision: 'APPROVE', note: 'Sàn cấp miễn phí có ghi nhận', fundingType: 'PLATFORM_GRANT', amount: 0 }).expect(200);
      expect(approved.body.status).toBe('APPROVED');
      const publicRows = await request(http).get('/api/stores/public/placements').expect(200);
      expect(publicRows.body).toHaveLength(1);
      expect(publicRows.body[0].store.id).toBe(seedId('store:0'));
      expect(publicRows.body[0].paymentProofUrl).toBeUndefined();
      expect(await prisma.notification.count({ where: { userId: seedId('shop-owner:0'), type: 'SPONSORSHIP_REVIEWED' } })).toBe(1);
      await request(http).patch(`/api/sponsored-placements/${id}/review`).auth(adminToken, { type: 'bearer' }).send({ decision: 'REJECT', note: 'Không duyệt lần hai' }).expect(409);
      await request(http).patch(`/api/sponsored-placements/${id}/cancel`).auth(ownerToken, { type: 'bearer' }).send({ note: 'Dừng lịch hiển thị' }).expect(200);
      expect((await request(http).get('/api/stores/public/placements').expect(200)).body).toEqual([]);
    });

    it('validates and persists package edits through the real product API, then calculates a server-authoritative parcel', async () => {
      const http = app.getHttpServer();
      const productId = seedId('product:0');
      const packageData = { barcode: data.products[0].barcode, packageWeight: 700, packageLength: 22, packageWidth: 18, packageHeight: 9 };
      await request(http).put(`/api/products/${productId}`).auth(shopTwoToken, { type: 'bearer' }).send(packageData).expect(403);
      await request(http).put(`/api/products/${productId}`).auth(ownerToken, { type: 'bearer' }).send({ packageWeight: 0 }).expect(400);
      await request(http).put(`/api/products/${productId}`).auth(ownerToken, { type: 'bearer' }).send({ packageLength: 1.1 }).expect(400);
      await request(http).put(`/api/products/${productId}`).auth(ownerToken, { type: 'bearer' }).send({ barcode: '4006381333932' }).expect(400);
      const result = await request(http).put(`/api/products/${productId}`).auth(ownerToken, { type: 'bearer' }).send(packageData).expect(200);
      expect(result.body.requiresModeration).toBe(false);
      expect(await prisma.product.findUnique({ where: { id: productId } })).toMatchObject(packageData);
      // Only the carrier boundary is stubbed: database lookups and calculations are real.
      const carrier = new GhnService(prisma as never, {} as never);
      const quote = jest.spyOn(carrier, 'quoteAddress').mockResolvedValue({ totalFee: 27000, districtId: 1484, wardCode: '1A0114' } as never);
      const variant = data.variants.find((row) => row.productId === productId)!;
      const response = await carrier.quoteCart(seedId('store:0'), 'Địa chỉ kiểm thử', [{ productId, variantId: variant.id, quantity: 2 }]);
      expect(response.shippingPackage).toEqual({ weight: 1400, length: 22, width: 18, height: 18 });
      expect(quote).toHaveBeenCalledWith('Địa chỉ kiểm thử', 1400, Number(variant.price) * 2, seedId('store:0'), response.shippingPackage);
      await expect(carrier.quoteCart(seedId('store:1'), 'Địa chỉ kiểm thử', [{ productId, quantity: 1 }])).rejects.toThrow('không thuộc gian hàng');
      await expect(carrier.quoteCart(seedId('store:0'), 'Địa chỉ kiểm thử', [{ productId, variantId: randomUUID(), quantity: 1 }])).rejects.toThrow('Phân loại');
    });

    it('reads both active live sessions with their seeded pins and zero real viewers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/live-sessions/public/list')
        .expect(200);
      expect(response.body).toHaveLength(2);
      for (const session of response.body) {
        expect(session.pinnedProduct?.id).toBe(
          data.products.find((product) => product.storeId === session.storeId)
            ?.id,
        );
        expect(session.viewerCount).toBe(0);
        expect(session.governance).toBeUndefined();
      }
    });

    it('persists an authorized pin and rejects customer/cross-shop/foreign-product attempts', async () => {
      const url = `/api/live-sessions/${seedId('live:0')}/pinned-product`;
      const productId = seedId('product:1');
      await request(app.getHttpServer())
        .post(url)
        .send({ productId })
        .expect(401);
      for (const token of [customerToken, shopTwoToken])
        await request(app.getHttpServer())
          .post(url)
          .auth(token, { type: 'bearer' })
          .send({ productId })
          .expect(403);
      await request(app.getHttpServer())
        .post(url)
        .auth(ownerToken, { type: 'bearer' })
        .send({ productId: seedId('product:3') })
        .expect(400);
      await request(app.getHttpServer())
        .post(url)
        .auth(ownerToken, { type: 'bearer' })
        .send({ productId })
        .expect(201);
      const response = await request(app.getHttpServer())
        .get('/api/live-sessions/public/list')
        .expect(200);
      expect(
        response.body.find((row: { id: string }) => row.id === seedId('live:0'))
          .pinnedProduct.id,
      ).toBe(productId);
    });
  },
);

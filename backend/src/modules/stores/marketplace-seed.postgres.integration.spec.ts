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
        controllers: [StoresController, LiveSessionsController],
        providers: [
          StoresService,
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

import { ProductSemanticMatcher } from '../../products/product-semantic-matcher.service';
import { PricingController } from '../../pricing/pricing.controller';
import { PricingService } from '../../pricing/pricing.service';
import { activeDealMap } from '../deal-scope.policy';
import {
  reservePromotionBudget,
  releasePromotionBudget,
  reconcileProductPrice,
} from '../../pricing/pricing-policy';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CacheService,
  NOOP_CACHE_SERVICE,
} from '../../../core/cache/cache.service';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';
import { JwtStrategy } from '../../../common/strategies/jwt.strategy';
import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { AffiliateDealsController } from '../affiliate-deals.controller';
import { AffiliateDealsService } from '../affiliate-deals.service';
import { ReferralLinksService } from '../../referral-links/referral-links.service';
import { ChatService } from '../../chat/chat.service';
import { ChatGateway } from '../../chat/chat.gateway';
import { MediaService } from '../../media/media.service';
import { DashboardController } from '../../dashboard/dashboard.controller';
import { DashboardService } from '../../dashboard/dashboard.service';
import { StoreCollaboratorsController } from '../../commission-rules/store-collaborators.controller';
import { StoreCollaboratorsService } from '../../commission-rules/store-collaborators.service';
import { ProductsController } from '../../products/products.controller';
import { ProductsService } from '../../products/products.service';
import { assertProductIdentity } from '../../products/product-identity.policy';

// Explicit opt-in: never reads DATABASE_URL or loads AppModule / its crons/mail.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl)
  throw new Error(
    'Set TEST_DATABASE_URL to an isolated local scanms_flow23_*test database.',
  );
const target = new URL(testUrl);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !/^\/scanms_flow23_.*test$/.test(target.pathname)
) {
  throw new Error('Flow 2–3 tests refuse non-local or non-test databases.');
}
const { io } = require('../../../../../frontend/node_modules/socket.io-client');

describe('Flow 2–3: real PostgreSQL, HTTP, JWT and Socket.IO', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let deals: AffiliateDealsService;
  let chat: ChatService;
  let media: MediaService;
  let jwt: JwtService;
  let serverUrl: string;
  const ids: string[] = [];
  let owner: any,
    staff: any,
    kol: any,
    otherKol: any,
    intruder: any,
    admin: any,
    manager: any,
    store: any,
    product: any;
  const secret = 'flow23-local-isolated-test-secret';
  const config = {
    get: (key: string) =>
      (
        ({
          DATABASE_URL: testUrl,
          JWT_SECRET: secret,
          PUBLIC_APP_URL: 'http://localhost:5173',
        }) as Record<string, unknown>
      )[key],
  };
  const tokens = new Map<string, string>();

  beforeAll(async () => {
    prisma = new PrismaService(config as ConfigService);
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret }),
      ],
      controllers: [
        AffiliateDealsController,
        DashboardController,
        StoreCollaboratorsController,
        ProductsController,
        PricingController,
      ],
      providers: [
        AffiliateDealsService,
        ReferralLinksService,
        ChatService,
        ChatGateway,
        MediaService,
        DashboardService,
        StoreCollaboratorsService,
        ProductsService,
        PricingService,
        {
          provide: ProductSemanticMatcher,
          useValue: {
            compare: jest.fn(async (title: string, candidates: any[]) => ({
              method: 'MULTILINGUAL_SENTENCE_EMBEDDING',
              items: candidates.map((item) => ({ ...item, similarity: 100 })),
            })),
          },
        },
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: CacheService, useValue: NOOP_CACHE_SERVICE },
        { provide: CloudinaryService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useLogger(false);
    await app.listen(0, '127.0.0.1');
    serverUrl = await app.getUrl();
    deals = app.get(AffiliateDealsService);
    chat = app.get(ChatService);
    media = app.get(MediaService);
    jwt = app.get(JwtService);
    for (const role of [
      'SHOP_MANAGER',
      'SHOP_MANAGER',
      'COLLABORATOR',
      'COLLABORATOR',
      'SHOP_MANAGER',
      'SYSTEM_ADMIN',
      'SYSTEM_MANAGER',
    ] as UserRole[]) {
      const user = await prisma.user.create({
        data: {
          fullName: 'Flow23 Test',
          email: randomUUID() + '@example.test',
          passwordHash: 'unused-in-jwt-integration-test',
          role,
        },
      });
      ids.push(user.id);
      tokens.set(user.id, jwt.sign({ sub: user.id, role }));
    }
    [owner, staff, kol, otherKol, intruder, admin, manager] = await Promise.all(
      ids.map((id) => prisma.user.findUniqueOrThrow({ where: { id } })),
    );
    store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        name: 'Flow23 isolated store',
        slug: 'flow23-' + randomUUID(),
        categoryName: 'Mỹ phẩm',
        isVerified: true,
        onboardingStatus: 'VERIFIED',
      },
    });
    await prisma.user.update({
      where: { id: staff.id },
      data: { storeId: store.id },
    });
    for (const user of [kol, otherKol])
      await prisma.collaboratorProfile.create({
        data: {
          userId: user.id,
          kycStatus: 'VERIFIED',
          bankName: 'TEST',
          bankAccountNumber: '000000',
          bankAccountName: 'FLOW23 TEST',
        },
      });
  });
  beforeEach(async () => {
    product = await prisma.product.create({
      data: {
        storeId: store.id,
        sku: randomUUID(),
        title: 'Flow23 product',
        price: 350000,
        stockQuantity: 100,
        categoryName: 'Mỹ phẩm',
        moderationStatus: 'APPROVED',
      },
    });
  });
  afterAll(async () => {
    try {
      if (prisma && store) {
        await prisma.productPromotionUsage.deleteMany({
          where: { promotion: { storeId: store.id } },
        });
        await prisma.productPricePromotion.deleteMany({
          where: { storeId: store.id },
        });
        await prisma.order.deleteMany({ where: { storeId: store.id } });
        await prisma.coupon.deleteMany({ where: { storeId: store.id } });
        await prisma.referralLink.deleteMany({ where: { storeId: store.id } });
        await prisma.exclusiveDealProposal.deleteMany({
          where: { storeId: store.id },
        });
        await prisma.conversation.deleteMany({ where: { storeId: store.id } });
        await prisma.store.delete({ where: { id: store.id } });
      }
      if (prisma && ids.length)
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await app?.close();
    }
  });

  const body = () => ({
    collaboratorId: kol.id,
    productId: product.id,
    proposedCommissionRate: 12,
    targetRevenue: 10000000,
    commitmentDays: 30,
    videoReviewCommitment: true,
    salesCommitment: 'Video review thực tế và kế hoạch bán trong 30 ngày.',
    couponTerms: { discountPercent: 7, budgetTotal: 2000000 },
  });
  const postOffer = (actor = staff) =>
    request(app.getHttpServer())
      .post('/api/affiliate-deals/offers')
      .auth(tokens.get(actor.id)!, { type: 'bearer' })
      .send(body());
  const respond = (id: string, actor = kol, action = 'accept') =>
    request(app.getHttpServer())
      .patch('/api/affiliate-deals/' + id + '/' + action)
      .auth(tokens.get(actor.id)!, { type: 'bearer' })
      .send({});

  it('requires independent Admin approval above 16%, issues scoped resources once and includes future store products', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/affiliate-deals/offers')
      .auth(tokens.get(staff.id)!, { type: 'bearer' })
      .send({ ...body(), proposedCommissionRate: 20, scopeType: 'STORE_WIDE' })
      .expect(201);
    const id = response.body.data.id;
    await respond(id)
      .expect(200)
      .expect((res) =>
        expect(res.body.data.status).toBe('PENDING_ADMIN_APPROVAL'),
      );
    expect(
      await prisma.referralLink.count({ where: { exclusiveDealId: id } }),
    ).toBe(0);
    expect(
      (await prisma.exclusiveDealProposal.findUniqueOrThrow({ where: { id } }))
        .commitmentStartedAt,
    ).toBeNull();
    await request(app.getHttpServer())
      .patch(`/api/affiliate-deals/${id}/exception-review`)
      .auth(tokens.get(manager.id)!, { type: 'bearer' })
      .send({ approve: true, note: 'Independent exception assessment' })
      .expect(403);
    const review = () =>
      request(app.getHttpServer())
        .patch(`/api/affiliate-deals/${id}/exception-review`)
        .auth(tokens.get(admin.id)!, { type: 'bearer' })
        .send({ approve: true, note: 'Independent exception assessment' });
    const reviews = await Promise.all([review(), review()]);
    expect(reviews.map((item) => item.status)).toEqual([200, 200]);
    expect(
      await prisma.referralLink.count({ where: { exclusiveDealId: id } }),
    ).toBe(1);
    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { codeNormalized: reviews[0].body.data.vipVoucherCode },
    });
    expect(coupon.scopeType).toBe('STORE_WIDE');
    const future = await prisma.product.create({
      data: {
        storeId: store.id,
        title: 'Future product',
        sku: randomUUID(),
        price: 200000,
        moderationStatus: 'APPROVED',
        isAffiliateEnabled: true,
      },
    });
    const resolved = await activeDealMap(prisma, [
      { collaboratorId: kol.id, productId: future.id, storeId: store.id },
    ]);
    expect(
      Number(resolved.get(`${kol.id}:${future.id}`).approvedCommissionRate),
    ).toBe(20);
    await prisma.exclusiveDealProposal.update({
      where: { id },
      data: { closedAt: new Date() },
    });
  });

  it('binds selected products in one contract, excludes other products and sums attributed net-goods revenue', async () => {
    const second = await prisma.product.create({
      data: {
        storeId: store.id,
        sku: randomUUID(),
        title: 'Second selected product',
        price: 300000,
        moderationStatus: 'APPROVED',
        isAffiliateEnabled: true,
      },
    });
    const created = await request(app.getHttpServer())
      .post('/api/affiliate-deals/offers')
      .auth(tokens.get(staff.id)!, { type: 'bearer' })
      .send({
        ...body(),
        proposedCommissionRate: 16,
        scopeType: 'SELECTED_PRODUCTS',
        productIds: [product.id, second.id],
      })
      .expect(201);
    await respond(created.body.data.id).expect(200);
    expect(
      await prisma.exclusiveDealProduct.count({
        where: {
          proposalId: created.body.data.id,
          referralLinkId: { not: null },
        },
      }),
    ).toBe(2);
    const map = await activeDealMap(
      prisma,
      [product, second].map((p) => ({
        collaboratorId: kol.id,
        productId: p.id,
        storeId: store.id,
      })),
    );
    expect(
      Number(map.get(`${kol.id}:${second.id}`).approvedCommissionRate),
    ).toBe(16);
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        externalOrderSn: randomUUID(),
        customerName: 'Test customer',
        customerPhone: '0900000000',
        shippingAddress: 'Isolated test address',
        subtotalAmount: 350000,
        finalAmount: 330000,
        discountAmount: 20000,
        status: 'COMPLETED',
        completedAt: new Date(),
        attributedCollaboratorId: kol.id,
        rawPayload: {
          goodsPricing: [
            { productId: product.id, variantId: null, netGoods: 320000 },
          ],
        },
        orderItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 350000,
            appliedCommissionRate: 16,
            calculatedCommissionAmount: 51200,
          },
        },
      },
    });
    const progress: any = await deals.getProgress(
      created.body.data.id,
      kol.id,
      'COLLABORATOR',
    );
    expect(progress.validRevenue).toBe(320000);
    expect(progress.kpiType).toBe('REVENUE');
    await prisma.order.delete({ where: { id: order.id } });
  });

  it('enforces MAP, maker-checker, concurrent promotion budgets, cancellation and automatic price restoration', async () => {
    const call = (actor: any) => ({ auth: `Bearer ${tokens.get(actor.id)}` });
    const floor = {
      floorPrice: 250000,
      reason: 'Approved minimum advertised price',
    };
    await request(app.getHttpServer())
      .put(`/api/pricing/products/${product.id}/floor`)
      .set('Authorization', call(staff).auth)
      .send(floor)
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/pricing/products/${product.id}/floor`)
      .set('Authorization', call(manager).auth)
      .send(floor)
      .expect(200);
    const payload = {
      productId: product.id,
      proposedPrice: 300000,
      budgetTotal: 50000,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      reason: 'Limited launch promotion budget',
    };
    await request(app.getHttpServer())
      .post('/api/pricing/promotions')
      .set('Authorization', call(staff).auth)
      .send({ ...payload, proposedPrice: 249999 })
      .expect(400);
    const promotion = (
      await request(app.getHttpServer())
        .post('/api/pricing/promotions')
        .set('Authorization', call(staff).auth)
        .send(payload)
        .expect(201)
    ).body.data;
    await request(app.getHttpServer())
      .patch(`/api/pricing/promotions/${promotion.id}/review`)
      .set('Authorization', call(staff).auth)
      .send({ approve: true, note: 'Self review is not allowed' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/pricing/promotions/${promotion.id}/review`)
      .set('Authorization', call(manager).auth)
      .send({ approve: true, note: 'Budget and floor price verified' })
      .expect(200);
    expect(
      Number(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .price,
      ),
    ).toBe(300000);
    const orders = await Promise.all(
      [1, 2].map(() =>
        prisma.order.create({
          data: {
            storeId: store.id,
            externalOrderSn: randomUUID(),
            customerName: 'Budget test',
            customerPhone: '0900000000',
            shippingAddress: 'Isolated test',
            subtotalAmount: 300000,
            finalAmount: 300000,
          },
        }),
      ),
    );
    const reserve = (id: string, netGoods = 300000) =>
      prisma.$transaction((tx) =>
        reservePromotionBudget(tx, id, [
          { productId: product.id, quantity: 1, unitPrice: 300000, netGoods },
        ]),
      );
    await expect(reserve(orders[0].id, 249999)).rejects.toThrow();
    const reservations = await Promise.allSettled(
      orders.map((order) => reserve(order.id)),
    );
    expect(
      reservations.filter((item) => item.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      Number(
        (
          await prisma.productPricePromotion.findUniqueOrThrow({
            where: { id: promotion.id },
          })
        ).budgetUsed,
      ),
    ).toBe(50000);
    const winning =
      orders[reservations.findIndex((item) => item.status === 'fulfilled')];
    await prisma.$transaction(async (tx) => {
      await releasePromotionBudget(tx, winning.id);
      await releasePromotionBudget(tx, winning.id);
    });
    expect(
      Number(
        (
          await prisma.productPricePromotion.findUniqueOrThrow({
            where: { id: promotion.id },
          })
        ).budgetUsed,
      ),
    ).toBe(0);
    await prisma.productPricePromotion.update({
      where: { id: promotion.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    await prisma.$transaction((tx) => reconcileProductPrice(tx, product.id));
    expect(
      Number(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .price,
      ),
    ).toBe(350000);
  });

  it('validates per-SKU floors and restores only the discounted variant', async () => {
    const [small, large] = await Promise.all(
      [350000, 500000].map((price, index) =>
        prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: randomUUID(),
            name: `Size ${index}`,
            price,
            listPrice: price,
            stockQuantity: 20,
          },
        }),
      ),
    );
    const auth = (user: any) => `Bearer ${tokens.get(user.id)}`;
    await request(app.getHttpServer())
      .put(`/api/pricing/products/${product.id}/floor`)
      .set('Authorization', auth(manager))
      .send({
        floorPrice: 250000,
        variants: [{ variantId: large.id, floorPrice: 400000 }],
        reason: 'Separate minimum prices per SKU',
      })
      .expect(200);
    const payload = {
      productId: product.id,
      proposedPrice: 300000,
      budgetTotal: 500000,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
      reason: 'Promotion for the small SKU only',
    };
    await request(app.getHttpServer())
      .post('/api/pricing/promotions')
      .set('Authorization', auth(staff))
      .send(payload)
      .expect(400);
    const promotion = (
      await request(app.getHttpServer())
        .post('/api/pricing/promotions')
        .set('Authorization', auth(staff))
        .send({ ...payload, variantId: small.id })
        .expect(201)
    ).body.data;
    await request(app.getHttpServer())
      .patch(`/api/pricing/promotions/${promotion.id}/review`)
      .set('Authorization', auth(manager))
      .send({ approve: true, note: 'Small SKU margin and budget checked' })
      .expect(200);
    expect(
      Number(
        (
          await prisma.productVariant.findUniqueOrThrow({
            where: { id: small.id },
          })
        ).price,
      ),
    ).toBe(300000);
    expect(
      Number(
        (
          await prisma.productVariant.findUniqueOrThrow({
            where: { id: large.id },
          })
        ).price,
      ),
    ).toBe(500000);
    await request(app.getHttpServer())
      .patch(`/api/pricing/promotions/${promotion.id}/cancel`)
      .set('Authorization', auth(staff))
      .send({})
      .expect(200);
    expect(
      Number(
        (
          await prisma.productVariant.findUniqueOrThrow({
            where: { id: small.id },
          })
        ).price,
      ),
    ).toBe(350000);
  });

  it('rejects an Admin exception without issuing resources and rejects cross-store selected scopes', async () => {
    const offer = (
      await request(app.getHttpServer())
        .post('/api/affiliate-deals/offers')
        .auth(tokens.get(staff.id)!, { type: 'bearer' })
        .send({ ...body(), proposedCommissionRate: 17 })
        .expect(201)
    ).body.data;
    await respond(offer.id).expect(200);
    await request(app.getHttpServer())
      .patch(`/api/affiliate-deals/${offer.id}/exception-review`)
      .auth(tokens.get(admin.id)!, { type: 'bearer' })
      .send({ approve: false, note: 'Budget exception not justified' })
      .expect(200);
    expect(
      await prisma.referralLink.count({ where: { exclusiveDealId: offer.id } }),
    ).toBe(0);
    expect(
      (
        await prisma.exclusiveDealProposal.findUniqueOrThrow({
          where: { id: offer.id },
        })
      ).status,
    ).toBe('REJECTED');
    await request(app.getHttpServer())
      .post('/api/affiliate-deals/offers')
      .auth(tokens.get(staff.id)!, { type: 'bearer' })
      .send({
        ...body(),
        scopeType: 'SELECTED_PRODUCTS',
        productIds: [product.id, randomUUID()],
      })
      .expect(400);
  });

  it('applies the additive migration and enforces the initiator FK without changing application tables', async () => {
    const sql = readFileSync(
      path.resolve(
        __dirname,
        '../../../../prisma/migrations/20261101000000_exclusive_deal_shop_offers/migration.sql',
      ),
      'utf8',
    );
    const rollback = new Error('probe-rollback');
    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA flow23_migration_probe');
        await tx.$executeRawUnsafe(
          'SET LOCAL search_path TO flow23_migration_probe',
        );
        await tx.$executeRawUnsafe('CREATE TABLE users (id UUID PRIMARY KEY)');
        await tx.$executeRawUnsafe(
          'CREATE TABLE exclusive_deal_proposals (id UUID PRIMARY KEY)',
        );
        for (const statement of sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean))
          await tx.$executeRawUnsafe(statement);
        const columns = await tx.$queryRaw<
          Array<{ column_name: string }>
        >`SELECT column_name FROM information_schema.columns WHERE table_schema = 'flow23_migration_probe' AND column_name IN ('initiated_by_id', 'offer_terms')`;
        expect(columns).toHaveLength(2);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });

  it('validates rate, KPI, nested coupon terms and role before creating an offer', async () => {
    await postOffer(intruder).expect(403);
    await postOffer(kol).expect(403);
    for (const invalid of [
      { proposedCommissionRate: 26 },
      { targetRevenue: 0 },
      { couponTerms: { budgetTotal: -1 } },
    ]) {
      await request(app.getHttpServer())
        .post('/api/affiliate-deals/offers')
        .auth(tokens.get(staff.id)!, { type: 'bearer' })
        .send({ ...body(), ...invalid })
        .expect(400);
    }
    expect(
      await prisma.exclusiveDealProposal.count({
        where: { productId: product.id },
      }),
    ).toBe(0);
  });

  it('activates exactly once under simultaneous accept retries and preserves the Shop coupon terms', async () => {
    const offer = (await postOffer().expect(201)).body.data;
    await respond(offer.id, owner).expect(403);
    await respond(offer.id, otherKol).expect(403);
    const responses = await Promise.all([respond(offer.id), respond(offer.id)]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const links = await prisma.referralLink.findMany({
      where: { exclusiveDealId: offer.id },
    });
    expect(links).toHaveLength(1);
    const coupon = await prisma.coupon.findUniqueOrThrow({
      where: { codeNormalized: links[0].customCouponCode! },
    });
    expect(Number(coupon.discountValue)).toBe(7);
    expect(Number(coupon.budgetTotal)).toBe(2000000);
    expect(coupon.approvedBy).toBe(staff.id);
    expect(
      await prisma.auditLog.count({
        where: {
          action: 'EXCLUSIVE_DEAL_APPROVED',
          details: { path: ['proposalId'], equals: offer.id },
        },
      }),
    ).toBe(1);
  });

  it('rolls back status, link and audit if coupon issuance fails inside PostgreSQL', async () => {
    const offer = (await postOffer().expect(201)).body.data;
    const duplicateCode = (deals as any).vipVoucherCode(
      offer.id,
      kol.fullName,
      7,
    );
    await prisma.coupon.create({
      data: {
        storeId: store.id,
        collaboratorId: kol.id,
        displayCode: duplicateCode,
        codeNormalized: duplicateCode,
      },
    });
    const response = await respond(offer.id);
    expect(response.status).toBe(409);
    expect(
      (
        await prisma.exclusiveDealProposal.findUniqueOrThrow({
          where: { id: offer.id },
        })
      ).status,
    ).toBe('PENDING');
    expect(
      await prisma.referralLink.count({ where: { exclusiveDealId: offer.id } }),
    ).toBe(0);
    expect(
      await prisma.auditLog.count({
        where: {
          action: 'EXCLUSIVE_DEAL_APPROVED',
          details: { path: ['proposalId'], equals: offer.id },
        },
      }),
    ).toBe(0);
  });

  it('lets the invited KOC decline without issuing a link or coupon', async () => {
    const offer = (await postOffer().expect(201)).body.data;
    await respond(offer.id, kol, 'decline').expect(200);
    await respond(offer.id).expect(400);
    expect(
      await prisma.referralLink.count({ where: { exclusiveDealId: offer.id } }),
    ).toBe(0);
  });

  it('serializes duplicate pending offers', async () => {
    const responses = await Promise.all([postOffer(), postOffer()]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(
      await prisma.exclusiveDealProposal.count({
        where: { productId: product.id, status: 'PENDING' },
      }),
    ).toBe(1);
  });

  it('keeps the KOC→Shop proposal direction and blocks a KOC from self-approval', async () => {
    const { collaboratorId: _id, couponTerms: _terms, ...proposal } = body();
    const created = await request(app.getHttpServer())
      .post('/api/affiliate-deals/proposals')
      .auth(tokens.get(kol.id)!, { type: 'bearer' })
      .send(proposal)
      .expect(201);
    await respond(created.body.data.id).expect(403);
    await request(app.getHttpServer())
      .patch('/api/affiliate-deals/' + created.body.data.id + '/approve')
      .auth(tokens.get(staff.id)!, { type: 'bearer' })
      .send({})
      .expect(200);
  });

  it('supports staff chat replies, rejects forged VIP cards and revokes staff access', async () => {
    const conversation = await chat.getOrCreateConversation(
      { storeId: store.id, collaboratorId: kol.id },
      staff.id,
    );
    await expect(
      chat.saveMessage(
        conversation.id,
        kol.id,
        JSON.stringify({
          type: 'EXCLUSIVE_DEAL_PROPOSAL',
          proposalId: randomUUID(),
        }),
      ),
    ).rejects.toThrow('quy trình');
    const message = await chat.saveMessage(
      conversation.id,
      staff.id,
      'Đã nhận đề nghị hợp tác.',
    );
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: message.id },
        })
      ).userId,
    ).toBe(kol.id);
    await prisma.user.update({
      where: { id: staff.id },
      data: { storeId: null },
    });
    try {
      await expect(
        chat.getConversationById(conversation.id, staff.id),
      ).rejects.toThrow('không có quyền');
    } finally {
      await prisma.user.update({
        where: { id: staff.id },
        data: { storeId: store.id },
      });
    }
  });

  it('filters Media Hub by current partnership and supports assigned staff uploads', async () => {
    const values = new Map<string, any>();
    const cachedMedia = new MediaService(prisma, {
      ...NOOP_CACHE_SERVICE,
      get: async (key: string) => values.get(key),
      set: async (key: string, value: any) => {
        values.set(key, value);
      },
    } as CacheService);
    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: { storeId: store.id, collaboratorId: kol.id },
      },
      create: { storeId: store.id, collaboratorId: kol.id, status: 'APPROVED' },
      update: { status: 'APPROVED' },
    });
    await media.create(staff.id, 'SHOP_MANAGER', {
      storeId: store.id,
      productId: product.id,
      title: 'Ảnh được duyệt',
      assetType: 'IMAGE',
      urlOrContent: 'https://res.cloudinary.com/scanms/image/upload/test.jpg',
    });
    const list = await cachedMedia.findAll(
      { productId: product.id },
      { id: kol.id, role: 'COLLABORATOR' },
    );
    expect(list.items).toHaveLength(1);
    await prisma.storeCollaborator.update({
      where: {
        storeId_collaboratorId: { storeId: store.id, collaboratorId: kol.id },
      },
      data: { status: 'REJECTED' },
    });
    expect(
      (
        await cachedMedia.findAll(
          { productId: product.id },
          { id: kol.id, role: 'COLLABORATOR' },
        )
      ).items,
    ).toEqual([]);
    expect(values.size).toBe(2);
  });

  it('serializes barcode identity across simultaneous writes and scopes similarity checks', async () => {
    const barcode = '8938500123456';
    const write = (sku: string) =>
      prisma.$transaction(
        async (tx) => {
          await assertProductIdentity(tx, { storeId: store.id, sku, barcode });
          return tx.product.create({
            data: {
              storeId: store.id,
              sku,
              barcode,
              title: 'Serum Vitamin C dưỡng sáng 30ml',
              price: 100000,
              categoryName: 'Mỹ phẩm',
            },
          });
        },
        { timeout: 15000 },
      );
    const results = await Promise.allSettled([
      write(randomUUID()),
      write(randomUUID()),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      await prisma.product.count({ where: { storeId: store.id, barcode } }),
    ).toBe(1);
    const scan = (user: any, query: Record<string, string>) =>
      request(app.getHttpServer())
        .get('/api/products/identity-check')
        .auth(tokens.get(user.id)!, { type: 'bearer' })
        .query({
          title: 'Serum dưỡng sáng Vitamin C 30ml',
          storeId: store.id,
          ...query,
        });
    const response = await scan(staff, {}).expect(200);
    expect(response.body.data.method).toBe('MULTILINGUAL_SENTENCE_EMBEDDING');
    expect(response.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ similarity: 100 })]),
    );
    await scan(intruder, {}).expect(403);
    await scan(kol, {}).expect(403);
    await scan(staff, { title: 'x'.repeat(256) }).expect(400);
  });

  it('delivers real Socket.IO decisions and excludes a manager whose membership was revoked after joining', async () => {
    const sockets: any[] = [];
    const wait = (socket: any, event: string) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Socket timeout: ' + event)),
          5000,
        );
        socket.once(event, (payload: any) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });
    try {
      for (const user of [owner, kol, staff]) {
        const socket = io(serverUrl + '/chat', {
          autoConnect: false,
          auth: { token: tokens.get(user.id) },
          transports: ['websocket'],
          reconnection: false,
        });
        sockets.push(socket);
        const ready = wait(socket, 'connected');
        socket.connect();
        await ready;
      }
      const incoming = wait(sockets[1], 'new_message');
      const offer = (await postOffer().expect(201)).body.data;
      expect(JSON.parse((await incoming).messageText).proposalId).toBe(
        offer.id,
      );
      const joined = wait(sockets[0], 'joined_conversation');
      sockets[0].emit('join_conversation', {
        conversationId: offer.conversationId,
      });
      await joined;
      const staffJoined = wait(sockets[2], 'joined_conversation');
      sockets[2].emit('join_conversation', {
        conversationId: offer.conversationId,
      });
      await staffJoined;
      let leakedMessages = 0;
      sockets[2].on('new_message', () => leakedMessages++);
      await prisma.user.update({
        where: { id: staff.id },
        data: { storeId: null },
      });
      const decision = wait(sockets[0], 'new_message');
      await respond(offer.id).expect(200);
      expect(JSON.parse((await decision).messageText).status).toBe('APPROVED');
      expect(leakedMessages).toBe(0);
    } finally {
      await prisma.user.update({
        where: { id: staff.id },
        data: { storeId: store.id },
      });
      sockets.forEach((socket) => socket.disconnect());
    }
  });

  it('persists a cooperation plan, validates its DB length and enforces both decision directions over HTTP', async () => {
    await prisma.storeCollaborator.deleteMany({
      where: { storeId: store.id, collaboratorId: kol.id },
    });
    const send = (note: string) =>
      request(app.getHttpServer())
        .post('/api/store-collaborators/request')
        .auth(tokens.get(kol.id)!, { type: 'bearer' })
        .send({ storeId: store.id, note });
    await send('x'.repeat(256)).expect(400);
    const response = await send('  Hai video review mỗi tháng.  ').expect(201);
    const relationship = response.body.data;
    expect(relationship.note).toBe('Hai video review mỗi tháng.');
    const act = (user: any, suffix: string) =>
      request(app.getHttpServer())
        .patch(`/api/store-collaborators/${relationship.id}/${suffix}`)
        .auth(tokens.get(user.id)!, { type: 'bearer' })
        .send({});
    await act(kol, 'accept').expect(403);
    await act(intruder, 'shop-approve').expect(404);
    await act(staff, 'shop-approve').expect(200);
    expect(
      (
        await prisma.storeCollaborator.findUniqueOrThrow({
          where: { id: relationship.id },
        })
      ).status,
    ).toBe('APPROVED');
    await act(staff, 'shop-reject').expect(400);
  });

  it('reports period totals across pages, excludes reversed commissions, and scopes assigned staff to their Store', async () => {
    const make = (status: any, commissionStatus: any, age: number) =>
      prisma.order.create({
        data: {
          storeId: store.id,
          externalOrderSn: randomUUID(),
          attributedCollaboratorId: otherKol.id,
          subtotalAmount: 100000,
          finalAmount: 100000,
          status,
          createdAt: new Date(Date.now() - age * 86400000),
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: 100000,
              appliedCommissionRate: 13,
              calculatedCommissionAmount: 13000,
            },
          },
          commissions: {
            create: {
              collaboratorId: otherKol.id,
              commissionAmount: 13000,
              status: commissionStatus,
              eligibleAt: new Date(),
              availableAt: new Date(),
            },
          },
        },
      });
    await make('DELIVERED', 'PENDING', 0);
    await make('COMPLETED', 'PAID', 1);
    await make('RETURN_REQUESTED', 'REVERSED', 0);
    await make('COMPLETED', 'APPROVED', 40);
    const report = (user: any, params: Record<string, unknown>) =>
      request(app.getHttpServer())
        .get('/api/dashboard/shop/kol-orders')
        .auth(tokens.get(user.id)!, { type: 'bearer' })
        .query({ kolId: otherKol.id, ...params });
    const recent = (await report(staff, { period: '7d', limit: 1 }).expect(200))
      .body.data;
    expect(recent.items).toHaveLength(1);
    expect(recent.total).toBe(3);
    expect(recent.summary).toEqual({
      period: '7d',
      totalOrders: 2,
      totalRevenue: 200000,
      accruedCommission: 26000,
    });
    const all = (
      await report(owner, { period: 'all', page: 2, limit: 1 }).expect(200)
    ).body.data;
    expect(all.summary.totalOrders).toBe(3);
    expect(all.summary.accruedCommission).toBe(39000);
    await report(staff, { storeId: randomUUID() }).expect(403);
    await report(kol, {}).expect(403);
    await report(intruder, {}).expect(403);
    await report(staff, { period: 'invalid' }).expect(400);
  });
});

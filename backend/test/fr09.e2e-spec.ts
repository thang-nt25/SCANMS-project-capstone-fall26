import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { Prisma, UserRole } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database/prisma.service';

jest.setTimeout(60_000);

describe('FR-09 Shop/KOL lifecycle (e2e, real PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ownerId = 'aaaaaaaa-0000-4000-8000-000000000009';
  const kolId = 'bbbbbbbb-0000-4000-8000-000000000009';
  const storeId = 'cccccccc-0000-4000-8000-000000000009';
  const ownerEmail = 'fr09-e2e-owner@scanms.test';
  const kolEmail = 'fr09-e2e-kol@scanms.test';
  const password = 'Password@123';
  const yearMonth = '2026-08';

  async function cleanup() {
    await prisma.bonusAdjustment.deleteMany({ where: { storeId } });
    await prisma.financialLedger.deleteMany({
      where: { wallet: { collaboratorId: kolId } },
    });
    await prisma.wallet.deleteMany({ where: { collaboratorId: kolId } });
    await prisma.monthlyBonusResult.deleteMany({ where: { storeId } });
    await prisma.orderRefund.deleteMany({ where: { order: { storeId } } });
    await prisma.commission.deleteMany({ where: { order: { storeId } } });
    await prisma.orderItem.deleteMany({ where: { order: { storeId } } });
    await prisma.order.deleteMany({ where: { storeId } });
    await prisma.commissionRule.deleteMany({ where: { storeId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, kolId] } } });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    await cleanup();
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.createMany({
      data: [
        {
          id: ownerId,
          email: ownerEmail,
          passwordHash,
          fullName: 'FR09 E2E Shop',
          role: UserRole.SHOP_MANAGER,
        },
        {
          id: kolId,
          email: kolEmail,
          passwordHash,
          fullName: 'FR09 E2E KOL',
          role: UserRole.COLLABORATOR,
        },
      ],
    });
    await prisma.store.create({
      data: {
        id: storeId,
        ownerId,
        name: 'FR09 E2E Store',
        slug: 'fr09-e2e-store',
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('configures, tracks, settles, approves, pays and exposes the KOL history', async () => {
    const ownerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ownerEmail, password })
      .expect(200);
    const kolLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: kolEmail, password })
      .expect(200);

    const ownerToken = ownerLogin.body.accessToken;
    const kolToken = kolLogin.body.accessToken;
    expect(ownerLogin.body.user.role).toBe(UserRole.SHOP_MANAGER);
    expect(kolLogin.body.user.role).toBe(UserRole.COLLABORATOR);

    await request(app.getHttpServer())
      .post(`/api/stores/${storeId}/commission-rules`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Mốc 50 triệu',
        minMonthlyRevenue: '50000000',
        achievementBonus: '500000',
        bonusPercentage: '2',
        effectiveFrom: '2026-08-01T00:00:00.000Z',
      })
      .expect(201);

    await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'FR09-E2E-ORDER-1',
        attributedCollaboratorId: kolId,
        subtotalAmount: new Prisma.Decimal(60_000_000),
        shippingFee: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(60_000_000),
        status: 'COMPLETED',
        completedAt: new Date('2026-08-15T04:00:00.000Z'),
      },
    });

    const progress = await request(app.getHttpServer())
      .get(
        `/api/collaborator/stores/${storeId}/bonus-progress?yearMonth=${yearMonth}`,
      )
      .set('Authorization', `Bearer ${kolToken}`)
      .expect(200);
    expect(progress.body.validRevenue).toBe('60000000.00');
    expect(progress.body.estimatedTotalBonus).toBe('700000.00');

    await request(app.getHttpServer())
      .get(
        `/api/collaborator/stores/${storeId}/bonus-progress?yearMonth=${yearMonth}`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);

    const settled = await request(app.getHttpServer())
      .post(`/api/stores/${storeId}/commission-rules/settle`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ collaboratorId: kolId, yearMonth })
      .expect(201);
    expect(settled.body.settlement.bonusAmount).toBe('700000');
    const settlementId = settled.body.settlement.id;

    await request(app.getHttpServer())
      .patch(
        `/api/stores/${storeId}/commission-rules/settlements/${settlementId}/approve`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(
        `/api/stores/${storeId}/commission-rules/settlements/${settlementId}/payout`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    const history = await request(app.getHttpServer())
      .get(
        `/api/collaborator/bonus-history?storeId=${storeId}&yearMonth=${yearMonth}`,
      )
      .set('Authorization', `Bearer ${kolToken}`)
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0].status).toBe('PAID');
    expect(history.body[0].bonusAmount).toBe('700000');

    const wallet = await prisma.wallet.findUnique({
      where: { collaboratorId: kolId },
    });
    expect(wallet?.availableBalance.toString()).toBe('700000');
  });
});

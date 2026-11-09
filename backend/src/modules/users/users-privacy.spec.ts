import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { PrismaService } from '../../core/database/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CommissionsController } from '../commissions/commissions.controller';
import { CommissionsService } from '../commissions/commissions.service';

describe('Private user and escrow endpoints (real JWT and role guards)', () => {
  let app: INestApplication;
  const secret = 'isolated-test-secret-not-used-by-the-application';
  const jwt = new JwtService({ secret });
  const orderId = 'c02172dd-cbba-56d5-8c18-c243109ba220';
  const users = {
    findAll: jest.fn(async () => []),
    findOne: jest.fn(async () => ({ id: 'fixture' })),
    getMe: jest.fn(async (id: string) => ({ id })),
  };
  const commission = {
    id: 'commission-fixture',
    orderId,
    collaboratorId: 'kol-owner',
    commissionAmount: new Prisma.Decimal(25000),
    status: 'PENDING',
    availableAt: new Date('2026-09-15'),
    eligibleAt: new Date('2026-09-01'),
    order: {
      status: 'COMPLETED',
      externalOrderSn: 'FIXTURE',
      store: { name: 'Fixture shop' },
    },
  };
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }) => ({
        id: where.id,
        role: where.id.startsWith('kol-')
          ? UserRole.COLLABORATOR
          : where.id.startsWith('shop-')
            ? UserRole.SHOP_MANAGER
            : where.id,
        isActive: where.id !== 'inactive',
        isDeleted: false,
      })),
    },
    commission: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.orderId !== orderId) return null;
        if (where.collaboratorId && where.collaboratorId !== 'kol-owner')
          return null;
        if (where.order) {
          const s = where.order.store;
          const ok = s?.ownerId === 'shop-owner' || s?.OR?.some((c: any) => c.owner?.is?.id === 'shop-owner' || c.staffMembers?.some?.id === 'shop-owner');
          if (!ok) return null;
        }
        return commission;
      }),
    },
  };
  const escrow = new CommissionsService(prisma as any, {} as any, {} as any);
  const token = (id: string) => jwt.sign({ sub: id });
  const auth = (id: string) => `Bearer ${token(id)}`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController, CommissionsController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => secret } },
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        { provide: CommissionsService, useValue: escrow },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it.each([
    '/users',
    `/users/${orderId}`,
    `/commissions/orders/${orderId}/escrow`,
  ])('rejects anonymous requests to %s', async (url) => {
    await request(app.getHttpServer()).get(url).expect(401);
    expect(users.findAll).not.toHaveBeenCalled();
    expect(users.findOne).not.toHaveBeenCalled();
    expect(prisma.commission.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.CUSTOMER,
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_MANAGER,
  ])(
    '%s cannot enumerate accounts or fetch arbitrary account details',
    async (role) => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', auth(role))
        .expect(403);
      await request(app.getHttpServer())
        .get(`/users/${orderId}`)
        .set('Authorization', auth(role))
        .expect(403);
      expect(users.findAll).not.toHaveBeenCalled();
      expect(users.findOne).not.toHaveBeenCalled();
    },
  );

  it('allows the system admin to list and read accounts', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', auth(UserRole.SYSTEM_ADMIN))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/users/${orderId}`)
      .set('Authorization', auth(UserRole.SYSTEM_ADMIN))
      .expect(200);
    expect(users.findOne).toHaveBeenCalledWith(orderId);
  });

  it.each(Object.values(UserRole))(
    '%s retains self-profile access without query spoofing',
    async (role) => {
      await request(app.getHttpServer())
        .get('/users/me?userId=other-user')
        .set('Authorization', auth(role))
        .expect(200);
      expect(users.getMe).toHaveBeenCalledWith(role);
    },
  );

  it('rejects an invalid JWT and an inactive account before returning private data', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', auth('inactive'))
      .expect(401);
    expect(users.getMe).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    'kol-owner',
    'shop-owner',
  ])('%s can read authorized escrow details', async (id) => {
    const response = await request(app.getHttpServer())
      .get(`/commissions/orders/${orderId}/escrow`)
      .set('Authorization', auth(id))
      .expect(200);
    expect(response.body.commissionAmount).toBe(25000);
    if (id === 'kol-owner')
      expect(prisma.commission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId, collaboratorId: id },
        }),
      );
    if (id === 'shop-owner')
      expect(prisma.commission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orderId, order: expect.objectContaining({ store: expect.objectContaining({ isDeleted: false }) }) }),
        }),
      );
  });

  it.each(['kol-stranger', 'shop-stranger'])(
    "%s cannot read another owner's escrow",
    async (id) => {
      await request(app.getHttpServer())
        .get(`/commissions/orders/${orderId}/escrow`)
        .set('Authorization', auth(id))
        .expect(404);
    },
  );

  it('does not expose affiliate commissions to customers, even with a valid order ID', async () => {
    await request(app.getHttpServer())
      .get(`/commissions/orders/${orderId}/escrow`)
      .set('Authorization', auth(UserRole.CUSTOMER))
      .expect(403);
    expect(prisma.commission.findFirst).not.toHaveBeenCalled();
  });

  it('validates escrow IDs before querying the database', async () => {
    await request(app.getHttpServer())
      .get('/commissions/orders/not-a-uuid/escrow')
      .set('Authorization', auth('kol-owner'))
      .expect(400);
    expect(prisma.commission.findFirst).not.toHaveBeenCalled();
  });

  it('keeps the non-sensitive public escrow policy available', async () => {
    await request(app.getHttpServer())
      .get('/commissions/escrow-info')
      .expect(200);
    expect(prisma.commission.findFirst).not.toHaveBeenCalled();
  });
});

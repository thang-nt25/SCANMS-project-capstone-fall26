import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { productVariantFields } from '../products/product-variant-fields';

// HTTP integration with real Passport/JWT, isolated Prisma port. No AppModule or shared DB.
describe('Mobile bootstrap HTTP contract', () => {
  let app: INestApplication;
  const secret = 'mobile-contract-test-only-not-a-deployment-key';
  const jwt = new JwtService({ secret });
  const prisma = {
    user: { findUnique: jest.fn() },
    store: { findMany: jest.fn() },
  };
  const actor = (role: UserRole) => ({
    id: 'actor-1',
    email: 'actor@example.test',
    fullName: 'Test Actor',
    role,
    isActive: true,
    isDeleted: false,
  });
  const token = (role: UserRole) =>
    jwt.sign({ sub: 'actor-1', email: 'actor@example.test', role });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [MobileController],
      providers: [
        MobileService,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    JwtStrategy.clearCache();
    prisma.store.findMany.mockResolvedValue([]);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/api/mobile/bootstrap').expect(401);
  });
  it.each(Object.values(UserRole))(
    'returns role-specific bootstrap for %s',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue(actor(role));
      const response = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .auth(token(role), { type: 'bearer' })
        .expect(200);
      expect(response.body.data).toMatchObject({
        contractVersion: 1,
        actor: { id: 'actor-1', role },
        sessionPolicy: 'REAUTHENTICATE_ON_EXPIRY',
      });
      expect(response.body.data.capabilities.includes('exceptions')).toBe(
        role === UserRole.SYSTEM_ADMIN,
      );
      expect(response.body.data.capabilities.includes('users')).toBe(
        role === UserRole.SYSTEM_ADMIN,
      );
      expect(response.body.data).not.toHaveProperty('passwordHash');
      if (role !== UserRole.SHOP_MANAGER)
        expect(prisma.store.findMany).not.toHaveBeenCalled();
    },
  );
  it('uses the live DB role when the JWT still claims admin', async () => {
    prisma.user.findUnique.mockResolvedValue(actor(UserRole.CUSTOMER));
    const response = await request(app.getHttpServer())
      .get('/api/mobile/bootstrap')
      .auth(token(UserRole.SYSTEM_ADMIN), { type: 'bearer' })
      .expect(200);
    expect(response.body.data.actor.role).toBe(UserRole.CUSTOMER);
    expect(response.body.data.capabilities).not.toContain('users');
  });
  it('scopes stores by owner OR active assigned manager and projects safe fields', async () => {
    prisma.user.findUnique.mockResolvedValue(actor(UserRole.SHOP_MANAGER));
    prisma.store.findMany.mockResolvedValue([
      {
        id: 'store-1',
        name: 'Test Shop',
        categoryName: 'Thiết bị điện tử & Phụ kiện',
      },
    ]);
    const response = await request(app.getHttpServer())
      .get('/api/mobile/bootstrap')
      .auth(token(UserRole.SHOP_MANAGER), { type: 'bearer' })
      .expect(200);
    expect(prisma.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          deletedAt: null,
          OR: [
            {
              owner: {
                is: { id: 'actor-1', isActive: true, isDeleted: false },
              },
            },
            {
              staffMembers: {
                some: {
                  id: 'actor-1',
                  role: UserRole.SHOP_MANAGER,
                  isActive: true,
                  isDeleted: false,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          categoryName: true,
        },
      }),
    );
    expect(
      response.body.data.managedStores[0].variantFields.map(
        (field: { key: string }) => field.key,
      ),
    ).toEqual(['model', 'color', 'capacity']);
  });
  it('reflects a revoked store assignment on the next bootstrap', async () => {
    prisma.user.findUnique.mockResolvedValue(actor(UserRole.SHOP_MANAGER));
    prisma.store.findMany.mockResolvedValue([]);
    const response = await request(app.getHttpServer())
      .get('/api/mobile/bootstrap')
      .auth(token(UserRole.SHOP_MANAGER), { type: 'bearer' })
      .expect(200);
    expect(response.body.data.managedStores).toEqual([]);
  });
  it.each([{ isActive: false }, { isDeleted: true }])(
    'rejects disabled/deleted accounts %j',
    async (override) => {
      prisma.user.findUnique.mockResolvedValue({
        ...actor(UserRole.CUSTOMER),
        ...override,
      });
      await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .auth(token(UserRole.CUSTOMER), { type: 'bearer' })
        .expect(401);
    },
  );
  it('rejects expired tokens before loading data', async () => {
    const expired = jwt.sign({ sub: 'actor-1' }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/api/mobile/bootstrap')
      .auth(expired, { type: 'bearer' })
      .expect(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('preserves all category-specific variant keys and the existing fallback', () => {
    const categories = [
      'Mỹ phẩm & Chăm sóc da',
      'Trang điểm & Làm đẹp',
      'Chăm sóc cơ thể & Tóc',
      'Thực phẩm chức năng & Sức khỏe',
      'Thiết bị điện tử & Phụ kiện',
      'Thời trang & Phụ kiện',
    ];
    expect(
      categories.map((category) =>
        productVariantFields(category).map(([key]) => key),
      ),
    ).toEqual([
      ['volume', 'formula', 'package'],
      ['shade', 'finish', 'volume'],
      ['volume', 'scent', 'formula'],
      ['weight', 'flavor', 'package'],
      ['model', 'color', 'capacity'],
      ['color', 'size', 'style'],
    ]);
    expect(productVariantFields(null).map(([key]) => key)).toEqual([
      'type',
      'specification',
      'color',
    ]);
  });
});

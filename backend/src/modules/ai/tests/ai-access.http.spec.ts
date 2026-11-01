import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AiRecommendationController } from '../ai-recommendation.controller';
import { AiRecommendationService } from '../ai-recommendation.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

// HTTP/controller/service integration only: isolated repository and authentication
// fixtures. Never loads AppModule, .env, a shared database, or Redis.
describe('Recommendation HTTP authorization and validation', () => {
  const productId = '11111111-1111-4111-8111-111111111111';
  const storeId = '22222222-2222-4222-8222-222222222222';
  let app: INestApplication;
  let staffAssigned: boolean;
  let prisma: any;
  let cache: Map<string, unknown>;

  beforeAll(async () => {
    prisma = {
      product: { findFirst: jest.fn() },
      store: { findFirst: jest.fn() },
      user: { findMany: jest.fn() },
      order: { findMany: jest.fn() },
      clickTrafficLog: { groupBy: jest.fn() },
    };
    const module = await Test.createTestingModule({
      controllers: [AiRecommendationController],
      providers: [
        AiRecommendationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CacheService,
          useValue: {
            get: async (key: string) => cache.get(key),
            set: async (key: string, value: unknown) => {
              cache.set(key, value);
            },
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const id = req.headers.authorization?.replace('Bearer ', '');
          if (!['owner', 'staff', 'stranger', 'customer'].includes(id))
            throw new UnauthorizedException();
          req.user = {
            id,
            role: id === 'customer' ? 'CUSTOMER' : 'SHOP_MANAGER',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new Map();
    staffAssigned = true;
    prisma.product.findFirst.mockResolvedValue({
      id: productId,
      price: 300000,
      categoryName: 'Mỹ phẩm',
      store: { id: storeId, ownerId: 'owner', defaultCommissionRate: 10 },
    });
    prisma.store.findFirst.mockImplementation(async ({ where }: any) => {
      const staffId = where.OR?.find((scope: any) => scope.staffMembers)
        ?.staffMembers.some.id;
      return staffAssigned && staffId === 'staff' && where.id === storeId
        ? { id: storeId }
        : null;
    });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.clickTrafficLog.groupBy.mockResolvedValue([]);
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (actor?: string, suffix = productId) => {
    const req = request(app.getHttpServer()).get(
      `/api/ai/recommend-kols/${suffix}`,
    );
    return actor ? req.auth(actor, { type: 'bearer' }) : req;
  };

  it('returns 401 for unauthenticated callers and 403 for the customer role', async () => {
    await get().expect(401);
    await get('customer').expect(403);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  it('returns 403 to another shop after an owner populated the cache', async () => {
    await get('owner').expect(200);
    await get('stranger').expect(403);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('allows assigned staff and rejects their cached request after assignment is removed', async () => {
    const response = await get('staff').expect(200);
    expect(response.body.targetProduct.productId).toBe(productId);
    staffAssigned = false;
    await get('staff').expect(403);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['limit', '101'],
    ['limit', '0'],
    ['minConversionRate', '-1'],
    ['minConversionRate', 'NaN'],
    ['priceRange', 'INVALID'],
    ['unexpected', 'value'],
  ])('rejects invalid query %s=%s before persistence', async (key, value) => {
    await get('owner')
      .query({ [key]: value })
      .expect(400);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  it('validates UUID route and body parameters', async () => {
    await get('owner', 'invalid').expect(400);
    await request(app.getHttpServer())
      .post('/api/ai/match-analysis')
      .auth('owner', { type: 'bearer' })
      .send({ productId, collaboratorId: 'invalid' })
      .expect(400);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });
});

import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ShippingController } from './shipping.controller';
import { GhnService } from './ghn.service';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';

// HTTP/controller test with stubbed authentication and persistence: never connects to the group DB.
describe('shipping simulation HTTP authorization and error contract', () => {
  let app: INestApplication;
  const orderId = '00000000-0000-4000-8000-000000000001';
  const service = {
    startCustomerSimulation: jest.fn(),
    completeCustomerSimulation: jest.fn(),
  };
  const prisma = { store: { findFirst: jest.fn() } };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [
        RolesGuard,
        { provide: GhnService, useValue: service },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { id: 'actor', role };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.store.findFirst.mockResolvedValue({ id: 'own-shop' });
    service.startCustomerSimulation.mockResolvedValue({ isSimulation: true });
    service.completeCustomerSimulation.mockResolvedValue({
      status: 'DELIVERED',
      isSimulation: true,
    });
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each(['start', 'complete'])('requires login for %s', async (action) => {
    await request(app.getHttpServer())
      .post(`/api/shipping/ghn/simulation/${orderId}/${action}`)
      .expect(401);
    expect(service.startCustomerSimulation).not.toHaveBeenCalled();
    expect(service.completeCustomerSimulation).not.toHaveBeenCalled();
  });

  it.each(['CUSTOMER', 'COLLABORATOR'])(
    'does not let %s manufacture delivery evidence',
    async (role) => {
      await request(app.getHttpServer())
        .post(`/api/shipping/ghn/simulation/${orderId}/complete`)
        .set('x-test-role', role)
        .expect(403);
      expect(service.completeCustomerSimulation).not.toHaveBeenCalled();
    },
  );

  it('validates UUID before querying the store or invoking the service', async () => {
    await request(app.getHttpServer())
      .post('/api/shipping/ghn/simulation/not-uuid/complete')
      .set('x-test-role', 'SHOP_MANAGER')
      .expect(400);
    expect(prisma.store.findFirst).not.toHaveBeenCalled();
    expect(service.completeCustomerSimulation).not.toHaveBeenCalled();
  });

  it('derives store and actor from authenticated identity, not submitted JSON', async () => {
    await request(app.getHttpServer())
      .post(`/api/shipping/ghn/simulation/${orderId}/complete`)
      .set('x-test-role', 'SHOP_MANAGER')
      .send({ storeId: 'other-shop', actorId: 'attacker' })
      .expect(201);
    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { ownerId: 'actor', deletedAt: null },
      select: { id: true },
    });
    expect(service.completeCustomerSimulation).toHaveBeenCalledWith(
      orderId,
      'actor',
      'own-shop',
    );
  });

  it('rejects a shop account without a store', async () => {
    prisma.store.findFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .post(`/api/shipping/ghn/simulation/${orderId}/complete`)
      .set('x-test-role', 'SHOP_MANAGER')
      .expect(403);
    expect(service.completeCustomerSimulation).not.toHaveBeenCalled();
  });

  it.each(['SYSTEM_ADMIN', 'SYSTEM_MANAGER'])(
    'allows authorized %s without inventing a shop scope',
    async (role) => {
      await request(app.getHttpServer())
        .post(`/api/shipping/ghn/simulation/${orderId}/complete`)
        .set('x-test-role', role)
        .expect(201);
      expect(service.completeCustomerSimulation).toHaveBeenCalledWith(
        orderId,
        'actor',
        undefined,
      );
    },
  );

  it('returns the disabled-feature explanation, not Internal server error', async () => {
    service.startCustomerSimulation.mockRejectedValueOnce(
      new BadRequestException('Mô phỏng vận chuyển đang tắt.'),
    );
    const result = await request(app.getHttpServer())
      .post(`/api/shipping/ghn/simulation/${orderId}/start`)
      .set('x-test-role', 'SHOP_MANAGER')
      .expect(400);
    expect(result.body.message).toBe('Mô phỏng vận chuyển đang tắt.');
  });
});

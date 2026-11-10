import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletSummaryService } from './wallet-summary.service';
import { WalletPayosService } from './wallet-payos.service';

// Real HTTP routing/DTO/authorization with isolated transaction/provider substitutes.
describe('wallet top-up HTTP contract (no shared DB or bank calls)', () => {
  let app: INestApplication;
  let role: UserRole = UserRole.CUSTOMER;
  const flags = { NODE_ENV: 'development', ALLOW_DEMO_WALLET_TOPUP: 'true' };
  const tx = {};
  const transaction = jest.fn(async (fn) => fn(tx));
  const service = new WalletsService(
    {} as never,
    { $transaction: transaction } as never,
    { get: (key) => flags[key] } as ConfigService,
  );
  const credit = jest
    .spyOn(service, 'creditAvailableBalance')
    .mockResolvedValue({
      wallet: {
        id: 'wallet',
        availableBalance: { toFixed: () => '900000.00' },
        shoppingBalance: { toFixed: () => '100000.00' },
      },
    } as never);
  const payos = {
    create: jest.fn().mockResolvedValue({ id: 'payment', status: 'PENDING' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        { provide: WalletsService, useValue: service },
        { provide: WalletSummaryService, useValue: {} },
        { provide: WalletPayosService, useValue: payos },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context) {
          context.switchToHttp().getRequest().user = { id: 'buyer', role };
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
  beforeEach(() => {
    jest.clearAllMocks();
    role = UserRole.CUSTOMER;
    flags.NODE_ENV = 'development';
  });
  afterAll(async () => {
    await app?.close();
  });
  it('accepts an explicitly confirmed customer demo deposit through one transaction', async () => {
    await request(app.getHttpServer())
      .post('/wallets/top-up-demo')
      .send({ amount: 100000 })
      .expect(201)
      .expect(({ body }) => expect(body.availableBalance).toBe('100000.00'));
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(credit).toHaveBeenCalledWith(
      tx,
      'buyer',
      expect.anything(),
      expect.objectContaining({ type: 'TOPUP_DEMO' }),
    );
  });
  it.each([
    {},
    { amount: -1 },
    { amount: 1.5 },
    { amount: 50000001 },
    { amount: 100000, userId: 'another' },
  ])(
    'rejects invalid demo input %j without changing a balance',
    async (body) => {
      await request(app.getHttpServer())
        .post('/wallets/top-up-demo')
        .send(body)
        .expect(400);
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it('blocks the demo action for KOL and in production even if the flag is true', async () => {
    role = UserRole.COLLABORATOR;
    await request(app.getHttpServer())
      .get('/wallets/top-up-demo/availability')
      .expect(200, { available: false });
    await request(app.getHttpServer())
      .post('/wallets/top-up-demo')
      .send({ amount: 100000 })
      .expect(403);
    role = UserRole.CUSTOMER;
    flags.NODE_ENV = 'production';
    await request(app.getHttpServer())
      .post('/wallets/top-up-demo')
      .send({ amount: 100000 })
      .expect(403);
    expect(transaction).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { amount: 9999 },
    { amount: 50000001 },
    { amount: 10000.5 },
    { amount: '100000' },
  ])(
    'rejects invalid payOS input %j before contacting the provider',
    async (body) => {
      await request(app.getHttpServer())
        .post('/wallets/top-up-payos')
        .send(body)
        .expect(400);
      expect(payos.create).not.toHaveBeenCalled();
    },
  );
  it('uses the authenticated owner to create a payOS request', async () => {
    await request(app.getHttpServer())
      .post('/wallets/top-up-payos')
      .send({ amount: 100000 })
      .expect(201);
    expect(payos.create).toHaveBeenCalledWith('buyer', 100000);
    expect(transaction).not.toHaveBeenCalled();
  });
});

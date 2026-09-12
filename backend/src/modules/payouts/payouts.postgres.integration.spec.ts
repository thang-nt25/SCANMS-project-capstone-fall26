import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { KycStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { WalletSummaryService } from '../wallets/wallet-summary.service';
import { WithdrawalPolicyService } from '../wallets/withdrawal-policy.service';
import { PayoutsService } from './payouts.service';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { PayoutsModule } from './payouts.module';

// Opt-in only: never fall back to DATABASE_URL or a shared Supabase database.
const testDatabaseUrl = process.env.WITHDRAWAL_TEST_DATABASE_URL;
const describePostgres = testDatabaseUrl ? describe : describe.skip;

describePostgres('FR-22 real PostgreSQL withdrawal transactions', () => {
  let prisma: PrismaService;
  let service: PayoutsService;
  let policy: WithdrawalPolicyService;
  let app: INestApplication;
  let apiUrl: string;
  let token: string;
  const testJwtSecret = 'fr22-isolated-integration-test-key';
  const collaboratorId = randomUUID();
  const otherCollaboratorId = randomUUID();

  beforeAll(async () => {
    const databaseUrl = new URL(testDatabaseUrl!);
    if (
      !['127.0.0.1', 'localhost', '[::1]'].includes(databaseUrl.hostname) ||
      !databaseUrl.pathname.endsWith('_test')
    ) {
      throw new Error(
        'Withdrawal integration tests require a local disposable *_test database',
      );
    }
    prisma = new PrismaService(
      new ConfigService({ DATABASE_URL: testDatabaseUrl, DB_POOL_MAX: '4' }),
    );
    await prisma.onModuleInit();
    policy = new WithdrawalPolicyService(
      new ConfigService({ MIN_PAYOUT_AMOUNT: '200000' }),
    );
    service = new PayoutsService(prisma, new WalletsService(), policy);
    for (const id of [collaboratorId, otherCollaboratorId]) {
      await prisma.user.create({
        data: {
          id,
          email: `fr22-${id}@example.test`,
          passwordHash: 'integration-test-only-not-a-login-hash',
          fullName: 'FR-22 test KOL',
          role: UserRole.COLLABORATOR,
          collaboratorProfile: {
            create: {
              bankName: 'Test Bank',
              bankAccountNumber: '123456789',
              bankAccountName: 'TEST KOL',
              kycStatus: KycStatus.VERIFIED,
            },
          },
          wallet: {
            create: { availableBalance: '500000.31', pendingBalance: '900000' },
          },
        },
      });
    }

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              DATABASE_URL: testDatabaseUrl,
              JWT_SECRET: testJwtSecret,
              MIN_PAYOUT_AMOUNT: '200000',
              DB_POOL_MAX: '2',
            }),
          ],
        }),
        JwtModule.register({ secret: testJwtSecret }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        PayoutsModule,
      ],
      providers: [JwtStrategy],
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
    await app.listen(0, '127.0.0.1');
    apiUrl = await app.getUrl();
    token = module.get(JwtService).sign({
      sub: collaboratorId,
      email: 'test@example.test',
      role: UserRole.COLLABORATOR,
    });
  });

  beforeEach(async () => {
    await prisma.payoutRequest.deleteMany({
      where: { collaboratorId: { in: [collaboratorId, otherCollaboratorId] } },
    });
    await prisma.wallet.update({
      where: { collaboratorId },
      data: { availableBalance: '500000.31', pendingBalance: '900000' },
    });
    await prisma.wallet.update({
      where: { collaboratorId: otherCollaboratorId },
      data: { availableBalance: '500000.31', pendingBalance: '900000' },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (!prisma) return;
    try {
      // Only generated fixtures; no truncate or broad cleanup of shared data.
      await prisma.user.deleteMany({
        where: { id: { in: [collaboratorId, otherCollaboratorId] } },
      });
    } finally {
      await prisma.onModuleDestroy();
    }
  });

  it('serializes simultaneous withdrawals so only one can spend the funds', async () => {
    const outcomes = await Promise.allSettled([
      service.createWithdrawal(collaboratorId, { amount: '400000.10' }),
      service.createWithdrawal(collaboratorId, { amount: '400000.10' }),
    ]);
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const failure = outcomes.find((result) => result.status === 'rejected');
    expect(
      failure?.status === 'rejected' &&
        failure.reason instanceof BadRequestException,
    ).toBe(true);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('100000.21');
    expect(wallet.pendingBalance.toFixed(2)).toBe('900000.00');
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(1);
    expect(
      await prisma.financialLedger.count({ where: { walletId: wallet.id } }),
    ).toBe(0);
  });

  it('rolls back both debit and payout when PostgreSQL fails after insertion', async () => {
    const failingPrisma = {
      $transaction: (
        callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
      ) =>
        prisma.$transaction((tx) =>
          callback(
            new Proxy(tx, {
              get(target, property) {
                if (property !== 'payoutRequest')
                  return Reflect.get(target, property) as unknown;
                return {
                  create: async (args: Prisma.PayoutRequestCreateArgs) => {
                    const request = await target.payoutRequest.create(args);
                    await target.$executeRaw(Prisma.sql`SELECT 1 / 0`);
                    return request;
                  },
                };
              },
            }),
          ),
        ),
    };
    const failingService = new PayoutsService(
      failingPrisma as unknown as PrismaService,
      new WalletsService(),
      policy,
    );
    await expect(
      failingService.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('500000.31');
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(0);
  });

  it('allows an exact-balance withdrawal and blocks further spending of pending money', async () => {
    await service.createWithdrawal(collaboratorId, { amount: '500000.31' });
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toThrow('Số dư khả dụng không đủ');
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('0.00');
    expect(wallet.pendingBalance.toFixed(2)).toBe('900000.00');
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(1);
  });

  it('returns only the authenticated owner history and masks bank details', async () => {
    const ownRequest = await service.createWithdrawal(collaboratorId, {
      amount: '200000.10',
    });
    await service.createWithdrawal(otherCollaboratorId, { amount: '300000' });
    const history = await service.getMyWithdrawals(collaboratorId, {
      page: 1,
      limit: 10,
    });
    expect(history.total).toBe(1);
    expect(history.requests[0].id).toBe(ownRequest.request.id);
    const summary = await new WalletSummaryService(prisma, policy).getMyWallet(
      collaboratorId,
    );
    expect(summary.availableBalance).toBe('300000.21');
    expect(summary.bankAccount?.maskedAccountNumber).toBe('••••6789');
    expect(summary.canWithdraw).toBe(true);
  });

  it('protects wallet routes with JWT and rejects forged ownership/status fields', async () => {
    const unauthorized = await fetch(`${apiUrl}/api/wallets/me`);
    expect(unauthorized.status).toBe(401);
    const forged = await fetch(`${apiUrl}/api/wallets/withdrawals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: '200000',
        collaboratorId: otherCollaboratorId,
        status: 'APPROVED',
      }),
    });
    expect(forged.status).toBe(400);
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(0);
  });

  it('returns 403 for non-collaborator identities', async () => {
    await prisma.user.update({
      where: { id: otherCollaboratorId },
      data: { role: UserRole.SHOP_MANAGER },
    });
    try {
      const otherToken = app.get(JwtService).sign({
        sub: otherCollaboratorId,
        email: 'test@example.test',
        role: UserRole.SHOP_MANAGER,
      });
      const response = await fetch(`${apiUrl}/api/wallets/withdrawals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${otherToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: '200000' }),
      });
      expect(response.status).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: otherCollaboratorId },
        data: { role: UserRole.COLLABORATOR },
      });
    }
  });

  it('creates and lists a PENDING request through the real HTTP endpoints', async () => {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const created = await fetch(`${apiUrl}/api/wallets/withdrawals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount: '200000.10' }),
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      data: {
        request: { status: string; amount: string };
        availableBalance: string;
      };
    };
    expect(body.data.request.status).toBe('PENDING');
    expect(body.data.request.amount).toBe('200000.10');
    expect(body.data.availableBalance).toBe('300000.21');
    const historyResponse = await fetch(
      `${apiUrl}/api/wallets/withdrawals?page=1&limit=10`,
      { headers },
    );
    const history = (await historyResponse.json()) as {
      data: { total: number };
    };
    expect(history.data.total).toBe(1);
    const walletResponse = await fetch(`${apiUrl}/api/wallets/me`, { headers });
    expect(walletResponse.status).toBe(200);
  });
});

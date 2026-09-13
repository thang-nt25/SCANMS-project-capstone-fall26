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
import { FinancialLedgerService } from '../wallets/financial-ledger.service';
import { PayoutTaxService } from './payout-tax.service';
import { CommissionRulesService } from '../commission-rules/commission-rules.service';

// Opt-in only: never fall back to DATABASE_URL or a shared Supabase database.
const testDatabaseUrl = process.env.WITHDRAWAL_TEST_DATABASE_URL;
const describePostgres = testDatabaseUrl ? describe : describe.skip;

describePostgres('FR-22/FR-23 real PostgreSQL financial transactions', () => {
  let prisma: PrismaService;
  let service: PayoutsService;
  let policy: WithdrawalPolicyService;
  let app: INestApplication;
  let apiUrl: string;
  let token: string;
  const testJwtSecret = 'fr22-isolated-integration-test-key';
  let collaboratorId: string;
  let otherCollaboratorId: string;
  let storeId: string;

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
    service = new PayoutsService(
      prisma,
      new WalletsService(new FinancialLedgerService()),
      policy,
      new PayoutTaxService(),
    );

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
  });

  beforeEach(async () => {
    storeId = (await createTestStore()).id;
    collaboratorId = randomUUID();
    otherCollaboratorId = randomUUID();
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
            create: {
              availableBalance: '500000.31',
              pendingBalance: '900000',
              storeWallets: {
                create: {
                  storeId,
                  availableBalance: '500000.31',
                  pendingBalance: '900000',
                },
              },
            },
          },
        },
      });
    }
    token = app.get(JwtService).sign({
      sub: collaboratorId,
      email: 'test@example.test',
      role: UserRole.COLLABORATOR,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.onModuleDestroy();
    // Financial fixtures remain immutable in the disposable test database.
    // Drop the dedicated database externally rather than deleting ledger rows.
  });

  it('serializes simultaneous withdrawals so only one can spend the funds', async () => {
    const outcomes = await Promise.allSettled([
      service.createWithdrawal(collaboratorId, {
        storeId,
        amount: '400000.10',
      }),
      service.createWithdrawal(collaboratorId, {
        storeId,
        amount: '400000.10',
      }),
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
    ).toBe(1);
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
      new WalletsService(new FinancialLedgerService()),
      policy,
      new PayoutTaxService(),
    );
    await expect(
      failingService.createWithdrawal(collaboratorId, {
        storeId,
        amount: '200000',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('500000.31');
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(0);
    expect(
      await prisma.financialLedger.count({ where: { walletId: wallet.id } }),
    ).toBe(0);
  });

  it('allows an exact-balance withdrawal and blocks further spending of pending money', async () => {
    await service.createWithdrawal(collaboratorId, {
      storeId,
      amount: '500000.31',
    });
    await expect(
      service.createWithdrawal(collaboratorId, { storeId, amount: '200000' }),
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
      storeId,
      amount: '200000.10',
    });
    await service.createWithdrawal(otherCollaboratorId, {
      storeId,
      amount: '300000',
    });
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
        body: JSON.stringify({ storeId, amount: '200000' }),
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
      body: JSON.stringify({ storeId, amount: '200000.10' }),
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

  it.each([
    ['1999999.99', '0.00', '1999999.99'],
    ['2000000.00', '200000.00', '1800000.00'],
    ['2000000.05', '200000.01', '1800000.04'],
  ])(
    'persists tax/net and one gross ledger debit for withdrawal %s',
    async (amount, tax, net) => {
      await prisma.$transaction((tx) =>
        new WalletsService(new FinancialLedgerService()).creditAvailableBalance(
          tx,
          collaboratorId,
          new Prisma.Decimal('2500000'),
          { id: randomUUID(), type: 'MONTHLY_BONUS' },
          storeId,
        ),
      );
      const result = await service.createWithdrawal(collaboratorId, {
        storeId,
        amount,
      });
      expect(result.request.taxAmount).toBe(tax);
      expect(result.request.netAmount).toBe(net);
      expect(result.availableBalance).toBe(
        new Prisma.Decimal('3000000.31').minus(amount).toFixed(2),
      );
      const entries = await prisma.financialLedger.findMany({
        where: { referenceId: result.request.id },
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].amount.toFixed(2)).toBe(
        new Prisma.Decimal(amount).negated().toFixed(2),
      );
      expect(entries[0].referenceType).toBe('PAYOUT_REQUEST');
      expect(
        entries[0].balanceAfter.equals(
          entries[0].balanceBefore.plus(entries[0].amount),
        ),
      ).toBe(true);
    },
  );

  it('rolls back payout and wallet when ledger insertion fails', async () => {
    const failingLedger = {
      appendEntry: () => {
        throw new Error('injected ledger storage failure');
      },
    };
    const failingService = new PayoutsService(
      prisma,
      new WalletsService(failingLedger),
      policy,
      new PayoutTaxService(),
    );
    await expect(
      failingService.createWithdrawal(collaboratorId, {
        storeId,
        amount: '200000',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('500000.31');
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId } }),
    ).toBe(0);
    expect(
      await prisma.financialLedger.count({ where: { walletId: wallet.id } }),
    ).toBe(0);
  });

  it('records both approval buckets and pending/available clawbacks without editing history', async () => {
    const wallets = new WalletsService(new FinancialLedgerService());
    const reference = { id: randomUUID(), type: 'COMMISSION' as const };
    await prisma.$transaction(async (tx) => {
      await wallets.creditPendingBalance(
        tx,
        collaboratorId,
        new Prisma.Decimal('100000'),
        reference,
      );
      await wallets.releasePendingBalance(
        tx,
        collaboratorId,
        new Prisma.Decimal('100000'),
        reference,
      );
      await wallets.reverseAvailableBalance(
        tx,
        collaboratorId,
        new Prisma.Decimal('100000'),
        reference,
      );
    });
    const entries = await prisma.financialLedger.findMany({
      where: { referenceId: reference.id },
    });
    expect(entries).toHaveLength(4);
    expect(
      entries.filter(
        (entry) => entry.transactionType === 'COMMISSION_APPROVED',
      ),
    ).toHaveLength(2);
    expect(
      entries
        .reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0))
        .toFixed(2),
    ).toBe('0.00');
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('500000.31');
    expect(wallet.pendingBalance.toFixed(2)).toBe('900000.00');
    const pendingReference = { id: randomUUID(), type: 'COMMISSION' as const };
    await prisma.$transaction(async (tx) => {
      await wallets.creditPendingBalance(
        tx,
        collaboratorId,
        new Prisma.Decimal('123.45'),
        pendingReference,
      );
      await wallets.reversePendingBalance(
        tx,
        collaboratorId,
        new Prisma.Decimal('123.45'),
        pendingReference,
      );
    });
    expect(
      await prisma.financialLedger.count({
        where: { referenceId: pendingReference.id },
      }),
    ).toBe(2);
  });

  it('rejects duplicate ledger event and rolls back its second wallet debit', async () => {
    const wallets = new WalletsService(new FinancialLedgerService());
    const reference = { id: randomUUID(), type: 'PAYOUT_REQUEST' as const };
    await prisma.$transaction((tx) =>
      wallets.debitAvailableBalanceForWithdrawal(
        tx,
        collaboratorId,
        new Prisma.Decimal('200000'),
        reference,
      ),
    );
    await expect(
      prisma.$transaction((tx) =>
        wallets.debitAvailableBalanceForWithdrawal(
          tx,
          collaboratorId,
          new Prisma.Decimal('200000'),
          reference,
        ),
      ),
    ).rejects.toThrow();
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('300000.31');
    expect(
      await prisma.financialLedger.count({
        where: { referenceId: reference.id },
      }),
    ).toBe(1);
  });

  it('enforces append-only UPDATE/DELETE/TRUNCATE and protects parent deletion in PostgreSQL', async () => {
    const result = await service.createWithdrawal(collaboratorId, {
      storeId,
      amount: '200000',
    });
    const entry = await prisma.financialLedger.findFirstOrThrow({
      where: { referenceId: result.request.id },
    });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.financialLedger.update({
          where: { id: entry.id },
          data: { referenceType: 'TAMPERED' },
        });
        throw new Error('Unexpectedly allowed update; rollback');
      }),
    ).rejects.toThrow('append-only');
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.financialLedger.delete({ where: { id: entry.id } });
        throw new Error('Unexpectedly allowed delete; rollback');
      }),
    ).rejects.toThrow('append-only');
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`TRUNCATE financial_ledgers`);
        throw new Error('Unexpectedly allowed truncate; rollback');
      }),
    ).rejects.toThrow('append-only');
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.wallet.delete({ where: { id: entry.walletId } });
        throw new Error('Unexpectedly allowed parent deletion; rollback');
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(
      await prisma.financialLedger.findUnique({ where: { id: entry.id } }),
    ).toEqual(entry);
  });

  it('keeps legacy payout snapshots unchanged and marks their net amount unknown', async () => {
    const legacy = await prisma.payoutRequest.create({
      data: {
        collaboratorId,
        amount: '2000000',
        bankName: 'Test Bank',
        bankAccountNumber: '123456789',
        bankAccountName: 'TEST KOL',
      },
    });
    const history = await service.getMyWithdrawals(collaboratorId, {
      page: 1,
      limit: 10,
    });
    expect(history.requests[0]).toMatchObject({
      id: legacy.id,
      taxAmount: '0.00',
      netAmount: '0.00',
      taxCalculated: false,
    });
    expect(
      await prisma.payoutRequest.findUnique({ where: { id: legacy.id } }),
    ).toEqual(legacy);
  });

  async function createTestStore() {
    const owner = await prisma.user.create({
      data: {
        email: `fr23-shop-${randomUUID()}@example.test`,
        passwordHash: 'integration-test-only-not-a-login-hash',
        fullName: 'FR-23 test merchant',
        role: UserRole.SHOP_MANAGER,
      },
    });
    return prisma.store.create({
      data: {
        ownerId: owner.id,
        name: 'Ledger test store',
        slug: randomUUID(),
      },
    });
  }

  it('records an existing monthly bonus payment once in the same transaction', async () => {
    const store = await createTestStore();
    const settlement = await prisma.monthlyBonusResult.create({
      data: {
        storeId: store.id,
        collaboratorId,
        yearMonth: '2026-09',
        validRevenue: '1000000',
        bonusAmount: '100000.15',
        status: 'APPROVED',
      },
    });
    const rules = new CommissionRulesService(
      prisma,
      new WalletsService(new FinancialLedgerService()),
    );
    const results = await Promise.allSettled([
      rules.payoutSettlement(store.id, settlement.id),
      rules.payoutSettlement(store.id, settlement.id),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('600000.46');
    const entries = await prisma.financialLedger.findMany({
      where: { referenceId: settlement.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      referenceType: 'MONTHLY_BONUS',
      balanceBucket: 'AVAILABLE',
    });
    const paid = await prisma.monthlyBonusResult.findUniqueOrThrow({
      where: { id: settlement.id },
    });
    expect(paid.status).toBe('PAID');
    expect(paid.walletTransactionId).toBe(entries[0].id);
  });

  it('appends separate reversal entries for successive existing partial refunds', async () => {
    const store = await createTestStore();
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        externalOrderSn: randomUUID(),
        attributedCollaboratorId: collaboratorId,
        subtotalAmount: '1000000',
        finalAmount: '1000000',
        commissions: {
          create: {
            collaboratorId,
            commissionAmount: '100000',
            eligibleAt: new Date(),
            availableAt: new Date(Date.now() + 14 * 86400000),
          },
        },
      },
    });
    const rules = new CommissionRulesService(
      prisma,
      new WalletsService(new FinancialLedgerService()),
    );
    const first = await rules.handleRefundAdjustment(
      store.id,
      order.id,
      '100000',
      'Test first refund',
    );
    const second = await rules.handleRefundAdjustment(
      store.id,
      order.id,
      '200000',
      'Test second refund',
    );
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId },
    });
    // Refunds revoke the cumulative proportional entitlement, not repeated percentages.
    expect(wallet.pendingBalance.toFixed(2)).toBe('870000.00');
    expect(wallet.availableBalance.toFixed(2)).toBe('500000.31');
    const entries = await prisma.financialLedger.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(entries.map((entry) => entry.amount.toFixed(2))).toEqual([
      '-10000.00',
      '-20000.00',
    ]);
    expect(entries.map((entry) => entry.referenceId)).toEqual([
      first.refund.id,
      second.refund.id,
    ]);
    expect(
      entries.every(
        (entry) =>
          entry.referenceType === 'ORDER_REFUND' &&
          entry.balanceBucket === 'PENDING',
      ),
    ).toBe(true);
  });

  it('enforces signed balance invariants and owner-only ledger HTTP history', async () => {
    const result = await service.createWithdrawal(collaboratorId, {
      storeId,
      amount: '200000',
    });
    await service.createWithdrawal(otherCollaboratorId, {
      storeId,
      amount: '200000',
    });
    const entry = await prisma.financialLedger.findFirstOrThrow({
      where: { referenceId: result.request.id },
    });
    await expect(
      prisma.financialLedger.create({
        data: {
          walletId: entry.walletId,
          transactionType: 'REVERSAL',
          amount: '-1',
          balanceBefore: '10',
          balanceAfter: '100',
        },
      }),
    ).rejects.toThrow();
    const response = await fetch(`${apiUrl}/api/wallets/me/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        total: number;
        entries: Array<{ referenceId: string; amount: string }>;
      };
    };
    expect(body.data.total).toBe(1);
    expect(body.data.entries[0].referenceId).toBe(result.request.id);
    expect(body.data.entries[0].amount).toBe('-200000.00');
  });
});

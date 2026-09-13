import { randomUUID, createHash, randomBytes } from 'crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PNG } from 'pngjs';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { WalletsService } from '../wallets/wallets.service';
import { WalletSummaryService } from '../wallets/wallet-summary.service';
import { CommissionsService } from '../commissions/commissions.service';
import { CommissionCalculatorService } from '../commissions/commission-calculator.service';
import { PayoutsModule } from './payouts.module';
import { PayoutsService } from './payouts.service';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';
import { PayoutBillService } from './payout-bill.service';
import { PayoutSettingsService } from './payout-settings.service';

// No shared-database fallback. Financial fixtures are retained, not deleted.
const databaseUrl = process.env.WITHDRAWAL_TEST_DATABASE_URL;
const describeLocal = databaseUrl ? describe : describe.skip;

describeLocal(
  'FR-24 merchant payouts with real PostgreSQL and mocked private storage',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let wallets: WalletsService;
    let withdrawals: PayoutsService;
    let merchant: MerchantPayoutsService;
    let batches: PayoutBatchesService;
    let apiUrl: string;
    let collaboratorId: string;
    let ownerId: string;
    let otherOwnerId: string;
    let storeId: string;
    let otherStoreId: string;
    let merchantToken: string;
    let otherToken: string;
    let kolToken: string;
    const jwtSecret = 'fr24-local-tests-only-key';
    const validator = new PayoutBillService(
      new PayoutSettingsService(new ConfigService()),
    );
    const fakeBills = {
      get maxBillBytes() {
        return validator.maxBillBytes;
      },
      validateBill: (file: Express.Multer.File) => validator.validateBill(file),
      uploadBill: jest.fn((file: Express.Multer.File) => {
        const id = randomUUID();
        return Promise.resolve({
          publicId: `test-bills/${id}`,
          format: 'png',
          sha256: createHash('sha256').update(file.buffer).digest('hex'),
          secureUrl: `https://example.test/authenticated/${id}.png`,
        });
      }),
      removeUnusedBill: jest.fn().mockResolvedValue(undefined),
      getBillDownloadUrl: (id: string) =>
        `https://example.test/private-download/${id}?expires=120`,
    };

    function bill(): Express.Multer.File {
      const png = new PNG({ width: 2, height: 1 });
      const colors = randomBytes(6);
      for (let pixel = 0; pixel < 2; pixel++) {
        colors.copy(png.data, pixel * 4, pixel * 3, pixel * 3 + 3);
        png.data[pixel * 4 + 3] = 255;
      }
      const buffer = PNG.sync.write(png);
      return {
        originalname: 'bill.png',
        mimetype: 'image/png',
        size: buffer.length,
        buffer,
      } as Express.Multer.File;
    }

    beforeAll(async () => {
      const url = new URL(databaseUrl!);
      if (
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
        !url.pathname.endsWith('_test')
      )
        throw new Error(
          'FR-24 tests require a disposable loopback *_test database',
        );
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            load: [
              () => ({
                DATABASE_URL: databaseUrl,
                JWT_SECRET: jwtSecret,
                DB_POOL_MAX: '4',
                MIN_PAYOUT_AMOUNT: '200000',
                PAYOUT_VIETQR_BANKS: JSON.stringify([
                  { bin: '970436', code: 'VCB', name: 'Test Bank' },
                ]),
                CLOUDINARY_URL:
                  'cloudinary://local-test-key:local-test-secret@local-test-cloud',
              }),
            ],
          }),
          JwtModule.register({ secret: jwtSecret }),
          PassportModule.register({ defaultStrategy: 'jwt' }),
          PayoutsModule,
        ],
        providers: [JwtStrategy],
      })
        .overrideProvider(PayoutBillService)
        .useValue(fakeBills)
        .compile();
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
      prisma = app.get(PrismaService);
      wallets = app.get(WalletsService);
      withdrawals = app.get(PayoutsService);
      merchant = app.get(MerchantPayoutsService);
      batches = app.get(PayoutBatchesService);
    });

    beforeEach(async () => {
      fakeBills.uploadBill.mockClear();
      fakeBills.removeUnusedBill.mockClear();
      const ids: string[] = [];
      for (const role of [
        UserRole.COLLABORATOR,
        UserRole.SHOP_MANAGER,
        UserRole.SHOP_MANAGER,
      ]) {
        const user = await prisma.user.create({
          data: {
            email: `fr24-${randomUUID()}@example.test`,
            passwordHash: 'test-only-not-a-login-hash',
            fullName: 'FR-24 fixture',
            role,
            ...(role === UserRole.COLLABORATOR
              ? {
                  collaboratorProfile: {
                    create: {
                      bankName: 'Test Bank',
                      bankAccountNumber: '00123456789',
                      bankAccountName: 'TEST KOL',
                      kycStatus: 'VERIFIED',
                    },
                  },
                }
              : {}),
          },
        });
        ids.push(user.id);
      }
      [collaboratorId, ownerId, otherOwnerId] = ids;
      storeId = (
        await prisma.store.create({
          data: {
            ownerId,
            name: 'FR-24 shop A',
            slug: randomUUID(),
            defaultCommissionRate: '10',
          },
        })
      ).id;
      otherStoreId = (
        await prisma.store.create({
          data: {
            ownerId: otherOwnerId,
            name: 'FR-24 shop B',
            slug: randomUUID(),
            defaultCommissionRate: '10',
          },
        })
      ).id;
      await prisma.$transaction(async (tx) => {
        await wallets.creditAvailableBalance(
          tx,
          collaboratorId,
          new Prisma.Decimal(2500000),
          { id: randomUUID(), type: 'MONTHLY_BONUS' },
          storeId,
        );
        await wallets.creditAvailableBalance(
          tx,
          collaboratorId,
          new Prisma.Decimal(500000),
          { id: randomUUID(), type: 'MONTHLY_BONUS' },
          otherStoreId,
        );
      });
      const jwt = app.get(JwtService);
      merchantToken = jwt.sign({ sub: ownerId, role: UserRole.SHOP_MANAGER });
      otherToken = jwt.sign({ sub: otherOwnerId, role: UserRole.SHOP_MANAGER });
      kolToken = jwt.sign({ sub: collaboratorId, role: UserRole.COLLABORATOR });
    });

    afterAll(async () => {
      if (app) await app.close();
    });

    function withdraw(amount = '2000000', selectedStore = storeId) {
      return withdrawals.createWithdrawal(collaboratorId, {
        amount,
        storeId: selectedStore,
      });
    }
    async function balances() {
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { collaboratorId },
        include: { storeWallets: true },
      });
      return {
        total: wallet.availableBalance.toFixed(2),
        a: wallet.storeWallets
          .find((item) => item.storeId === storeId)!
          .availableBalance.toFixed(2),
        b: wallet.storeWallets
          .find((item) => item.storeId === otherStoreId)!
          .availableBalance.toFixed(2),
      };
    }
    function approve(id: string, reference = randomUUID(), file = bill()) {
      return merchant.approvePayout(
        storeId,
        ownerId,
        id,
        { bankRefCode: reference },
        file,
      );
    }

    it('prevents using shop B money to cover a shop A withdrawal', async () => {
      await expect(withdraw('3000000')).rejects.toThrow('tại shop');
      expect(await balances()).toEqual({
        total: '3000000.00',
        a: '2500000.00',
        b: '500000.00',
      });
      const request = await withdraw();
      expect(request.request).toMatchObject({
        storeId,
        amount: '2000000.00',
        taxAmount: '200000.00',
        netAmount: '1800000.00',
      });
      await expect(withdraw('600000', otherStoreId)).rejects.toThrow(
        'tại shop',
      );
      expect(await balances()).toEqual({
        total: '1000000.00',
        a: '500000.00',
        b: '500000.00',
      });
      const entry = await prisma.financialLedger.findFirstOrThrow({
        where: { referenceId: request.request.id },
      });
      expect(entry.storeId).toBe(storeId);
      expect(entry.storeBalanceBefore!.toFixed(2)).toBe('2500000.00');
      expect(entry.storeBalanceAfter!.toFixed(2)).toBe('500000.00');
    });

    it('serializes simultaneous store withdrawals without negative balances', async () => {
      const results = await Promise.allSettled([withdraw(), withdraw()]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(await balances()).toEqual({
        total: '1000000.00',
        a: '500000.00',
        b: '500000.00',
      });
      expect(
        await prisma.payoutRequest.count({ where: { collaboratorId } }),
      ).toBe(1);
    });

    it('refunds rejected gross once to the correct shop despite concurrent rejections', async () => {
      const request = await withdraw();
      const outcomes = await Promise.allSettled([
        merchant.rejectPayout(storeId, ownerId, request.request.id, {
          reason: 'Bank profile needs correction',
        }),
        merchant.rejectPayout(storeId, ownerId, request.request.id, {
          reason: 'Duplicate action',
        }),
      ]);
      expect(
        outcomes.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(await balances()).toEqual({
        total: '3000000.00',
        a: '2500000.00',
        b: '500000.00',
      });
      const entries = await prisma.financialLedger.findMany({
        where: { referenceId: request.request.id },
      });
      expect(entries.map((entry) => entry.transactionType).sort()).toEqual([
        'PAYOUT_REJECT_REFUND',
        'PAYOUT_WITHDRAW',
      ]);
      expect(
        entries
          .find((entry) => entry.transactionType === 'PAYOUT_REJECT_REFUND')!
          .amount.toFixed(2),
      ).toBe('2000000.00');
    });

    it('approves once with bill and audit, never debiting the wallet again', async () => {
      const request = await withdraw();
      const original = await balances();
      const file = bill();
      const results = await Promise.allSettled([
        approve(request.request.id, 'BANKREF1', file),
        approve(request.request.id, 'BANKREF1', file),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(await balances()).toEqual(original);
      const stored = await prisma.payoutRequest.findUniqueOrThrow({
        where: { id: request.request.id },
      });
      expect(stored.status).toBe('APPROVED');
      expect(stored.approvedById).toBe(ownerId);
      expect(stored.proofImagePublicId).toBeTruthy();
      expect(stored.processedAt).not.toBeNull();
      expect(
        await prisma.financialLedger.count({
          where: { referenceId: request.request.id },
        }),
      ).toBe(1);
      expect(fakeBills.removeUnusedBill).toHaveBeenCalledTimes(1);
      expect(fakeBills.removeUnusedBill).not.toHaveBeenCalledWith(
        stored.proofImagePublicId,
      );
    });

    it('rejects reuse of a bill or bank reference across separate payouts', async () => {
      const first = await withdraw('200000');
      const second = await withdraw('200000');
      const file = bill();
      await approve(first.request.id, 'REF-SAME', file);
      await expect(
        approve(second.request.id, 'REF-OTHER', file),
      ).rejects.toThrow('đã được sử dụng');
      await expect(
        approve(second.request.id, 'REF-SAME', bill()),
      ).rejects.toThrow('đã được sử dụng');
      expect(
        (
          await prisma.payoutRequest.findUniqueOrThrow({
            where: { id: second.request.id },
          })
        ).status,
      ).toBe('PENDING');
    });

    it('requires a valid multipart bill and rejects forged status at the real HTTP endpoint', async () => {
      const request = await withdraw();
      const path = `${apiUrl}/api/stores/${storeId}/payouts/${request.request.id}/approve`;
      const missing = new FormData();
      missing.append('bankRefCode', 'REF1');
      expect(
        (
          await fetch(path, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${merchantToken}` },
            body: missing,
          })
        ).status,
      ).toBe(400);
      const spoofed = new FormData();
      spoofed.append('bankRefCode', 'REF1');
      spoofed.append(
        'bill',
        new Blob(['<svg>not png</svg>'], { type: 'image/png' }),
        'bill.png',
      );
      expect(
        (
          await fetch(path, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${merchantToken}` },
            body: spoofed,
          })
        ).status,
      ).toBe(400);
      const forged = new FormData();
      forged.append('bankRefCode', 'REF1');
      forged.append('status', 'APPROVED');
      forged.append(
        'bill',
        new Blob([new Uint8Array(bill().buffer)], { type: 'image/png' }),
        'bill.png',
      );
      expect(
        (
          await fetch(path, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${merchantToken}` },
            body: forged,
          })
        ).status,
      ).toBe(400);
      expect(fakeBills.uploadBill).not.toHaveBeenCalled();
    });

    it('enforces JWT roles and store ownership for listing, approval and bill access', async () => {
      const request = await withdraw();
      const base = `${apiUrl}/api/stores/${storeId}/payouts`;
      expect((await fetch(base)).status).toBe(401);
      expect(
        (
          await fetch(base, {
            headers: { Authorization: `Bearer ${kolToken}` },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await fetch(base, {
            headers: { Authorization: `Bearer ${otherToken}` },
          })
        ).status,
      ).toBe(404);
      await expect(
        merchant.approvePayout(
          storeId,
          otherOwnerId,
          request.request.id,
          { bankRefCode: 'BAD' },
          bill(),
        ),
      ).rejects.toThrow('quyền quản lý');
      await approve(request.request.id);
      expect(
        (
          await fetch(`${base}/${request.request.id}/bill`, {
            headers: { Authorization: `Bearer ${otherToken}` },
          })
        ).status,
      ).toBe(404);
      const own = await fetch(`${base}/${request.request.id}/bill`, {
        headers: { Authorization: `Bearer ${merchantToken}` },
      });

      expect(own.status).toBe(200);
      expect(own.headers.get('cache-control')).toBe('no-store');
    });

    it('rejects oversized uploads and then approves a valid real multipart request', async () => {
      const request = await withdraw();
      const path = `${apiUrl}/api/stores/${storeId}/payouts/${request.request.id}/approve`;
      const headers = { Authorization: `Bearer ${merchantToken}` };
      const large = new FormData();
      large.append('bankRefCode', 'HTTP-REF');
      large.append(
        'bill',
        new Blob([new Uint8Array(5242881)], { type: 'image/png' }),
        'bill.png',
      );
      expect(
        (await fetch(path, { method: 'PATCH', headers, body: large })).status,
      ).toBe(413);
      const valid = new FormData();
      valid.append('bankRefCode', ' http-ref ');
      valid.append(
        'bill',
        new Blob([new Uint8Array(bill().buffer)], { type: 'image/png' }),
        'bill.png',
      );
      const response = await fetch(path, {
        method: 'PATCH',
        headers,
        body: valid,
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: { status: string; bankRefCode: string; hasBill: boolean };
      };
      expect(body.data).toMatchObject({
        status: 'APPROVED',
        bankRefCode: 'HTTP-REF',
        hasBill: true,
      });
      expect(await balances()).toEqual({
        total: '1000000.00',
        a: '500000.00',
        b: '500000.00',
      });
    });

    it('blocks legacy/unfunded payouts without silently recalculating or refunding them', async () => {
      const legacy = await prisma.payoutRequest.create({
        data: {
          collaboratorId,
          amount: '200000',
          bankName: 'Test Bank',
          bankAccountNumber: '00123456789',
          bankAccountName: 'TEST KOL',
        },
      });
      await expect(approve(legacy.id)).rejects.toThrow('không thuộc shop');
      const unfunded = await prisma.payoutRequest.create({
        data: {
          collaboratorId,
          storeId,
          amount: '200000',
          netAmount: '200000',
          taxAmount: '0',
          bankName: 'Test Bank',
          bankAccountNumber: '00123456789',
          bankAccountName: 'TEST KOL',
        },
      });
      await expect(approve(unfunded.id)).rejects.toThrow('ledger trừ tiền');
      await expect(
        merchant.rejectPayout(storeId, ownerId, unfunded.id, {
          reason: 'Unfunded',
        }),
      ).rejects.toThrow('ledger trừ tiền');
      await expect(
        batches.exportBatch(storeId, ownerId, { payoutIds: [unfunded.id] }),
      ).rejects.toThrow('ledger trừ tiền');
      expect(fakeBills.uploadBill).not.toHaveBeenCalled();
      expect(await balances()).toEqual({
        total: '3000000.00',
        a: '2500000.00',
        b: '500000.00',
      });
    });

    it('keeps payout and balances unchanged when private storage upload fails', async () => {
      const request = await withdraw();
      const original = await balances();
      fakeBills.uploadBill.mockRejectedValueOnce(
        new ServiceUnavailableException('Test storage unavailable'),
      );
      await expect(approve(request.request.id)).rejects.toThrow(
        'storage unavailable',
      );
      expect(await balances()).toEqual(original);
      expect(
        (
          await prisma.payoutRequest.findUniqueOrThrow({
            where: { id: request.request.id },
          })
        ).status,
      ).toBe('PENDING');
    });

    it('rolls back approval and removes only its unused bill if PostgreSQL fails after audit insertion', async () => {
      const request = await withdraw();
      const proxy = new Proxy(prisma, {
        get(target, property) {
          if (property !== '$transaction')
            return Reflect.get(target, property) as unknown;
          return (
            callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
          ) =>
            target.$transaction((tx) =>
              callback(
                new Proxy(tx, {
                  get(inner, name) {
                    if (name !== 'auditLog')
                      return Reflect.get(inner, name) as unknown;
                    return {
                      create: async (args: Prisma.AuditLogCreateArgs) => {
                        await inner.auditLog.create(args);
                        await inner.$executeRaw(Prisma.sql`SELECT 1/0`);
                      },
                    };
                  },
                }),
              ),
            );
        },
      });
      const failing = new MerchantPayoutsService(
        proxy,
        wallets,
        fakeBills as unknown as PayoutBillService,
      );
      await expect(
        failing.approvePayout(
          storeId,
          ownerId,
          request.request.id,
          { bankRefCode: 'FAIL-AUDIT' },
          bill(),
        ),
      ).rejects.toThrow('Không thể xác nhận');
      const stored = await prisma.payoutRequest.findUniqueOrThrow({
        where: { id: request.request.id },
      });
      expect(stored.status).toBe('PENDING');
      expect(stored.proofImagePublicId).toBeNull();
      expect(fakeBills.removeUnusedBill).toHaveBeenCalledTimes(1);
      expect(await balances()).toEqual({
        total: '1000000.00',
        a: '500000.00',
        b: '500000.00',
      });
    });

    it('creates one batch under concurrent export and downloads the exact persisted workbook', async () => {
      const first = await withdraw('200000');
      const second = await withdraw('200000');
      const dto = { payoutIds: [second.request.id, first.request.id] };
      const original = await balances();
      const results = await Promise.allSettled([
        batches.exportBatch(storeId, ownerId, dto),
        batches.exportBatch(storeId, ownerId, dto),
      ]);
      const success = results.find((result) => result.status === 'fulfilled');
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      if (!success || success.status !== 'fulfilled')
        throw new Error('Batch export failed');
      const file = success.value;
      expect(await balances()).toEqual(original);
      expect(await prisma.payoutBatch.count({ where: { storeId } })).toBe(1);
      const stored = await prisma.payoutRequest.findMany({
        where: { collaboratorId },
      });
      expect(
        stored.every(
          (item) =>
            item.status === 'PROCESSING' && item.batchId === file.batchId,
        ),
      ).toBe(true);
      const download = await batches.downloadBatch(
        storeId,
        ownerId,
        file.batchId,
      );
      expect(download.buffer.equals(file.buffer)).toBe(true);
      await expect(
        batches.downloadBatch(storeId, otherOwnerId, file.batchId),
      ).rejects.toThrow();
      await expect(
        merchant.rejectPayout(storeId, ownerId, first.request.id, {
          reason: 'Unsafe after export',
        }),
      ).rejects.toThrow('chưa đưa vào lô');
      await approve(first.request.id);
      expect(
        (
          await batches.downloadBatch(storeId, ownerId, file.batchId)
        ).buffer.equals(file.buffer),
      ).toBe(true);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      expect(workbook.getWorksheet('VietQR')!.getCell('H2').value).toBe(
        '00123456789',
      );
    });

    it('returns real XLSX download headers without a JSON envelope', async () => {
      const request = await withdraw();
      const response = await fetch(
        `${apiUrl}/api/stores/${storeId}/payouts/export-vietqr`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${merchantToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payoutIds: [request.request.id] }),
        },
      );
      expect(response.status).toBe(201);
      expect(response.headers.get('content-type')).toContain('spreadsheetml');
      expect(response.headers.get('content-disposition')).toContain('.xlsx');
      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      expect(workbook.getWorksheet('VietQR')!.getCell('L2').value).toBe(
        '1800000.00',
      );
    });

    it.each(['fractional', 'unknown-bank'])(
      'rolls back batch state for invalid export %s',
      async (kind) => {
        if (kind === 'unknown-bank')
          await prisma.collaboratorProfile.update({
            where: { userId: collaboratorId },
            data: { bankName: 'Unknown bank' },
          });
        const request = await withdraw(
          kind === 'fractional' ? '200000.10' : '200000',
        );
        await expect(
          batches.exportBatch(storeId, ownerId, {
            payoutIds: [request.request.id],
          }),
        ).rejects.toThrow();
        expect(await prisma.payoutBatch.count({ where: { storeId } })).toBe(0);
        const stored = await prisma.payoutRequest.findUniqueOrThrow({
          where: { id: request.request.id },
        });
        expect(stored.status).toBe('PENDING');
        expect(stored.batchId).toBeNull();
      },
    );

    it('rejects mixed-shop export without moving the owned request to PROCESSING', async () => {
      const own = await withdraw('200000');
      const foreign = await withdraw('200000', otherStoreId);
      await expect(
        batches.exportBatch(storeId, ownerId, {
          payoutIds: [own.request.id, foreign.request.id],
        }),
      ).rejects.toThrow('không thuộc shop');
      expect(
        (
          await prisma.payoutRequest.findUniqueOrThrow({
            where: { id: own.request.id },
          })
        ).status,
      ).toBe('PENDING');
    });

    it('rolls back both wallet balances if refund ledger insertion fails', async () => {
      const request = await withdraw();
      const failingWallets = new WalletsService({
        appendEntry: () => {
          throw new Error('Injected ledger failure');
        },
      });
      const failing = new MerchantPayoutsService(
        prisma,
        failingWallets,
        fakeBills as unknown as PayoutBillService,
      );
      await expect(
        failing.rejectPayout(storeId, ownerId, request.request.id, {
          reason: 'Test refund',
        }),
      ).rejects.toThrow('ledger failure');
      expect(await balances()).toEqual({
        total: '1000000.00',
        a: '500000.00',
        b: '500000.00',
      });
      expect(
        (
          await prisma.payoutRequest.findUniqueOrThrow({
            where: { id: request.request.id },
          })
        ).status,
      ).toBe('PENDING');
      expect(
        await prisma.financialLedger.count({
          where: { referenceId: request.request.id },
        }),
      ).toBe(1);
    });

    it('keeps legacy balances unallocated and unavailable for arbitrary-shop withdrawal', async () => {
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { collaboratorId },
      });
      await prisma.$transaction((tx) =>
        wallets.creditAvailableBalance(
          tx,
          collaboratorId,
          new Prisma.Decimal(1000000),
          { id: randomUUID(), type: 'MONTHLY_BONUS' },
        ),
      );
      const summary = await app
        .get(WalletSummaryService)
        .getMyWallet(collaboratorId);
      expect(summary.unallocatedAvailableBalance).toBe('1000000.00');
      await expect(withdraw('3500000')).rejects.toThrow('tại shop');
      expect(
        await prisma.financialLedger.count({
          where: { walletId: wallet.id, storeId: null },
        }),
      ).toBe(1);
    });

    it('tracks new commission through the unchanged 14-day approval and clawback in its shop', async () => {
      const product = await prisma.product.create({
        data: {
          storeId,
          sku: randomUUID(),
          title: 'Ledger product',
          price: '1000000',
        },
      });
      const order = await prisma.order.create({
        data: {
          storeId,
          externalOrderSn: randomUUID(),
          attributedCollaboratorId: collaboratorId,
          subtotalAmount: '1000000',
          finalAmount: '1000000',
          status: 'COMPLETED',
          completedAt: new Date(),
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: '1000000',
              appliedCommissionRate: '0',
              calculatedCommissionAmount: '0',
            },
          },
        },
      });
      const engine = new CommissionsService(
        prisma,
        new CommissionCalculatorService(),
        wallets,
      );
      expect(await engine.createPendingCommission(order.id)).toBe(true);
      const commission = await prisma.commission.findFirstOrThrow({
        where: { orderId: order.id },
      });
      expect(commission.storeWalletTracked).toBe(true);
      const early = new Date(commission.availableAt.getTime() - 1);
      expect(await engine.approveMatureCommission(commission.id, early)).toBe(
        false,
      );
      expect(
        await engine.approveMatureCommission(
          commission.id,
          commission.availableAt,
        ),
      ).toBe(true);
      expect((await balances()).a).toBe('2600000.00');
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'RETURNED' },
      });
      expect(await engine.reverseCommission(commission.id)).toBe(true);
      expect((await balances()).a).toBe('2500000.00');
      const entries = await prisma.financialLedger.findMany({
        where: { referenceId: commission.id },
      });
      expect(entries).toHaveLength(4);
      expect(entries.every((entry) => entry.storeId === storeId)).toBe(true);
    });
  },
);

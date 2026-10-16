import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { AuthController } from '../auth/auth.controller';
import { MailService } from '../auth/mail.service';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerIdentityService } from './customer-identity.service';
import {
  importLegacyIdentities,
  parseLegacyIdentities,
} from './customer-identity-import';

const connectionString = process.env.IDENTITY_TEST_DATABASE_URL;
(connectionString ? describe : describe.skip)(
  'Customer identity with real migrations and HTTP',
  () => {
    let prisma: PrismaClient;
    let pool: Pool;
    let app: INestApplication;
    let customerId: string;
    let otherId: string;
    let token: string;
    let otherToken: string;
    const input = {
      fullName: 'Identity Test Customer',
      idCardNumber: '001202012345',
      address: '123 Test Street',
    };

    beforeAll(async () => {
      const url = new URL(connectionString!);
      // Hard guard: never run destructive or test writes against the team's DB.
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.port !== '55433' ||
        url.pathname !== '/scanms_seed_test'
      ) {
        throw new Error(
          'Only isolated local scanms_seed_test on port 55433 is allowed.',
        );
      }
      const schema = `identity_test_${randomUUID().replace(/-/g, '')}`;
      url.searchParams.set('schema', schema);
      pool = new Pool({ connectionString: url.toString(), max: 4 });
      // Fresh schema only. Never reset/drop or touch any previous test schema.
      await pool.query(`CREATE SCHEMA "${schema}"`);
      await promisify(execFile)(
        process.execPath,
        [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
        {
          cwd: resolve(__dirname, '../../..'),
          timeout: 120000,
          windowsHide: true,
          env: {
            ...process.env,
            DATABASE_URL: url.toString(),
            DIRECT_URL: url.toString(),
          },
        },
      );
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      const customer = await prisma.user.create({
        data: {
          email: 'identity1@example.test',
          fullName: 'Original Customer',
          passwordHash: 'test-only',
          role: UserRole.CUSTOMER,
        },
      });
      const other = await prisma.user.create({
        data: {
          email: 'identity2@example.test',
          fullName: 'Other Customer',
          passwordHash: 'test-only',
          role: UserRole.CUSTOMER,
        },
      });
      customerId = customer.id;
      otherId = other.id;
      const secret = 'isolated-identity-test-secret-not-for-real-use';
      const module = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret }),
          PassportModule.register({ defaultStrategy: 'jwt' }),
        ],
        controllers: [CustomerController, AuthController],
        providers: [
          CustomerService,
          CustomerIdentityService,
          AuthService,
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: new ConfigService({ JWT_SECRET: secret }),
          },
          { provide: PrismaService, useValue: prisma },
          {
            provide: MailService,
            useValue: {
              sendLoginSecurityAlert: jest.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();
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
      const jwt = module.get(JwtService);
      token = jwt.sign({ sub: customerId, role: UserRole.CUSTOMER });
      otherToken = jwt.sign({ sub: otherId, role: UserRole.CUSTOMER });
    }, 120000);

    afterAll(async () => {
      await app?.close();
      await prisma?.$disconnect();
      await pool?.end();
    });

    it('requires authentication for identity reads and writes', async () => {
      await request(app.getHttpServer())
        .get('/api/customer/identity')
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/customer/identity')
        .send(input)
        .expect(401);
    });

    it('does not provision missing demo accounts via the login API', async () => {
      const before = await prisma.user.count();
      for (const email of ['customer@scanms.vn', 'manager@scanms.vn']) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: 'Password@123' })
          .expect(401);
      }
      expect(await prisma.user.count()).toBe(before);
    });

    it('rejects fixed-code password reset through the public API without touching the hash', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password/reset')
        .send({
          email: 'identity1@example.test',
          otp: '123456',
          newPassword: 'ChangedPassword2026!',
        })
        .expect(400);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: customerId } }))
          .passwordHash,
      ).toBe('test-only');
    });

    it('rejects public registration of administrative roles at HTTP validation', async () => {
      for (const role of [UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER]) {
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'admin-attempt@example.test',
            password: 'Changed2026!',
            fullName: 'Admin Attempt',
            role,
            otp: '123456',
          })
          .expect(400);
      }
      expect(
        await prisma.user.findUnique({
          where: { email: 'admin-attempt@example.test' },
        }),
      ).toBeNull();
    });

    it('logs in a legacy bcrypt account, upgrades it and changes its password through HTTP', async () => {
      const email = 'legacy-password@example.test';
      const legacy = await prisma.user.create({
        data: {
          email,
          fullName: 'Legacy Customer',
          role: UserRole.CUSTOMER,
          passwordHash: await bcrypt.hash('OriginalPassword2026!', 10),
        },
      });
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'OriginalPassword2026!' })
        .expect(200);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: legacy.id } }))
          .passwordHash,
      ).toMatch(/^\$argon2id\$/);
      await request(app.getHttpServer())
        .post('/api/customer/change-password')
        .auth(login.body.accessToken as string, { type: 'bearer' })
        .send({
          currentPassword: 'OriginalPassword2026!',
          newPassword: 'ReplacementPassword2026!',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'OriginalPassword2026!' })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'ReplacementPassword2026!' })
        .expect(200);
    });

    it('rejects a forged userId and invalid 10/11-digit IDs', async () => {
      await request(app.getHttpServer())
        .post('/api/customer/identity')
        .auth(token, { type: 'bearer' })
        .send({ ...input, userId: otherId })
        .expect(400);
      for (const idCardNumber of ['1234567890', '12345678901']) {
        await request(app.getHttpServer())
          .post('/api/customer/identity')
          .auth(token, { type: 'bearer' })
          .send({ ...input, idCardNumber })
          .expect(400);
      }
      expect(await prisma.customerIdentity.count()).toBe(0);
    });

    it('persists and reads the declaration only for its owner', async () => {
      await request(app.getHttpServer())
        .post('/api/customer/identity')
        .auth(token, { type: 'bearer' })
        .send(input)
        .expect(201);
      const own = await request(app.getHttpServer())
        .get('/api/customer/identity')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(own.body).toMatchObject({
        ...input,
        isVerified: true,
        verificationMethod: 'SELF_DECLARED',
      });
      const other = await request(app.getHttpServer())
        .get('/api/customer/identity')
        .auth(otherToken, { type: 'bearer' })
        .expect(200);
      expect(other.body).toMatchObject({ isVerified: false, idCardNumber: '' });
      expect(await prisma.customerIdentity.count()).toBe(1);
    });

    it('rolls back the account name when the identity write fails', async () => {
      const failingClient = prisma.$extends({
        query: {
          customerIdentity: {
            upsert() {
              throw new Error('Injected identity write failure');
            },
          },
        },
      });
      const service = new CustomerIdentityService(
        failingClient as unknown as PrismaService,
      );
      await expect(service.confirm(otherId, input)).rejects.toThrow();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: otherId } }))
          .fullName,
      ).toBe('Other Customer');
      expect(
        await prisma.customerIdentity.findUnique({
          where: { userId: otherId },
        }),
      ).toBeNull();
    });

    it('serializes concurrent declarations without duplicate rows or inconsistent names', async () => {
      const service = new CustomerIdentityService(
        prisma as unknown as PrismaService,
      );
      await Promise.all(
        ['First Customer', 'Second Customer'].map((fullName) =>
          service.confirm(customerId, { ...input, fullName }),
        ),
      );
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: customerId },
        include: { customerIdentity: true },
      });
      expect(user.fullName).toBe(user.customerIdentity?.fullName);
      expect(
        await prisma.customerIdentity.count({ where: { userId: customerId } }),
      ).toBe(1);
    });

    it('imports legacy records once and preserves newer database declarations', async () => {
      const rows = parseLegacyIdentities({
        [otherId]: { ...input, verifiedAt: '2026-10-16T05:00:00Z' },
      });
      await expect(importLegacyIdentities(prisma, rows)).resolves.toEqual({
        imported: 1,
        preserved: 0,
      });
      const service = new CustomerIdentityService(
        prisma as unknown as PrismaService,
      );
      await service.confirm(otherId, { ...input, fullName: 'New Declaration' });
      await expect(importLegacyIdentities(prisma, rows)).resolves.toEqual({
        imported: 0,
        preserved: 1,
      });
      expect(
        (
          await prisma.customerIdentity.findUniqueOrThrow({
            where: { userId: otherId },
          })
        ).fullName,
      ).toBe('New Declaration');
    });

    it('does not change reviewed collaborator KYC when saving a buyer declaration', async () => {
      await prisma.collaboratorProfile.create({
        data: {
          userId: customerId,
          idCardNumber: '999999999999',
          kycStatus: 'VERIFIED',
          bankName: 'Test Bank',
          bankAccountName: 'Test Customer',
          bankAccountNumber: '0000000000',
        },
      });
      await new CustomerIdentityService(
        prisma as unknown as PrismaService,
      ).confirm(customerId, input);
      const profile = await prisma.collaboratorProfile.findUniqueOrThrow({
        where: { userId: customerId },
      });
      expect(profile.idCardNumber).toBe('999999999999');
      expect(profile.kycStatus).toBe('VERIFIED');
    });
  },
);

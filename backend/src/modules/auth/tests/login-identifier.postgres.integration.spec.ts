import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { MailService } from '../mail.service';

const connectionString = process.env.AUTH_TEST_DATABASE_URL;
(connectionString ? describe : describe.skip)(
  'Email/phone login on isolated PostgreSQL',
  () => {
    let pool: Pool;
    let prisma: PrismaClient;
    let app: INestApplication;
    let jwt: JwtService;
    let userId: string;
    const email = 'phone-login@example.test';
    const password = 'PhoneLoginTest2026!';
    let passwordHash: string;

    beforeAll(async () => {
      const url = new URL(connectionString!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.port !== '55433' ||
        url.pathname !== '/scanms_seed_test'
      ) {
        throw new Error(
          'Only isolated loopback scanms_seed_test on port 55433 is allowed.',
        );
      }
      const schema = `phone_login_${randomUUID().replace(/-/g, '')}`;
      url.searchParams.set('schema', schema);
      pool = new Pool({
        connectionString: url.toString(),
        max: 3,
        // Prisma model queries and the parameterized phone query use the same schema.
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA "${schema}"`);
      await promisify(execFile)(
        process.execPath,
        [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
        {
          cwd: resolve(__dirname, '../../../..'),
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
      passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: 'Phone Login Test',
          role: UserRole.CUSTOMER,
          phoneNumber: '+84 (901) 234-567',
        },
      });
      userId = user.id;
      const module = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret: 'local-phone-login-test-secret-only' }),
        ],
        controllers: [AuthController],
        providers: [
          AuthService,
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
      jwt = module.get(JwtService);
    }, 120000);

    afterAll(async () => {
      await app?.close();
      await prisma?.$disconnect();
      await pool?.end();
      // New disposable schema is retained; never reset/drop any existing database.
    });

    it.each(['0901234567', '+84901234567', '84 901 234 567', '0901.234.567'])(
      'logs into the same owner from %s despite stored legacy separators',
      async (identifier) => {
        const result = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ identifier, password })
          .expect(200);
        expect(result.body.user.id).toBe(userId);
        expect(jwt.verify(result.body.accessToken).sub).toBe(userId);
        expect(result.body.user).not.toHaveProperty('passwordHash');
      },
    );

    it.each([
      { identifier: ' PHONE-LOGIN@EXAMPLE.TEST ' },
      { email },
      { email: '+84901234567' },
    ])('supports canonical email and legacy payloads %p', async (fields) => {
      const result = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ ...fields, password })
        .expect(200);
      expect(result.body.user.id).toBe(userId);
    });

    it.each([
      {},
      { identifier: '0901abc234567' },
      { identifier: "0901234567' OR 1=1--" },
      { identifier: '0901234567', email },
      { identifier: '0901234567', role: 'SYSTEM_ADMIN' },
    ])(
      'rejects malformed/conflicting/privileged HTTP fields %p',
      async (fields) => {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ ...fields, password })
          .expect(400);
      },
    );

    it('returns the same generic 401 for unknown phone and wrong password', async () => {
      const unknown = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: '0399999999', password })
        .expect(401);
      const wrong = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: '0901234567', password: 'WrongPassword2026!' })
        .expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
      expect(wrong.body.accessToken).toBeUndefined();
    });

    it('does not choose an account or role when normalized phone numbers are duplicated', async () => {
      await prisma.user.create({
        data: {
          email: 'duplicate-phone@example.test',
          passwordHash,
          fullName: 'Different Shop Owner',
          phoneNumber: '0901234567',
          role: UserRole.SHOP_MANAGER,
        },
      });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: '+84 901 234 567', password })
        .expect(401);
      // Email remains an unambiguous recovery path and preserves the actual role.
      const result = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: email, password })
        .expect(200);
      expect(result.body.user.id).toBe(userId);
      expect(result.body.user.role).toBe(UserRole.CUSTOMER);
    });

    it('honors inactive accounts and ignores deleted phone owners', async () => {
      await prisma.user.create({
        data: {
          email: 'inactive-phone@example.test',
          passwordHash,
          fullName: 'Inactive Phone Test',
          phoneNumber: '0801234567',
          isActive: false,
        },
      });
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: '+84801234567', password })
        .expect(403);
      const active = await prisma.user.create({
        data: {
          email: 'active-phone@example.test',
          passwordHash,
          fullName: 'Active Phone Test',
          phoneNumber: '0701234567',
          role: UserRole.CUSTOMER,
        },
      });
      await prisma.user.create({
        data: {
          email: 'deleted-phone@example.test',
          passwordHash,
          fullName: 'Deleted Phone Test',
          phoneNumber: '+84701234567',
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      const result = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: '0701234567', password })
        .expect(200);
      expect(result.body.user.id).toBe(active.id);
    });
  },
);

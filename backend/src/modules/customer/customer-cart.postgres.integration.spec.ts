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
import { PrismaService } from '../../core/database/prisma.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../auth/mail.service';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerIdentityService } from './customer-identity.service';

const connectionString = process.env.CART_TEST_DATABASE_URL;
(connectionString ? describe : describe.skip)(
  'Central customer cart on PostgreSQL',
  () => {
    let prisma: PrismaClient;
    let pool: Pool;
    let app: INestApplication;
    let token: string;
    let otherToken: string;
    let customerId: string;
    let otherId: string;
    const productId = '550e8400-e29b-51d4-a716-446655440000';
    const variantId = '550e8400-e29b-51d4-a716-446655440001';

    beforeAll(async () => {
      const url = new URL(connectionString!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.port !== '55433' ||
        url.pathname !== '/scanms_seed_test'
      ) {
        throw new Error(
          'Only the isolated loopback scanms_seed_test database on port 55433 is allowed.',
        );
      }
      const schema = `cart_test_${randomUUID().replace(/-/g, '')}`;
      url.searchParams.set('schema', schema);
      pool = new Pool({ connectionString: url.toString(), max: 3 });
      // A new schema per run; never reset/drop the team's DB or previous tests.
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
          email: 'cart-owner@example.test',
          fullName: 'Cart Customer',
          passwordHash: 'test-only',
          role: UserRole.CUSTOMER,
        },
      });
      const other = await prisma.user.create({
        data: {
          email: 'other-cart@example.test',
          fullName: 'Other Customer',
          passwordHash: 'test-only',
          role: UserRole.CUSTOMER,
        },
      });
      const owner = await prisma.user.create({
        data: {
          email: 'cart-shop@example.test',
          fullName: 'Cart Shop Owner',
          passwordHash: 'test-only',
          role: UserRole.SHOP_MANAGER,
        },
      });
      customerId = customer.id;
      otherId = other.id;
      const store = await prisma.store.create({
        data: {
          ownerId: owner.id,
          name: 'Cart Test Store',
          slug: 'cart-test-store',
        },
      });
      await prisma.product.create({
        data: {
          id: productId,
          storeId: store.id,
          title: 'UUID v5 Cart Product',
          sku: 'CART-TEST-V5',
          price: 100000,
          stockQuantity: 10,
          isActive: true,
          moderationStatus: 'APPROVED',
          variants: {
            create: {
              id: variantId,
              name: 'Test variant',
              sku: 'CART-TEST-VARIANT-V5',
              price: 100000,
              stockQuantity: 10,
              isActive: true,
            },
          },
        },
      });
      const secret = 'isolated-cart-test-secret-not-for-production';
      const module = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret }),
          PassportModule.register({ defaultStrategy: 'jwt' }),
        ],
        controllers: [CustomerController],
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
          { provide: MailService, useValue: {} },
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

    it('accepts UUID v5, persists the product and restores it on an independent GET after reload', async () => {
      await request(app.getHttpServer())
        .put('/api/customer/cart')
        .auth(token, { type: 'bearer' })
        .send({ items: [{ productId, variantId, quantity: 2 }] })
        .expect(200);
      expect(
        await prisma.customerCartItem.count({
          where: { userId: customerId, productId, variantId, quantity: 2 },
        }),
      ).toBe(1);
      // A fresh request reads PostgreSQL, not the optimistic FE cart or localStorage.
      const restored = await request(app.getHttpServer())
        .get('/api/customer/cart')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(restored.body.items).toHaveLength(1);
      expect(restored.body.items[0]).toMatchObject({
        productId,
        variantId,
        quantity: 2,
        cartItemId: `${productId}_${variantId}`,
      });
    });

    it('updates quantity without duplicating the saved product', async () => {
      await request(app.getHttpServer())
        .put('/api/customer/cart')
        .auth(token, { type: 'bearer' })
        .send({ items: [{ productId, variantId, quantity: 3 }] })
        .expect(200);
      expect(
        await prisma.customerCartItem.count({ where: { userId: customerId } }),
      ).toBe(1);
      const restored = await request(app.getHttpServer())
        .get('/api/customer/cart')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(restored.body.items[0].quantity).toBe(3);
    });

    it('does not expose the cart or allow a forged owner to another customer', async () => {
      const other = await request(app.getHttpServer())
        .get('/api/customer/cart')
        .auth(otherToken, { type: 'bearer' })
        .expect(200);
      expect(other.body.items).toEqual([]);
      await request(app.getHttpServer())
        .put('/api/customer/cart')
        .auth(otherToken, { type: 'bearer' })
        .send({ userId: customerId, items: [] })
        .expect(400);
      expect(
        await prisma.customerCartItem.count({ where: { userId: customerId } }),
      ).toBe(1);
      expect(
        await prisma.customerCartItem.count({ where: { userId: otherId } }),
      ).toBe(0);
    });

    it('rejects malformed variant IDs without clearing the existing cart', async () => {
      await request(app.getHttpServer())
        .put('/api/customer/cart')
        .auth(token, { type: 'bearer' })
        .send({
          items: [{ productId, variantId: 'SKU-NOT-A-UUID', quantity: 1 }],
        })
        .expect(400);
      expect(
        await prisma.customerCartItem.count({
          where: { userId: customerId, variantId, quantity: 3 },
        }),
      ).toBe(1);
    });

    it('requires a valid session to save or read a cart', async () => {
      await request(app.getHttpServer()).get('/api/customer/cart').expect(401);
      await request(app.getHttpServer())
        .put('/api/customer/cart')
        .send({ items: [] })
        .expect(401);
    });
  },
);

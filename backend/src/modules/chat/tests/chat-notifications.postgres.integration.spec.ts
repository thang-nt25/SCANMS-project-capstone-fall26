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
import { AddressInfo } from 'node:net';
import request from 'supertest';
import { PrismaService } from '../../../core/database/prisma.service';
import { CloudinaryService } from '../../../core/cloudinary/cloudinary.service';
import { JwtStrategy } from '../../../common/strategies/jwt.strategy';
import { ChatController } from '../chat.controller';
import { ChatGateway } from '../chat.gateway';
import { ChatService } from '../chat.service';
import { NotificationsController } from '../../notifications/notifications.controller';
import { NotificationsService } from '../../notifications/notifications.service';

interface TestSocket {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  connect(): void;
  disconnect(): void;
}

const connectionString = process.env.CHAT_TEST_DATABASE_URL;
(connectionString ? describe : describe.skip)(
  'Shop replies → customer notifications (real PostgreSQL + Socket.IO)',
  () => {
    let prisma: PrismaClient;
    let pool: Pool;
    let app: INestApplication;
    let jwt: JwtService;
    let customerId: string;
    let ownerId: string;
    let otherId: string;
    let conversationId: string;
    let customerToken: string;
    let otherToken: string;
    let customer: TestSocket;
    let shop: TestSocket;
    let other: TestSocket;
    let otherShop: TestSocket;
    const sockets: TestSocket[] = [];
    const customerEvents: any[] = [];
    const otherEvents: any[] = [];
    const otherShopEvents: any[] = [];
    const firstMessageId = randomUUID();

    const waitFor = (socket: TestSocket, event: string) =>
      new Promise<any>((resolveEvent, reject) => {
        const listener = (payload: unknown) => {
          clearTimeout(timer);
          socket.off(event, listener);
          resolveEvent(payload);
        };
        const timer = setTimeout(() => {
          socket.off(event, listener);
          reject(new Error(`Timed out waiting for ${event}`));
        }, 8000);
        socket.on(event, listener);
      });

    const send = (socket: TestSocket, messageId: string, messageText: string) =>
      new Promise<{ ok: boolean }>((resolveAck, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Missing send acknowledgment')),
          8000,
        );
        socket.emit(
          'send_message',
          { conversationId, messageId, messageText },
          (result: { ok: boolean }) => {
            clearTimeout(timer);
            resolveAck(result);
          },
        );
      });

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
      const schema = `chat_test_${randomUUID().replace(/-/g, '')}`;
      url.searchParams.set('schema', schema);
      pool = new Pool({ connectionString: url.toString(), max: 4 });
      // Add an isolated schema; never reset/drop or mutate an existing DB schema.
      await pool.query(`CREATE SCHEMA "${schema}"`);
      await promisify(execFile)(
        process.execPath,
        [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
        {
          cwd: resolve(__dirname, '../../../..'),
          windowsHide: true,
          timeout: 120000,
          env: {
            ...process.env,
            DATABASE_URL: url.toString(),
            DIRECT_URL: url.toString(),
          },
        },
      );
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      const createUser = (email: string, role: UserRole) =>
        prisma.user.create({
          data: {
            email,
            role,
            fullName: 'Chat test participant',
            passwordHash: 'test-only',
          },
        });
      const [buyer, owner, stranger, strangerShop] = await Promise.all([
        createUser('buyer@example.test', UserRole.CUSTOMER),
        createUser('shop@example.test', UserRole.SHOP_MANAGER),
        createUser('other@example.test', UserRole.CUSTOMER),
        createUser('other-shop@example.test', UserRole.SHOP_MANAGER),
      ]);
      customerId = buyer.id;
      ownerId = owner.id;
      otherId = stranger.id;
      const store = await prisma.store.create({
        data: {
          ownerId,
          name: 'Integration Test Shop',
          slug: 'integration-test-shop',
        },
      });
      const conversation = await prisma.conversation.create({
        data: { storeId: store.id, customerId },
      });
      conversationId = conversation.id;
      const secret = 'isolated-chat-notification-test-secret';
      const module = await Test.createTestingModule({
        imports: [
          JwtModule.register({ secret }),
          PassportModule.register({ defaultStrategy: 'jwt' }),
        ],
        controllers: [ChatController, NotificationsController],
        providers: [
          ChatService,
          ChatGateway,
          NotificationsService,
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: new ConfigService({ JWT_SECRET: secret }),
          },
          { provide: PrismaService, useValue: prisma },
          { provide: CloudinaryService, useValue: {} },
        ],
      }).compile();
      app = module.createNestApplication({ logger: false });
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.listen(0, '127.0.0.1');
      jwt = module.get(JwtService);
      const address = app.getHttpServer().address() as AddressInfo;
      // Reuse the installed FE client; installing both packages is required for this opt-in test.
      const { io } = require(
        resolve(
          __dirname,
          '../../../../../frontend/node_modules/socket.io-client',
        ),
      ) as {
        io: (url: string, options: object) => TestSocket;
      };
      const connect = async (id: string, role: UserRole) => {
        const socket = io(`http://127.0.0.1:${address.port}/chat`, {
          auth: { token: jwt.sign({ sub: id, role }) },
          autoConnect: false,
          transports: ['websocket'],
        });
        sockets.push(socket);
        const ready = waitFor(socket, 'connected');
        socket.on('error', () => undefined);
        socket.connect();
        await ready;
        return socket;
      };
      customerToken = jwt.sign({ sub: customerId, role: UserRole.CUSTOMER });
      otherToken = jwt.sign({ sub: otherId, role: UserRole.CUSTOMER });
      customer = await connect(customerId, UserRole.CUSTOMER);
      shop = await connect(ownerId, UserRole.SHOP_MANAGER);
      other = await connect(otherId, UserRole.CUSTOMER);
      otherShop = await connect(strangerShop.id, UserRole.SHOP_MANAGER);
      customer.on('new_message', (message) => customerEvents.push(message));
      other.on('new_message', (message) => otherEvents.push(message));
      otherShop.on('new_message', (message) => otherShopEvents.push(message));
    }, 120000);

    afterAll(async () => {
      sockets.forEach((socket) => socket.disconnect());
      await app?.close();
      await prisma?.$disconnect();
      await pool?.end();
    });

    it('notifies the customer without joining the conversation room, with a durable deep link and unread badge', async () => {
      const incoming = waitFor(customer, 'new_message');
      expect(
        (await send(shop, firstMessageId, 'Shop đã nhận câu hỏi của bạn')).ok,
      ).toBe(true);
      expect(await incoming).toMatchObject({
        id: firstMessageId,
        conversationId,
        senderId: ownerId,
      });
      const badge = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .auth(customerToken, { type: 'bearer' })
        .expect(200);
      expect(badge.body.unreadCount).toBe(1);
      const history = await request(app.getHttpServer())
        .get('/api/notifications')
        .auth(customerToken, { type: 'bearer' })
        .expect(200);
      expect(history.body.items).toEqual([
        expect.objectContaining({
          id: firstMessageId,
          type: 'CHAT_MESSAGE',
          isRead: false,
          data: expect.objectContaining({
            conversationId,
            actionUrl: `/chat?conversationId=${conversationId}`,
          }),
        }),
      ]);
      expect(
        await prisma.notification.count({ where: { userId: ownerId } }),
      ).toBe(0);
    });

    it('does not duplicate persisted messages or notifications when the sender retries', async () => {
      expect((await send(shop, firstMessageId, 'Retry')).ok).toBe(true);
      expect(
        await prisma.chatMessage.count({ where: { id: firstMessageId } }),
      ).toBe(1);
      expect(
        await prisma.notification.count({ where: { userId: customerId } }),
      ).toBe(1);
      expect(customerEvents.length).toBeGreaterThanOrEqual(1);
      expect(otherEvents).toEqual([]);
      expect(otherShopEvents).toEqual([]);
    });

    it('rejects another customer reading or sending into this conversation, and isolates notifications', async () => {
      await request(app.getHttpServer())
        .patch(`/api/chat/conversations/${conversationId}/read`)
        .auth(otherToken, { type: 'bearer' })
        .expect(403);
      expect((await send(other, randomUUID(), 'Unauthorized')).ok).toBe(false);
      const badge = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .auth(otherToken, { type: 'bearer' })
        .expect(200);
      expect(badge.body.unreadCount).toBe(0);
      expect(
        await prisma.chatMessage.count({ where: { conversationId } }),
      ).toBe(1);
    });

    it('marks the message and notification read atomically and updates the header user room', async () => {
      const read = waitFor(customer, 'messages_read');
      await request(app.getHttpServer())
        .patch(`/api/chat/conversations/${conversationId}/read`)
        .auth(customerToken, { type: 'bearer' })
        .expect(200);
      expect(await read).toMatchObject({
        conversationId,
        readerId: customerId,
      });
      expect(
        (
          await prisma.chatMessage.findUniqueOrThrow({
            where: { id: firstMessageId },
          })
        ).isRead,
      ).toBe(true);
      expect(
        (
          await prisma.notification.findUniqueOrThrow({
            where: { id: firstMessageId },
          })
        ).isRead,
      ).toBe(true);
      const badge = await request(app.getHttpServer())
        .get('/api/notifications/unread-count')
        .auth(customerToken, { type: 'bearer' })
        .expect(200);
      expect(badge.body.unreadCount).toBe(0);
    });

    it('persists an offline reply for reload and sends a customer message to only the shop owner', async () => {
      customer.disconnect();
      const offlineId = randomUUID();
      expect(
        (await send(shop, offlineId, 'Tin nhắn khi khách chưa kết nối')).ok,
      ).toBe(true);
      const history = await request(app.getHttpServer())
        .get('/api/notifications')
        .auth(customerToken, { type: 'bearer' })
        .expect(200);
      expect(history.body.unreadCount).toBe(1);
      expect(
        history.body.items.some(
          (item: { id: string }) => item.id === offlineId,
        ),
      ).toBe(true);
      const reconnected = waitFor(customer, 'connected');
      customer.connect();
      await reconnected;
      const customerMessageId = randomUUID();
      expect(
        (await send(customer, customerMessageId, 'Khách trả lời')).ok,
      ).toBe(true);
      const ownerNotification = await prisma.notification.findUniqueOrThrow({
        where: { id: customerMessageId },
      });
      expect(ownerNotification.userId).toBe(ownerId);
      expect(ownerNotification.data).toMatchObject({
        actionUrl: `/merchant/customer-messages?conversationId=${conversationId}`,
      });
    });

    it('rolls back the message if notification insertion fails', async () => {
      const collisionId = randomUUID();
      await prisma.notification.create({
        data: {
          id: collisionId,
          userId: otherId,
          type: 'SYSTEM',
          title: 'Test collision',
          message: 'Test only',
        },
      });
      const before = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
      });
      expect((await send(shop, collisionId, 'Must roll back')).ok).toBe(false);
      expect(
        await prisma.chatMessage.count({ where: { id: collisionId } }),
      ).toBe(0);
      const after = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
      });
      expect(after.lastMessageAt).toEqual(before.lastMessageAt);
    });
  },
);

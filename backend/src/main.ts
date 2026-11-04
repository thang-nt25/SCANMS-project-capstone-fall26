import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { frontendCorsOrigin } from './common/cors-origin';

const cookieParser = require('cookie-parser');

async function bootstrap() {
  // Bắt buộc biến môi trường JWT_SECRET trong môi trường Production & Runtime
  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    console.error(
      'FATAL ERROR: Biến môi trường JWT_SECRET chưa được cấu hình. Hệ thống từ chối khởi động để đảm bảo an toàn bảo mật!',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());

  // Cấu hình Trust Proxy an toàn: Mặc định false, chỉ bật khi cấu hình rõ ràng với proxy tin cậy
  const httpAdapter = app.getHttpAdapter().getInstance();
  if (typeof httpAdapter?.set === 'function') {
    const isTrustProxy =
      process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
    const trustedProxies = process.env.TRUSTED_PROXIES || 'loopback';
    httpAdapter.set('trust proxy', isTrustProxy ? trustedProxies : false);
  }

  app.setGlobalPrefix('api', {
    exclude: [
      'r/:shortCode',
      'api/r/:shortCode',
      'r/rate-limit/health',
      'api/referral-links/rate-limit/health',
      { path: 'p/:idOrSlug', method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: frontendCorsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Idempotency-Key',
      'X-Skip-Cache',
      'x-skip-cache',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('SCANMS API Documentation (FA26SE032)')
    .setDescription(
      'Hệ thống Quản lý Mạng lưới Tiếp thị Liên kết & Cộng tác viên Bán hàng (SCANMS) - RESTful API UI',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Authorization',
        description: 'Nhập JWT Token (Bearer token)',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'SCANMS API Docs',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SCANMS Backend is running on: http://localhost:${port}/api`);
  console.log(`📑 Swagger Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();

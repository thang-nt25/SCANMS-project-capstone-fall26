import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ShippingController } from './shipping.controller';
import { GhnService } from './ghn.service';
import { PrismaService } from '../../core/database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';

// Exercise the actual controller and cart/package logic without a DB or carrier connection.
describe('Checkout shipping quote HTTP regression', () => {
  let app: INestApplication;
  let service: GhnService;
  let carrierQuote: jest.SpyInstance;
  const productId = '11111111-1111-4111-8111-111111111111';
  const prisma = { product: { findMany: jest.fn() } };
  const product = {
    id: productId,
    price: 350000,
    barcode: '4006381333932',
    variants: [],
    packageWeight: 500,
    packageLength: 20,
    packageWidth: 15,
    packageHeight: 10,
  };
  const payload = {
    storeId: 'test-store',
    address: 'Synthetic delivery address',
    items: [{ productId, quantity: 1 }],
  };

  beforeAll(async () => {
    service = new GhnService(
      prisma as unknown as PrismaService,
      {} as ConfigService,
    );
    carrierQuote = jest.spyOn(service, 'quoteAddress');
    const module = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [
        RolesGuard,
        { provide: GhnService, useValue: service },
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findMany.mockResolvedValue([product]);
    carrierQuote.mockResolvedValue({
      totalFee: 27500,
      isRealGhn: true,
      districtId: 1442,
      wardCode: '20101',
    });
  });

  afterAll(async () => {
    carrierQuote?.mockRestore();
    await app?.close();
  });

  it('returns the quoted fee and measured parcel despite an invalid historical barcode', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/shipping/ghn/quote-address')
      .send(payload)
      .expect(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalFee: 27500,
          shippingPackage: { weight: 500, length: 20, width: 15, height: 10 },
        }),
      }),
    );
    expect(carrierQuote).toHaveBeenCalledWith(
      payload.address,
      500,
      350000,
      payload.storeId,
      { weight: 500, length: 20, width: 15, height: 10 },
    );
  });

  it('rejects invalid item quantity before accessing persistence or carrier', async () => {
    await request(app.getHttpServer())
      .post('/api/shipping/ghn/quote-address')
      .send({ ...payload, items: [{ productId, quantity: 0 }] })
      .expect(400);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(carrierQuote).not.toHaveBeenCalled();
  });

  it('still blocks incomplete physical measurements', async () => {
    prisma.product.findMany.mockResolvedValue([
      { ...product, packageWeight: null },
    ]);
    const response = await request(app.getHttpServer())
      .post('/api/shipping/ghn/quote-address')
      .send(payload)
      .expect(400);
    expect(response.body.message).toContain('Shop cần cập nhật');
    expect(carrierQuote).not.toHaveBeenCalled();
  });

  it('still rejects a product unavailable in the selected Shop', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    await request(app.getHttpServer())
      .post('/api/shipping/ghn/quote-address')
      .send(payload)
      .expect(400);
    expect(carrierQuote).not.toHaveBeenCalled();
  });
});

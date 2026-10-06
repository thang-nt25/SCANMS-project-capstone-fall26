import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReturnController } from '../src/modules/returns/return.controller';
import { ReturnService } from '../src/modules/returns/return.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

const returnId = '6c73103a-2550-482b-9f18-e9f5c5ba1ad5';
const customerId = 'a9fa6bb8-f77e-4281-9fab-e24e971b07d1';

describe('POST /api/returns/:id/return-shipment (HTTP contract)', () => {
  let app: INestApplication;
  const service = { submitShipment: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReturnController],
      providers: [{ provide: ReturnService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context
            .switchToHttp()
            .getRequest<{ user?: { id: string; role: UserRole } }>();
          httpRequest.user = {
            id: customerId,
            role: UserRole.CUSTOMER,
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('accepts validated multipart fields and a receipt', async () => {
    service.submitShipment.mockResolvedValue({
      id: returnId,
      status: 'RETURN_SHIPPED',
    });
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const response = await request(app.getHttpServer() as App)
      .post(`/api/returns/${returnId}/return-shipment`)
      .field('carrierName', ' GHTK ')
      .field('trackingNumber', ' GHTK12345 ')
      .attach('receipt', jpg, 'receipt.jpg')
      .expect(201);
    const body = response.body as unknown as { status: string };
    expect(body.status).toBe('RETURN_SHIPPED');
    expect(service.submitShipment).toHaveBeenCalledWith(
      customerId,
      UserRole.CUSTOMER,
      returnId,
      { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
      expect.objectContaining({ originalname: 'receipt.jpg' }),
    );
  });

  it('rejects malformed tracking input before invoking the service', async () => {
    await request(app.getHttpServer() as App)
      .post(`/api/returns/${returnId}/return-shipment`)
      .field('carrierName', 'GHTK')
      .field('trackingNumber', 'bad!')
      .expect(400);
    expect(service.submitShipment).not.toHaveBeenCalled();
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPayoutsController } from './merchant-payouts.controller';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';

describe('Merchant payout UUID compatibility (isolated HTTP routes)', () => {
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const payoutId = '12345678-1234-5123-8123-123456789abc';
  const prefix = `/stores/${storeId}/payouts`;
  const payouts = {
    listPayouts: jest.fn().mockResolvedValue({ items: [{ id: payoutId, status: 'PENDING' }] }),
    getBill: jest.fn().mockResolvedValue({ url: 'https://example.test/bill' }),
    approvePayout: jest.fn().mockResolvedValue({ id: payoutId, status: 'APPROVED' }),
    rejectPayout: jest.fn().mockResolvedValue({ id: payoutId, status: 'REJECTED' }),
  };
  const file = { batchId: payoutId, filename: 'test.xlsx', buffer: Buffer.from('test-only') };
  const batches = {
    listBatches: jest.fn().mockResolvedValue({ items: [] }),
    exportBatch: jest.fn().mockResolvedValue(file),
    downloadBatch: jest.fn().mockResolvedValue(file),
  };
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MerchantPayoutsController],
      providers: [
        { provide: MerchantPayoutsService, useValue: payouts },
        { provide: PayoutBatchesService, useValue: batches },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) {
      context.switchToHttp().getRequest().user = { id: 'test-owner', role: 'SHOP_MANAGER' };
      return true;
    } }).overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => jest.clearAllMocks());

  it('lists pending requests for the seeded UUID v5 Sora Skin shop', async () => {
    const response = await request(app.getHttpServer()).get(prefix).expect(200);
    expect(response.body.items[0]).toMatchObject({ id: payoutId, status: 'PENDING' });
    expect(payouts.listPayouts).toHaveBeenCalledWith(storeId, 'test-owner', expect.anything());
  });
  it('keeps ordinary UUID v4 stores compatible', async () => {
    await request(app.getHttpServer()).get('/stores/12345678-1234-4123-8123-123456789abc/payouts').expect(200);
  });
  it('lists and downloads payout batches with v5 identifiers', async () => {
    await request(app.getHttpServer()).get(`${prefix}/batches`).expect(200);
    await request(app.getHttpServer()).get(`${prefix}/batches/${payoutId}/download`).expect(200);
    expect(batches.downloadBatch).toHaveBeenCalledWith(storeId, 'test-owner', payoutId);
  });
  it('allows a v5 payout ID through the bill and approval routes', async () => {
    await request(app.getHttpServer()).get(`${prefix}/${payoutId}/bill`).expect(200);
    await request(app.getHttpServer()).patch(`${prefix}/${payoutId}/approve`).send({ bankRefCode: 'TEST-ONLY' }).expect(200);
    expect(payouts.approvePayout).toHaveBeenCalledWith(storeId, 'test-owner', payoutId, expect.objectContaining({ bankRefCode: 'TEST-ONLY' }), undefined);
  });
  it('accepts v5 IDs in the export DTO and route without making any real payout', async () => {
    await request(app.getHttpServer()).post(`${prefix}/export-vietqr`).send({ payoutIds: [payoutId] }).expect(201);
    expect(batches.exportBatch).toHaveBeenCalledWith(storeId, 'test-owner', expect.objectContaining({ payoutIds: [payoutId] }));
  });
  it('rejects malformed store and payout IDs before reaching services', async () => {
    await request(app.getHttpServer()).get('/stores/invalid/payouts').expect(400);
    await request(app.getHttpServer()).get(`${prefix}/invalid/bill`).expect(400);
    expect(payouts.listPayouts).not.toHaveBeenCalled();
    expect(payouts.getBill).not.toHaveBeenCalled();
  });
  it('rejects duplicated and malformed payout identifiers for export', async () => {
    for (const ids of [[payoutId, payoutId], ['invalid']]) {
      await request(app.getHttpServer()).post(`${prefix}/export-vietqr`).send({ payoutIds: ids }).expect(400);
    }
    expect(batches.exportBatch).not.toHaveBeenCalled();
  });
});

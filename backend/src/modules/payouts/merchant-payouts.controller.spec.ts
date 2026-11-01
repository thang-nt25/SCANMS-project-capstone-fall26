import { INestApplication, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantPayoutsController } from './merchant-payouts.controller';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';
import { ExportPayoutBatchDto } from './dto/manage-payout.dto';

describe('Merchant payout UUID compatibility (isolated HTTP)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const v4 = '11111111-1111-4111-8111-111111111111';
  const v5 = 'f4632170-4b57-5472-a239-2e18d2b62383';
  const userId = 'test-shop-owner';
  const payouts = { listPayouts: jest.fn() };
  const batches = { listBatches: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MerchantPayoutsController],
      providers: [
        { provide: MerchantPayoutsService, useValue: payouts },
        { provide: PayoutBatchesService, useValue: batches },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (context: any) => {
        context.switchToHttp().getRequest().user = { id: userId, role: 'SHOP_MANAGER' };
        return true;
      } })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    payouts.listPayouts.mockResolvedValue({ items: [], total: 0 });
    batches.listBatches.mockResolvedValue({ items: [], total: 0 });
  });

  it.each([v4, v5])('loads payout lists and batches for valid store %s', async (storeId) => {
    for (const suffix of ['', '/batches']) {
      const response = await fetch(`${baseUrl}/stores/${storeId}/payouts${suffix}?page=1&limit=10`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [], total: 0 });
    }
    expect(payouts.listPayouts).toHaveBeenCalledWith(storeId, userId, expect.objectContaining({ page: 1, limit: 10 }));
    expect(batches.listBatches).toHaveBeenCalledWith(storeId, userId, expect.objectContaining({ page: 1, limit: 10 }));
  });

  it('rejects malformed UUIDs before calling either service', async () => {
    for (const suffix of ['', '/batches']) {
      const response = await fetch(`${baseUrl}/stores/not-a-uuid/payouts${suffix}`);
      expect(response.status).toBe(400);
    }
    expect(payouts.listPayouts).not.toHaveBeenCalled();
    expect(batches.listBatches).not.toHaveBeenCalled();
  });

  it('preserves ownership checks through the authenticated user ID', async () => {
    payouts.listPayouts.mockRejectedValueOnce(new ForbiddenException());
    expect((await fetch(`${baseUrl}/stores/${v5}/payouts`)).status).toBe(403);
    expect(payouts.listPayouts).toHaveBeenCalledWith(v5, userId, expect.anything());
  });

  it('accepts v4/v5 export IDs while keeping format and array restrictions', async () => {
    expect(await validate(plainToInstance(ExportPayoutBatchDto, { payoutIds: [v4, v5] }))).toHaveLength(0);
    for (const payoutIds of [[], [v5, v5], ['not-a-uuid']]) {
      expect((await validate(plainToInstance(ExportPayoutBatchDto, { payoutIds }))).length).toBeGreaterThan(0);
    }
  });
});

import { ForbiddenException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { FinancialLedgerService } from './financial-ledger.service';

describe('Demo wallet top-up availability', () => {
  const initialDemo = process.env.ALLOW_DEMO_WALLET_TOPUP;
  const initialEnvironment = process.env.NODE_ENV;
  const service = new WalletsService(new FinancialLedgerService());

  afterEach(() => {
    if (initialDemo === undefined) delete process.env.ALLOW_DEMO_WALLET_TOPUP;
    else process.env.ALLOW_DEMO_WALLET_TOPUP = initialDemo;
    if (initialEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = initialEnvironment;
  });

  it('reports disabled and rejects top-up before touching the database by default', async () => {
    delete process.env.ALLOW_DEMO_WALLET_TOPUP;
    process.env.NODE_ENV = 'development';
    expect(service.demoTopUpAvailability()).toEqual({ available: false });
    await expect(service.topUpDemo('customer', 10000)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports available only when explicitly enabled outside production', () => {
    process.env.ALLOW_DEMO_WALLET_TOPUP = 'true';
    process.env.NODE_ENV = 'development';
    expect(service.demoTopUpAvailability()).toEqual({ available: true });
  });

  it('accepts a demo top-up when development explicitly enables it', async () => {
    process.env.ALLOW_DEMO_WALLET_TOPUP = 'true';
    process.env.NODE_ENV = 'development';
    const tx = {};
    const prisma: any = { $transaction: jest.fn(callback => callback(tx)) };
    const enabledService = new WalletsService(new FinancialLedgerService(), prisma);
    const credit = jest.spyOn(enabledService, 'creditAvailableBalance').mockResolvedValue({
      wallet: { id: 'demo-wallet', shoppingBalance: { toFixed: () => '100000.00' } },
    } as any);
    const result = await enabledService.topUpDemo('demo-customer', 100000);
    expect(result).toMatchObject({ success: true, availableBalance: '100000.00', walletId: 'demo-wallet' });
    expect(credit).toHaveBeenCalledWith(tx, 'demo-customer', expect.anything(), expect.objectContaining({ type: 'TOPUP_DEMO' }));
  });

  it('keeps production disabled even with the demo flag enabled', async () => {
    process.env.ALLOW_DEMO_WALLET_TOPUP = 'true';
    process.env.NODE_ENV = 'production';
    expect(service.demoTopUpAvailability()).toEqual({ available: false });
    await expect(service.topUpDemo('customer', 10000)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

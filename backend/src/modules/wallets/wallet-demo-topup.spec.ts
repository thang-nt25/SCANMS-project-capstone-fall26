import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';

const configuration = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as ConfigService;
describe('Explicitly enabled demo wallet top-up', () => {
  const tx = { wallet: {} };
  let transaction: jest.Mock, service: WalletsService;
  beforeEach(() => {
    transaction = jest
      .fn()
      .mockImplementation((fn: (client: unknown) => unknown) => fn(tx));
    service = new WalletsService(
      {} as never,
      { $transaction: transaction } as never,
      configuration({
        NODE_ENV: 'development',
        ALLOW_DEMO_WALLET_TOPUP: 'true',
      }),
    );
  });
  it.each([
    { NODE_ENV: 'production', ALLOW_DEMO_WALLET_TOPUP: 'true' },
    { NODE_ENV: 'development', ALLOW_DEMO_WALLET_TOPUP: 'false' },
    { NODE_ENV: 'development' },
  ])(
    'rejects disabled/production use without changing a wallet: %j',
    async (values) => {
      const blocked = new WalletsService(
        {} as never,
        { $transaction: transaction } as never,
        configuration(values),
      );
      expect(blocked.demoTopUpAvailability()).toEqual({ available: false });
      await expect(blocked.topUpDemo('user', 100000)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it.each([NaN, Infinity, -1, 0, 1.5, 50000001])(
    'rejects invalid amount %s before starting a transaction',
    async (amount) => {
      await expect(service.topUpDemo('user', amount)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it('credits through the existing transactional wallet/ledger service', async () => {
    const credit = jest
      .spyOn(service, 'creditAvailableBalance')
      .mockResolvedValue({
        wallet: {
          id: 'wallet',
          availableBalance: { toFixed: () => '900000.00' },
          shoppingBalance: { toFixed: () => '100000.00' },
        },
      } as never);
    expect(await service.topUpDemo('user', 100000)).toMatchObject({
      success: true,
      availableBalance: '100000.00',
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(credit).toHaveBeenCalledWith(
      tx,
      'user',
      expect.anything(),
      expect.objectContaining({ type: 'TOPUP_DEMO' }),
    );
  });
  it('only exposes the shopping demo action to Customer', () => {
    const controller = new WalletsController({} as never, service, {} as never);
    for (const role of [
      UserRole.COLLABORATOR,
      UserRole.SHOP_MANAGER,
      UserRole.SYSTEM_MANAGER,
      UserRole.SYSTEM_ADMIN,
    ]) {
      const actor = { id: 'user', email: 'test@example.test', role };
      expect(controller.demoTopUpAvailability(actor)).toEqual({
        available: false,
      });
      expect(() => controller.topUpDemo(actor, { amount: 100000 })).toThrow(
        ForbiddenException,
      );
    }
    expect(
      controller.demoTopUpAvailability({
        id: 'user',
        email: 'test@example.test',
        role: UserRole.CUSTOMER,
      }),
    ).toEqual({ available: true });
  });
});

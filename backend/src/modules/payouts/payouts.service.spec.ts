import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycStatus, PayoutStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { WithdrawalPolicyService } from '../wallets/withdrawal-policy.service';
import { PayoutsService } from './payouts.service';
import { PayoutTaxService } from './payout-tax.service';
import { FinancialLedgerService } from '../wallets/financial-ledger.service';

describe('PayoutsService FR-22', () => {
  const collaboratorId = '28b2b124-12d2-47f8-881f-c3107ee71084';

  function createService(balance = '500000.31') {
    let availableBalance = new Prisma.Decimal(balance);
    let persistedRequests = 0;
    const profile = {
      kycStatus: KycStatus.VERIFIED,
      bankName: 'Test Bank',
      bankAccountNumber: '123456789',
      bankAccountName: 'TEST KOL',
    };
    const user = {
      role: UserRole.COLLABORATOR,
      isActive: true,
      isDeleted: false,
      collaboratorProfile: profile,
    };
    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      wallet: {
        upsert: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn(() =>
          Promise.resolve({ id: 'wallet-id', availableBalance }),
        ),
        update: jest.fn(
          (input: { data: { availableBalance: Prisma.Decimal } }) => {
            availableBalance = input.data.availableBalance;
            return Promise.resolve({ availableBalance });
          },
        ),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      financialLedger: {
        create: jest.fn().mockResolvedValue({ id: 'ledger-id' }),
      },
      payoutRequest: {
        create: jest.fn(
          (input: {
            data: {
              amount: Prisma.Decimal;
              id: string;
              taxAmount: Prisma.Decimal;
              netAmount: Prisma.Decimal;
            };
          }) => {
            persistedRequests++;
            return Promise.resolve({
              id: input.data.id,
              amount: input.data.amount,
              taxAmount: input.data.taxAmount,
              netAmount: input.data.netAmount,
              status: PayoutStatus.PENDING,
              createdAt: new Date(),
              processedAt: null,
            });
          },
        ),
      },
    };
    // Unit-test transaction double: restore persisted state when callback fails.
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) => {
          const previousBalance = availableBalance;
          const previousRequests = persistedRequests;
          try {
            return await callback(tx);
          } catch (error: unknown) {
            availableBalance = previousBalance;
            persistedRequests = previousRequests;
            throw error;
          }
        },
      ),
    };
    const policy = new WithdrawalPolicyService(
      new ConfigService({ MIN_PAYOUT_AMOUNT: '200000' }),
    );
    const service = new PayoutsService(
      prisma as unknown as PrismaService,
      new WalletsService(new FinancialLedgerService()),
      policy,
      new PayoutTaxService(),
    );
    return {
      service,
      prisma,
      tx,
      user,
      profile,
      getBalance: () => availableBalance.toFixed(2),
      getRequests: () => persistedRequests,
    };
  }

  it('debits available balance and creates PENDING request in the same transaction', async () => {
    const { service, prisma, tx, getBalance } = createService();
    const response = await service.createWithdrawal(collaboratorId, {
      amount: '200000.10',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(response.request.amount).toBe('200000.10');
    expect(response.request.status).toBe(PayoutStatus.PENDING);
    expect(response.availableBalance).toBe('300000.21');
    expect(getBalance()).toBe('300000.21');
    expect(tx.payoutRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collaboratorId,
          bankAccountNumber: '123456789',
        }) as unknown,
      }),
    );
    const createInput = tx.payoutRequest.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(response.request.taxAmount).toBe('0.00');
    expect(response.request.netAmount).toBe('200000.10');
    expect(tx.financialLedger.create).toHaveBeenCalledTimes(1);
    expect(createInput.data.storeId).toBeUndefined();
  });

  it('rolls back the debit if payout persistence fails', async () => {
    const { service, tx, getBalance, getRequests } = createService();
    tx.payoutRequest.create.mockRejectedValueOnce(new Error('database error'));
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(getBalance()).toBe('500000.31');
    expect(getRequests()).toBe(0);
  });

  it('does not create a request when available funds are insufficient', async () => {
    const { service, tx, getBalance } = createService('100000');
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toThrow('Số dư khả dụng không đủ');
    expect(tx.payoutRequest.create).not.toHaveBeenCalled();
    expect(getBalance()).toBe('100000.00');
  });

  it.each([
    '0',
    '-200000',
    '199999.99',
    '200000.001',
    '1e6',
    'NaN',
    'Infinity',
    '200,000',
    '10000000000000',
  ])('rejects invalid or below-minimum amount %s', async (amount) => {
    const { service, prisma } = createService();
    await expect(
      service.createWithdrawal(collaboratorId, { amount }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires verified KYC before changing the wallet', async () => {
    const { service, profile, tx } = createService();
    profile.kycStatus = KycStatus.UNVERIFIED;
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toThrow('xác minh KYC');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it('requires a complete bank account snapshot', async () => {
    const { service, profile, tx } = createService();
    profile.bankAccountNumber = ' ';
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toThrow('tài khoản ngân hàng');
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it('rejects inactive or wrong-role users even when invoked without the controller', async () => {
    const { service, user, tx } = createService();
    user.isActive = false;
    await expect(
      service.createWithdrawal(collaboratorId, { amount: '200000' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });
});

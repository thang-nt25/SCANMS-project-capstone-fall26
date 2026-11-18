import { Prisma } from '@prisma/client';
import { WalletSummaryService } from './wallet-summary.service';

describe('wallet cooperation visibility', () => {
  it('allocates only held Deal commissions by order store and reports a mismatch without changing balances', async () => {
    const d = (value: number) => new Prisma.Decimal(value);
    const prisma: any = {
      payoutRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      wallet: { upsert: jest.fn().mockResolvedValue({ availableBalance: d(0), pendingBalance: d(0), conditionalDealEscrowBalance: d(150), storeWallets: [] }) },
      collaboratorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      storeCollaborator: { findMany: jest.fn().mockResolvedValue(['sora', 'aura'].map(storeId => ({ storeId, status: 'APPROVED', requestedByKol: false, store: { name: storeId, logoUrl: null } }))) },
      commission: { findMany: jest.fn().mockResolvedValue([
        { dealBonusAmount: d(60), order: { storeId: 'sora' } },
        { dealBonusAmount: d(40), order: { storeId: 'sora' } },
        { dealBonusAmount: d(30), order: { storeId: 'aura' } },
      ]) },
    };
    const service = new WalletSummaryService(prisma, { minimumAmount: d(200000) } as any);
    const result = await service.getMyWallet('kol');
    expect(prisma.commission.findMany).toHaveBeenCalledWith({
      where: { collaboratorId: 'kol', dealBonusStatus: 'PENDING_KPI', dealBonusAmount: { gt: 0 } },
      select: { dealBonusAmount: true, order: { select: { storeId: true } } },
    });
    expect(result.cooperationStores.map(store => store.conditionalDealEscrowBalance)).toEqual(['100.00', '30.00']);
    expect(result.conditionalDealEscrowBalance).toBe('150.00');
    expect(result.dealBalanceConsistency).toEqual({ allocatedBalance: '130.00', requiresReview: true });
    prisma.wallet.upsert.mockResolvedValue({ availableBalance: d(0), pendingBalance: d(0), conditionalDealEscrowBalance: d(130), storeWallets: [] });
    expect((await service.getMyWallet('kol')).dealBalanceConsistency?.requiresReview).toBe(false);
  });
  it('does not advertise withdrawal eligibility when store pending exceeds global pending', async () => {
    const d = (value: number) => new Prisma.Decimal(value);
    const service = new WalletSummaryService({
      payoutRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      wallet: { upsert: jest.fn().mockResolvedValue({
        availableBalance: d(1580000), pendingBalance: d(0), earningsReviewRequired: false,
        storeWallets: [{ storeId: 'sora', availableBalance: d(504000), pendingBalance: d(744000),
          store: { name: 'Sora', isDeleted: false, owner: { isActive: true, isDeleted: false } } }],
      }) },
      collaboratorProfile: { findUnique: jest.fn().mockResolvedValue({
        kycStatus: 'VERIFIED', bankName: 'Bank', bankAccountNumber: '123', bankAccountName: 'Owner',
      }) },
      storeCollaborator: { findMany: jest.fn().mockResolvedValue([]) },
    } as any, { minimumAmount: d(200000) } as any);
    const result = await service.getMyWallet('kol');
    expect(result.canWithdraw).toBe(false);
    expect(result.earningsReviewRequired).toBe(true);
    expect(result.pendingBalance).toBe('0.00');
    expect(result.balanceConsistency).toMatchObject({ requiresReview: true, allocatedPendingBalance: '744000.00' });
  });
  it('includes zero-income partnerships without changing withdrawable balances or adding store wallets', async () => {
    const decimal = (value: number) => new Prisma.Decimal(value);
    const prisma: any = {
      payoutRequest: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      wallet: {
        upsert: jest.fn().mockResolvedValue({
          availableBalance: decimal(133200),
          pendingBalance: decimal(59795),
          storeWallets: [
            {
              storeId: 'an-an',
              availableBalance: decimal(133200),
              pendingBalance: decimal(59795),
              store: {
                name: 'An An',
                isDeleted: false,
                owner: { isActive: true, isDeleted: false },
              },
            },
          ],
        }),
      },
      collaboratorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      storeCollaborator: {
        findMany: jest.fn().mockResolvedValue([
          {
            storeId: 'an-an',
            status: 'APPROVED',
            requestedByKol: false,
            store: { name: 'An An', logoUrl: null },
          },
          {
            storeId: 'sora',
            status: 'APPROVED',
            requestedByKol: true,
            store: { name: 'Sora Skin', logoUrl: null },
          },
          {
            storeId: 'pending',
            status: 'PENDING',
            requestedByKol: true,
            store: { name: 'Pending Shop', logoUrl: null },
          },
        ]),
      },
    };
    const service = new WalletSummaryService(prisma, {
      minimumAmount: decimal(200000),
    } as never);
    const result = await service.getMyWallet('kol');
    expect(result.withdrawalTaxPolicy).toMatchObject({
      threshold: '0.00',
      rate: '0.10',
      policy: 'FLAT_10_PERCENT_V1',
      monthlyGross: '0.00',
    });
    expect(prisma.storeCollaborator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { collaboratorId: 'kol', store: { isDeleted: false } },
      }),
    );
    expect(result.cooperationStores).toHaveLength(3);
    expect(result.cooperationStores[1]).toMatchObject({
      storeName: 'Sora Skin',
      status: 'APPROVED',
      hasWallet: false,
      availableBalance: '0.00',
      pendingBalance: '0.00',
    });
    expect(result.cooperationStores[2].status).toBe('PENDING');
    expect(result.stores).toHaveLength(1);
    expect(result.availableBalance).toBe('133200.00');
    expect(result.unallocatedAvailableBalance).toBe('0.00');
    expect(result.canWithdraw).toBe(false);
  });
});

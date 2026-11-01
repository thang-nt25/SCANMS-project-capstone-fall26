import { Prisma } from '@prisma/client';
import { WalletSummaryService } from './wallet-summary.service';

describe('wallet cooperation visibility', () => {
  it('does not advertise withdrawal eligibility when store pending exceeds global pending', async () => {
    const d = (value: number) => new Prisma.Decimal(value);
    const service = new WalletSummaryService({
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
    expect(result.withdrawalTaxPolicy).toEqual({
      threshold: '2000000.00',
      rate: '0.10',
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

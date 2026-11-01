import { CommissionStatus, Prisma } from '@prisma/client';
import { ReturnService } from './return.service';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { WalletsService } from '../wallets/wallets.service';

describe('Flow 4 refund clawback', () => {
  it('reverses pending, approved and already paid income only after the refund path calls it', async () => {
    const amount = new Prisma.Decimal(68400);
    const records = [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAID].map((status, index) => ({
      id: `commission-${index}`,
      collaboratorId: 'creator-1',
      commissionAmount: amount,
      status,
      storeWalletTracked: false,
      order: { storeId: 'sora' },
    }));
    const tx = {
      commission: {
        findMany: jest.fn().mockResolvedValue(records),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const wallets = {
      reversePendingBalance: jest.fn().mockResolvedValue({}),
      reverseAvailableBalance: jest.fn().mockResolvedValue({}),
    };
    const service = new ReturnService(
      {} as PrismaService,
      {} as CloudinaryService,
      undefined,
      wallets as unknown as WalletsService,
    );

    await (service as unknown as { reverseIncomeAfterRefund(tx: unknown, orderId: string): Promise<void> })
      .reverseIncomeAfterRefund(tx, 'order-1');

    expect(tx.commission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId: 'order-1', status: { in: [CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAID] } },
    }));
    expect(wallets.reversePendingBalance).toHaveBeenCalledTimes(1);
    expect(wallets.reverseAvailableBalance).toHaveBeenCalledTimes(2);
    expect(tx.commission.update).toHaveBeenCalledTimes(3);
    for (const call of tx.commission.update.mock.calls) {
      expect(call[0].data).toEqual(expect.objectContaining({ status: CommissionStatus.REVERSED, reversedAt: expect.any(Date) }));
    }
  });
});

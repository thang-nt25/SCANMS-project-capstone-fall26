import { Prisma } from '@prisma/client';
import { CommissionsService } from './commissions.service';
import { referralRiskSignals } from './self-referral';

describe('Flow 5 re-audit regressions', () => {
  it('processes a valid order after a full batch of self-referrals', async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({
      id: String(i).padStart(4, '0'),
    }));
    const db = {
      commission: { findMany: jest.fn(async () => []) },
      order: {
        findMany: jest.fn(async ({ cursor, take }) =>
          rows.filter((row) => !cursor || row.id > cursor.id).slice(0, take),
        ),
      },
    };
    const service = new CommissionsService(db as any, {} as any, {} as any);
    const create = jest
      .spyOn(service, 'createPendingCommission')
      .mockImplementation(async (id) => id === '0200');
    expect((await service.reconcileCommissions()).created).toBe(1);
    expect(create).toHaveBeenCalledWith('0200', expect.any(Date));
    expect(db.order.findMany).toHaveBeenCalledTimes(3);
  });
  it.each(['DISPUTED', 'RETURN_REQUESTED'])(
    'does not describe %s as ready for release',
    async (status) => {
      const service = new CommissionsService(
        {
          commission: {
            findFirst: async () => ({
              id: 'c',
              status: 'PENDING',
              availableAt: new Date('2020-01-01'),
              commissionAmount: new Prisma.Decimal(72000),
              order: { status, store: { name: 'Store' } },
            }),
          },
        } as any,
        {} as any,
        {} as any,
      );
      const result = await service.getOrderEscrowDetails('order', {
        id: 'kol',
        role: 'COLLABORATOR',
      });
      expect(result?.isFrozen).toBe(true);
      expect(result?.canRelease).toBe(false);
      expect(result?.releaseState).toBe('FROZEN');
      expect(result?.remainingTime.formatted).not.toContain('Sẵn sàng');
    },
  );
  it('matches a full delivery address as a review signal, not confirmed self-referral', () => {
    expect(
      referralRiskSignals('123 Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh', [
        {
          detailAddress: '123 Nguyễn Huệ',
          wardName: 'Bến Nghé',
          districtName: 'Quận 1',
          provinceName: 'Hồ Chí Minh',
        },
      ]),
    ).toEqual(['SHARED_DELIVERY_ADDRESS']);
    expect(
      referralRiskSignals('123 Nguyễn Huệ, Quận 2, Hồ Chí Minh', []),
    ).toEqual([]);
  });
  it('does not compare account numbers without a matching bank', () => {
    expect(
      referralRiskSignals(
        '',
        [],
        { bankName: 'MB', bankAccountNumber: '123' },
        { bankName: 'VCB', bankAccountNumber: '123' },
      ),
    ).toEqual([]);
    expect(
      referralRiskSignals(
        '',
        [],
        { bankName: 'MB', bankAccountNumber: '123' },
        { bankName: 'MB', bankAccountNumber: '123' },
      ),
    ).toContain('SHARED_VERIFIED_BANK_ACCOUNT');
  });
  it('requires central operations permission before reviewing funds', async () => {
    const service = new CommissionsService({} as any, {} as any, {} as any);
    await expect(
      service.reviewReferral(
        'order',
        { id: 'shop', role: 'SHOP_MANAGER' },
        'CLEARED',
        'Đã kiểm tra chứng cứ',
      ),
    ).rejects.toThrow();
  });
});

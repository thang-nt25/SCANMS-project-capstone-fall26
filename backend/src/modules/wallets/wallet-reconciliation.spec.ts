import { planEarningsReconciliation } from './wallet-reconciliation';

describe('evidenced KOL wallet reconciliation', () => {
  it('deducts an existing withdrawal without crediting an unpaid monthly bonus', () => {
    expect(planEarningsReconciliation({
      commissions: [{ id: 'commission', storeId: 'sora', amount: '23040000', status: 'APPROVED' }],
      bonuses: [{ id: 'bonus', storeId: 'sora', amount: '2000000', status: 'APPROVED' }],
      payouts: [{ id: 'withdrawal', storeId: 'sora', amount: '1500000', status: 'PENDING' }],
    })).toEqual({
      availableBalance: '21540000.00', pendingBalance: '0.00',
      stores: [{ storeId: 'sora', availableBalance: '21540000.00', pendingBalance: '0.00' }],
    });
  });

  it('keeps pending commissions separate and includes only paid bonuses', () => {
    expect(planEarningsReconciliation({
      commissions: [
        { id: 'approved', storeId: 'sora', amount: '100.25', status: 'APPROVED' },
        { id: 'pending', storeId: 'sora', amount: '84.15', status: 'PENDING' },
        { id: 'reversed', storeId: 'sora', amount: '500', status: 'REVERSED' },
      ],
      bonuses: [{ id: 'bonus', storeId: 'sora', amount: '2000000', status: 'PAID' }],
      payouts: [],
    })).toMatchObject({ availableBalance: '2000100.25', pendingBalance: '84.15' });
  });

  it.each(['PENDING', 'PROCESSING', 'APPROVED'])('preserves gross debits for %s withdrawals', status => {
    const result = planEarningsReconciliation({
      commissions: [{ id: 'commission', storeId: 'aura', amount: '2640000', status: 'APPROVED' }],
      bonuses: [], payouts: [{ id: 'payout', storeId: 'aura', amount: '2000000', status }],
    });
    expect(result.availableBalance).toBe('640000.00');
  });

  it('refuses to fund a withdrawal using another shop without evidence', () => {
    expect(() => planEarningsReconciliation({
      commissions: [{ id: 'commission', storeId: 'aura', amount: '2640000', status: 'APPROVED' }],
      bonuses: [], payouts: [{ id: 'payout', storeId: 'sora', amount: '2000000', status: 'APPROVED' }],
    })).toThrow('Insufficient evidenced income');
  });

  it('carries documented spending once and does not deduct rejected withdrawals', () => {
    expect(planEarningsReconciliation({
      commissions: [{ id: 'commission', storeId: 'sora', amount: '3108003', status: 'APPROVED' }],
      bonuses: [], payouts: [{ id: 'rejected', storeId: 'sora', amount: '1000000', status: 'REJECTED' }],
      expenses: [{ id: 'payment', storeId: 'sora', amount: '280000' }],
    }).availableBalance).toBe('2828003.00');
  });

  it('rejects duplicate sources', () => {
    const commission = { id: 'same', storeId: 'sora', amount: '100', status: 'APPROVED' };
    expect(() => planEarningsReconciliation({ commissions: [commission, commission], bonuses: [], payouts: [] })).toThrow('Duplicate reconciliation source');
  });

  it.each(['-1', '0.001', 'NaN', 'Infinity'])('rejects invalid amount %s', amount => {
    expect(() => planEarningsReconciliation({ commissions: [{ id: 'bad', storeId: 'sora', amount, status: 'APPROVED' }], bonuses: [], payouts: [] })).toThrow('Invalid source amount');
  });

  it('does not treat a payout with no source shop as allocated income', () => {
    expect(() => planEarningsReconciliation({ commissions: [], bonuses: [], payouts: [{ id: 'unknown', storeId: null, amount: 1, status: 'PENDING' }] })).toThrow('Missing source store');
  });
});

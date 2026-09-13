import { ConfigService } from '@nestjs/config';
import { WithdrawalPolicyService } from './withdrawal-policy.service';

describe('WithdrawalPolicyService', () => {
  it('reads the configured minimum as Decimal', () => {
    const policy = new WithdrawalPolicyService(
      new ConfigService({ MIN_PAYOUT_AMOUNT: '300000.50' }),
    );
    expect(policy.minimumAmount.toFixed(2)).toBe('300000.50');
  });

  it.each(['0', '-1', 'NaN', 'Infinity', '200000.001'])(
    'fails clearly for invalid minimum config %s',
    (amount) => {
      expect(
        () =>
          new WithdrawalPolicyService(
            new ConfigService({ MIN_PAYOUT_AMOUNT: amount }),
          ),
      ).toThrow('MIN_PAYOUT_AMOUNT');
    },
  );
});

import { selfReferralReason } from './self-referral';

describe('checkout self-referral guard', () => {
  it('blocks the same account even when the delivery phone differs', () => {
    expect(selfReferralReason({ customerId: 'kol', collaboratorId: 'kol', customerPhone: '0901234567' })).toBe('SAME_ACCOUNT');
  });

  it('blocks a matching delivery phone for a guest purchase', () => {
    expect(selfReferralReason({ customerPhone: '0901 234 567', collaboratorId: 'kol', collaboratorPhone: '0901234567' })).toBe('SAME_PHONE');
  });

  it('preserves valid attribution when customer and creator identities differ', () => {
    expect(selfReferralReason({ customerId: 'buyer', customerPhone: '0901234567', collaboratorId: 'kol', collaboratorPhone: '0907654321' })).toBeNull();
  });
});

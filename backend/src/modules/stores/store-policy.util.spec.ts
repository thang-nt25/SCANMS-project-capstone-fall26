import { publicReturnPolicy } from './store-policy.util';

describe('publicReturnPolicy', () => {
  it('keeps a real return policy', () => {
    expect(publicReturnPolicy('  Đổi trả trong 14 ngày  ')).toBe('Đổi trả trong 14 ngày');
  });

  it('hides legacy legal documents stored in the policy column', () => {
    expect(publicReturnPolicy('{"businessType":"ENTERPRISE","taxCode":"01234566"}')).toBeNull();
    expect(publicReturnPolicy('[{"taxCode":"01234566"}]')).toBeNull();
  });

  it('handles an absent policy', () => {
    expect(publicReturnPolicy(null)).toBeNull();
  });
});

import { exclusiveDealRate } from './exclusive-deal-bonus';

describe('VIP entitlement independent of attribution link type', () => {
  const deal = { productId: 'product', collaboratorId: 'kol', storeId: 'shop', approvedCommissionRate: 13 };
  it('retains the full VIP rate for a creator buying through campaign attribution', () => {
    expect(exclusiveDealRate(deal, 'product', 'kol', 'shop')).toBe(13);
  });
  it.each([
    ['other-product', 'kol', 'shop'], ['product', 'other-kol', 'shop'],
    ['product', 'kol', 'other-shop'], ['product', null, 'shop'],
  ])('does not leak an entitlement across product, creator or store', (product, kol, shop) => {
    expect(exclusiveDealRate(deal, product!, kol, shop!)).toBe(0);
  });
  it('does not grant VIP without an approved deal', () => {
    expect(exclusiveDealRate(undefined, 'product', 'kol', 'shop')).toBe(0);
  });
  it.each([[10, 10], [12, 12], [16, 16], [25, 25], [45, 0], [9, 0], [NaN, 0]])('accepts only approved VIP rate %s within the global ceiling', (rate, expected) => {
    expect(exclusiveDealRate({ ...deal, approvedCommissionRate: rate }, 'product', 'kol', 'shop')).toBe(expected);
  });
});

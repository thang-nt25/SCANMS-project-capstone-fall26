import { exclusiveDealBonus } from './exclusive-deal-bonus';

describe('VIP entitlement independent of attribution link type', () => {
  const deal = { productId: 'product', collaboratorId: 'kol', storeId: 'shop', approvedCommissionRate: 13 };
  it('retains the VIP bonus for a creator buying through campaign attribution', () => {
    expect(exclusiveDealBonus(deal, 'product', 'kol', 'shop')).toBe(3);
  });
  it.each([
    ['other-product', 'kol', 'shop'], ['product', 'other-kol', 'shop'],
    ['product', 'kol', 'other-shop'], ['product', null, 'shop'],
  ])('does not leak an entitlement across product, creator or store', (product, kol, shop) => {
    expect(exclusiveDealBonus(deal, product!, kol, shop!)).toBe(0);
  });
  it('does not grant VIP without an approved deal', () => {
    expect(exclusiveDealBonus(undefined, 'product', 'kol', 'shop')).toBe(0);
  });
  it.each([[11, 1], [12, 2], [13, 3], [45, 15], [10, 0], [NaN, 0]])('caps legacy rate %s to bonus %s', (rate, bonus) => {
    expect(exclusiveDealBonus({ ...deal, approvedCommissionRate: rate }, 'product', 'kol', 'shop')).toBe(bonus);
  });
});

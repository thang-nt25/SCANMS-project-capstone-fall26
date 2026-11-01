import { BadRequestException } from '@nestjs/common';
import { shopKolOrderFilter } from './shop-kol-performance';

describe('Store KOC performance report period and boundaries', () => {
  const kol = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-10-31T18:30:00Z'); // 01/11, 01:30 Vietnam
  it('uses the Vietnam month boundary rather than the UTC month', () => {
    const where = shopKolOrderFilter('store-a', kol, { period: 'month' }, now);
    expect(where.createdAt).toEqual({
      gte: new Date('2026-10-31T17:00:00Z'),
      lte: now,
    });
    expect(where.storeId).toBe('store-a');
    expect(where.attributedCollaboratorId).toBe(kol);
  });
  it('includes seven calendar days and excludes future records', () => {
    expect(
      shopKolOrderFilter('store-a', kol, { period: '7d' }, now).createdAt,
    ).toEqual({
      gte: new Date('2026-10-25T17:00:00Z'),
      lte: now,
    });
  });
  it('retains the requested status instead of silently reporting another subset', () => {
    expect(
      shopKolOrderFilter('store-a', kol, { status: 'RETURN_REQUESTED' }, now)
        .status,
    ).toBe('RETURN_REQUESTED');
  });
  it.each([
    ['invalid-id', {}],
    [kol, { period: 'invalid' }],
    [kol, { status: 'NOT_A_STATUS' }],
  ])('rejects invalid identifiers or report filters', (id, query) => {
    expect(() => shopKolOrderFilter('store-a', id, query as any, now)).toThrow(
      BadRequestException,
    );
  });
});

import { activeSponsoredPlacements } from './sponsored-placement.config';

describe('paid marketplace placements', () => {
  const now = Date.parse('2026-10-17T10:00:00Z');
  const slot = {
    storeId: '00000000-0000-4000-8000-000000000001',
    startsAt: '2026-10-17T00:00:00Z', endsAt: '2026-10-18T00:00:00Z',
    headline: 'Khám phá bộ sưu tập mới', paymentStatus: 'CONFIRMED',
  };
  it('publishes a confirmed booking only inside its active window', () => {
    expect(activeSponsoredPlacements(JSON.stringify([slot]), now)).toEqual([slot]);
    expect(activeSponsoredPlacements(JSON.stringify([slot]), Date.parse(slot.endsAt))).toEqual([]);
  });
  it('rejects unpaid, future, invalid and duplicated bookings', () => {
    expect(activeSponsoredPlacements(JSON.stringify([
      { ...slot, paymentStatus: 'PENDING' },
      { ...slot, startsAt: '2027-01-01' },
      { ...slot, storeId: '../login' },
      { ...slot, endsAt: 'invalid' },
      slot, slot,
    ]), now)).toEqual([slot]);
    expect(activeSponsoredPlacements('{broken', now)).toEqual([]);
  });
});

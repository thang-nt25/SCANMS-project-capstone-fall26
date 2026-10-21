import { sponsorshipQuote } from './sponsorship-pricing';

describe('Sponsorship daily billing', () => {
  it.each([[1, 1, 100000], [24, 1, 100000], [25, 2, 200000], [72, 3, 300000], [744, 31, 3100000]])(
    'bills %i hours as %i days for %i VND', (hours, days, amount) => {
      const start = new Date('2026-10-20T00:00:00Z');
      expect(sponsorshipQuote(start, new Date(start.getTime() + hours * 3600000))).toEqual({ days, amount });
    },
  );
});

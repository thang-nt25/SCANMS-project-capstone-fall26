export const SPONSORSHIP_PRICING = {
  dailyRate: 100000,
  currency: 'VND',
  billingHours: 24,
  minHours: 1,
  maxDays: 31,
} as const;

export function sponsorshipQuote(startsAt: Date, endsAt: Date) {
  const days = Math.ceil((endsAt.getTime() - startsAt.getTime()) / 86400000);
  return { days, amount: days * SPONSORSHIP_PRICING.dailyRate };
}

/** Scores rank evidence; they are not conversion probabilities. The first five
 * completed/delivered orders switch the model from profile to performance. */
export function matchingScore(
  orders: number,
  followers: number,
  category: number,
  conversion: number,
  priceFit: number,
) {
  const coldStart = orders < 5;
  const social = Math.min(
    100,
    Math.round((Math.log10(1 + Math.max(0, followers)) / 6) * 100),
  );
  const profile = category * 0.7 + social * 0.3;
  const performance = conversion * 0.6 + priceFit * 0.4;
  return {
    score: Math.min(
      100,
      Math.max(
        0,
        Math.round(coldStart ? profile : performance * 0.7 + profile * 0.3),
      ),
    ),
    mode: coldStart ? ('COLD_START' as const) : ('PERFORMANCE' as const),
    socialScore: social,
  };
}

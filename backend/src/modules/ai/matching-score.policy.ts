/** Below five orders, use profile evidence. With enough history the four radar
 * axes contribute 35/25/20/20, matching Blueprint 4.2. Never imply sale probability. */
export function matchingScore(
  orders: number,
  followers: number,
  category: number,
  conversion: number,
  priceFit: number,
  tierAndSocial: number,
) {
  const coldStart = orders < 5;
  const social = Math.min(
    100,
    Math.round((Math.log10(1 + Math.max(0, followers)) / 6) * 100),
  );
  const weights = coldStart
    ? {
        categoryScore: 0.7,
        conversionRateScore: 0,
        tierAndSocialScore: 0.3,
        priceFitScore: 0,
      }
    : {
        categoryScore: 0.35,
        conversionRateScore: 0.25,
        tierAndSocialScore: 0.2,
        priceFitScore: 0.2,
      };
  const axes = {
    categoryScore: category,
    conversionRateScore: conversion,
    tierAndSocialScore: coldStart ? social : tierAndSocial,
    priceFitScore: priceFit,
  };
  const weighted = Object.entries(weights).reduce(
    (sum, [axis, weight]) => sum + axes[axis as keyof typeof axes] * weight,
    0,
  );
  return {
    score: Math.min(100, Math.max(0, Math.round(weighted))),
    mode: coldStart ? ('COLD_START' as const) : ('PERFORMANCE' as const),
    socialScore: social,
    weights,
  };
}

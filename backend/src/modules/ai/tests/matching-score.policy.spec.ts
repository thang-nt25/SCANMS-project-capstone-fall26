import { matchingScore } from '../matching-score.policy';
import { creatorProfileText } from '../creator-profile.policy';

describe('Published recommendation score policy', () => {
  it('uses category and social evidence before five orders', () => {
    expect(matchingScore(4, 999999, 80, 0, 0, 60)).toMatchObject({
      score: 86,
      mode: 'COLD_START',
      socialScore: 100,
      weights: {
        categoryScore: 0.7,
        conversionRateScore: 0,
        tierAndSocialScore: 0.3,
        priceFitScore: 0,
      },
    });
    expect(matchingScore(4, 999999, 80, 100, 100, 98).score).toBe(86);
  });
  it('uses the four-axis formula from five orders', () => {
    const result = matchingScore(5, 999999, 80, 50, 100, 90);
    expect(result.score).toBe(
      Math.round(80 * 0.35 + 50 * 0.25 + 90 * 0.2 + 100 * 0.2),
    );
    expect(result.mode).toBe('PERFORMANCE');
    expect(
      Object.values(result.weights).reduce((sum, weight) => sum + weight, 0),
    ).toBe(1);
  });
  it('includes tier in experienced-creator ranking', () => {
    expect(matchingScore(5, 0, 80, 50, 100, 98).score).toBeGreaterThan(
      matchingScore(5, 0, 80, 50, 100, 60).score,
    );
    expect(matchingScore(0, 200000, 80, 0, 0, 60).score).toBeGreaterThanOrEqual(
      matchingScore(0, 50000, 80, 0, 0, 60).score,
    );
    expect(matchingScore(0, 0, 0, 0, 0, 0).score).toBe(0);
  });
  it('passes public bio/channel/tags only to inference', () => {
    const text = creatorProfileText({
      collaboratorProfile: {
        bio: 'Skin care',
        socialLinksJson: { tags: ['Beauty'], bankAccount: 'PRIVATE_ACCOUNT' },
      },
      socialChannels: [{ channelName: 'Review channel' }],
    });
    expect(text).toContain('Beauty');
    expect(text).not.toContain('PRIVATE_ACCOUNT');
  });
});

import { matchingScore } from '../matching-score.policy';
describe('Evidence weighting at the five-order boundary', () => {
  it('uses 70% category and 30% social before five orders', () => {
    const result = matchingScore(4, 999999, 80, 0, 0);
    expect(result).toEqual({ score: 86, mode: 'COLD_START', socialScore: 100 });
  });
  it('switches to 70% performance and 30% profile at five orders', () => {
    const result = matchingScore(5, 999999, 80, 50, 100);
    expect(result.score).toBe(
      Math.round((50 * 0.6 + 100 * 0.4) * 0.7 + 86 * 0.3),
    );
    expect(result.mode).toBe('PERFORMANCE');
  });
  it('does not lower the score when the only change is increasing followers', () => {
    expect(matchingScore(0, 200000, 80, 0, 0).score).toBeGreaterThanOrEqual(
      matchingScore(0, 50000, 80, 0, 0).score,
    );
    expect(matchingScore(0, 0, 0, 0, 0).score).toBe(0);
  });
});

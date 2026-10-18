import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// Keep the default npm test command independent of shared PostgreSQL and Redis.
const config = createRequire(__filename)(
  '../../../test/jest-unit.config.cjs',
) as {
  testPathIgnorePatterns: string[];
};
const excluded = (path: string) =>
  config.testPathIgnorePatterns.some((pattern) =>
    new RegExp(pattern).test(path),
  );

describe('Default unit-test database safety', () => {
  it.each([
    'modules/referral-links/tests/referral-links.e2e.spec.ts',
    'modules/referral-links/tests/referral-links.real-db.integration.spec.ts',
    'modules/commission-rules/tests/commission-rules.real-db.integration.spec.ts',
    'modules/returns/return.postgres.integration.spec.ts',
    'modules/referral-links/tests/click-rate-limit.spec.ts',
  ])('requires an explicit isolated-service run for %s', (path) => {
    expect(excluded(resolve(__dirname, '../..', path))).toBe(true);
  });

  it('still includes normal business-unit test files', () => {
    expect(
      excluded(resolve(__dirname, '../../modules/orders/orders-cart.spec.ts')),
    ).toBe(false);
  });
});

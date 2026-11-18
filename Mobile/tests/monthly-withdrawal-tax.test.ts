import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyWithdrawalTax } from '../src/features/wallets/monthly-withdrawal-tax';

test('monthly withdrawal preview follows all five brackets and resets with the month base', () => {
  for (const [base, tax] of [['0', 20000], ['10000000', 40000], ['30000000', 80000], ['60000000', 120000], ['110000000', 140000], ['9800000', 30000]] as const)
    assert.equal(monthlyWithdrawalTax('400000', base), tax);
  assert.equal(monthlyWithdrawalTax('', '0'), 0);
});

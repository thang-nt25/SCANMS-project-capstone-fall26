import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const output = ts.transpileModule(readFileSync(new URL('../src/utils/partner-tier.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { normalizePartnerTier, tierRemuneration } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('persisted English and Vietnamese tiers are preserved, including Gold under grace', () => {
  for (const [tier, expected, rate] of [['Đồng', 'BRONZE', 10], ['Silver', 'SILVER', 11], ['Vàng', 'GOLD', 12], ['Kim Cương', 'DIAMOND', 13]]) {
    assert.equal(normalizePartnerTier({ name: tier }), expected);
    assert.equal(tierRemuneration(tier), rate);
  }
  assert.equal(normalizePartnerTier({ name: 'Gold', totalRevenue: 1 }), 'GOLD');
});

test('missing or unrecognized profiles do not silently become Bronze', () => {
  for (const value of [null, undefined, {}, { name: 'Unknown', totalRevenue: 1000000000 }]) {
    assert.equal(normalizePartnerTier(value), undefined);
    assert.equal(tierRemuneration(value), undefined);
  }
});

// Read-only contract checks against the commission requirements in the Word brief.
// Run from backend: node scripts/audit-additive-word.cjs
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const assert = require('node:assert/strict');
const { validateSync } = require('class-validator');
const { Prisma } = require('@prisma/client');
const { CommissionCalculatorService } = require('../src/modules/commissions/commission-calculator.service');
const { CreateExclusiveDealDto } = require('../src/modules/affiliate-deals/dto/create-exclusive-deal.dto');
const { CreateLiveSessionDto } = require('../src/modules/live-sessions/dto/create-live-session.dto');
const { CreateCampaignDto } = require('../src/modules/campaigns/dto/campaign.dto');
const { exclusiveDealBonus } = require('../src/modules/orders/exclusive-deal-bonus');
const { AffiliateDealsService } = require('../src/modules/affiliate-deals/affiliate-deals.service');

const results = [];
function check(name, expected, run) {
  try {
    const actual = run();
    assert.deepEqual(actual, expected);
    results.push({ name, result: 'PASS', expected, actual });
  } catch (error) {
    results.push({ name, result: 'FAIL', expected, actual: error.actual ?? error.message });
  }
}
function acceptsField(Dto, property, value) {
  const dto = Object.assign(new Dto(), { [property]: value });
  // Only validate the field under test; other payload fields are out of scope.
  return !validateSync(dto).some(error => error.property === property);
}
const calculator = new CommissionCalculatorService();
function rate(custom, base, tier) {
  return Number(calculator.calculateOrderCommission([
    { id: 'audit-only', quantity: 1, unitPrice: new Prisma.Decimal(1000000),
      customCommissionRate: custom === null ? null : new Prisma.Decimal(custom) },
  ], new Prisma.Decimal(base), new Prisma.Decimal(tier)).items[0].appliedCommissionRate);
}

check('Base only: 10%', 10, () => rate(null, 10, 0));
check('Tier silver: base 10 + 1', 11, () => rate(null, 10, 1));
check('Tier gold: base 10 + 2', 12, () => rate(null, 10, 2));
check('Tier diamond: base 10 + 3', 13, () => rate(null, 10, 3));
check('Unsnapshotted legacy product must not override fixed base', 10, () => rate(35, 35, 0));
check('Unsnapshotted commission never exceeds 25%', true, () => rate(99, 10, 5) <= 25);

for (const total of [11, 12, 13]) {
  check(`Deal request accepts base 10 + bonus ${total - 10}`, true,
    () => acceptsField(CreateExclusiveDealDto, 'proposedCommissionRate', total));
  check(`Approved deal grants bonus ${total - 10}`, total - 10,
    () => exclusiveDealBonus({ productId: 'p', collaboratorId: 'k', storeId: 's',
      approvedCommissionRate: total }, 'p', 'k', 's'));
}
for (const invalid of [10, 12.5, 14, 40]) {
  check(`Deal DTO alone rejects disallowed total ${invalid}`, false,
    () => acceptsField(CreateExclusiveDealDto, 'proposedCommissionRate', invalid));
}
check('Unapproved/missing deal grants no bonus', 0,
  () => exclusiveDealBonus(undefined, 'p', 'k', 's'));
for (const bonus of [1, 2]) {
  check(`Campaign accepts bonus ${bonus}`, true,
    () => acceptsField(CreateCampaignDto, 'bonusCommissionRate', bonus));
}
for (const bonus of [0, 3]) {
  check(`Campaign rejects bonus ${bonus}`, false,
    () => acceptsField(CreateCampaignDto, 'bonusCommissionRate', bonus));
}
check('Campaign requires a budget', false,
  () => acceptsField(CreateCampaignDto, 'bonusBudgetTotal', undefined));
for (const bonus of [2, 3]) {
  check(`Live API accepts bonus ${bonus}`, true,
    () => acceptsField(CreateLiveSessionDto, 'commissionRate', bonus));
}
for (const bonus of [0, 5]) {
  check(`Live API rejects bonus ${bonus}`, false,
    () => acceptsField(CreateLiveSessionDto, 'commissionRate', bonus));
}
// Guard against legacy clients submitting an overall rate instead of a bonus.
check('Live API rejects total 13 instead of a micro bonus', false,
  () => acceptsField(CreateLiveSessionDto, 'commissionRate', 13));

(async () => {
  // Exercise service guards too: a permissive DTO need not mean an approved deal.
  for (const invalid of [10, 12.5, 14, 40]) {
    const prisma = {
      user: { findUnique: async () => ({ isActive: true, role: 'COLLABORATOR',
        collaboratorProfile: { kycStatus: 'VERIFIED' } }) },
      product: { findFirst: async () => ({ id: 'p', storeId: 's', isActive: true,
        isAffiliateEnabled: true, store: { isActive: true } }) },
      exclusiveDealProposal: { findFirst: async () => null },
    };
    const service = new AffiliateDealsService(prisma, {}, {});
    service.getMyDealStatus = async () => ({ isBlocked: false });
    let rejectedForRate = false;
    try {
      await service.createProposal('k', { productId: 'p', proposedCommissionRate: invalid, videoReviewCommitment: true,
        salesCommitment: 'Review video commitment for audit' });
    } catch (error) {
      rejectedForRate = error.getStatus?.() === 400;
    }
    check(`Deal service rejects disallowed total ${invalid}`, true, () => rejectedForRate);
  }
  console.log(JSON.stringify({
  scope: 'Real calculator/helper/DTO execution only; no DB writes or end-to-end checkout.',
  passed: results.filter(row => row.result === 'PASS').length,
  failed: results.filter(row => row.result === 'FAIL').length,
  results,
}, null, 2));
  process.exitCode = results.some(row => row.result === 'FAIL') ? 1 : 0;
})().catch(error => { console.error(error.message); process.exitCode = 1; });

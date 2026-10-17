// Read-only execution audit for Word section 7. Fake data only, no DB/network.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const { Reflector } = require('@nestjs/core');
const { CouponsService } = require('../src/modules/coupons/coupons.service');
const { RolesGuard } = require('../src/common/guards/roles.guard');
const { StoreCouponsController, CollaboratorCouponsController, AdminCouponsController, PublicCouponsController } = require('../src/modules/coupons/coupons.controller');
const results = [];
function record(name, expected, actual) { results.push({ name, expected, actual, result: expected === actual ? 'PASS' : 'FAIL' }); }
async function allowed(callback) { try { await callback(); return true; } catch { return false; } }
function fixture(couponOverride = {}) {
  const coupon = { id: 'coupon', storeId: 'shop', collaboratorId: 'kol', status: 'PENDING_APPROVAL',
    fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS', scopeType: 'STORE_WIDE', approvedBy: null, approvedAt: null, ...couponOverride };
  let lastUpdate;
  const prisma = {
    store: { findUnique: async () => ({ id: 'shop', ownerId: 'owner' }) },
    coupon: { findFirst: async () => coupon, findUnique: async () => coupon,
      update: async ({ data }) => { lastUpdate = data; return { ...coupon, ...data }; } },
    auditLog: { create: async () => ({}) },
    order: { count: async () => 0 },
  };
  return { service: new CouponsService(prisma, {}), lastUpdate: () => lastUpdate };
}
(async () => {
  const guard = new RolesGuard(new Reflector());
  const cases = [
    ['Shop create: Shop role', StoreCouponsController, 'createStoreCoupon', 'SHOP_MANAGER', true],
    ['Shop create: deny KOL', StoreCouponsController, 'createStoreCoupon', 'COLLABORATOR', false],
    ['Shop approve: deny Customer', StoreCouponsController, 'approveCoupon', 'CUSTOMER', false],
    ['Shop approve: Admin cannot replace Shop approval', StoreCouponsController, 'approveCoupon', 'SYSTEM_ADMIN', false],
    ['Shop create: Admin uses platform issuance instead of spending Shop budget', StoreCouponsController, 'createStoreCoupon', 'SYSTEM_ADMIN', false],
    ['KOL propose: KOL role', CollaboratorCouponsController, 'proposeCoupon', 'COLLABORATOR', true],
    ['KOL propose: deny Customer', CollaboratorCouponsController, 'proposeCoupon', 'CUSTOMER', false],
    ['Admin issue: Admin role', AdminCouponsController, 'createPlatformCoupon', 'SYSTEM_ADMIN', true],
    ['Admin issue: deny Shop', AdminCouponsController, 'createPlatformCoupon', 'SHOP_MANAGER', false],
    ['Admin block: deny KOL', AdminCouponsController, 'blockCoupon', 'COLLABORATOR', false],
    ['Saved vouchers: Customer role', PublicCouponsController, 'getSavedAvailableCoupons', 'CUSTOMER', true],
    ['Saved vouchers: deny KOL', PublicCouponsController, 'getSavedAvailableCoupons', 'COLLABORATOR', false],
  ];
  for (const [name, Controller, method, role, expected] of cases) {
    const context = { getClass: () => Controller, getHandler: () => Controller.prototype[method],
      switchToHttp: () => ({ getRequest: () => ({ user: { id: 'audit', role } }) }) };
    record(name, expected, await allowed(() => guard.canActivate(context)));
  }
  const ownership = fixture();
  record('Owner manages own store', true, await allowed(() => ownership.service.verifyStoreAccess('shop', 'owner', 'SHOP_MANAGER')));
  record('Ordinary Shop cannot manage another store', false, await allowed(() => ownership.service.verifyStoreAccess('shop', 'other-owner', 'SHOP_MANAGER')));
  record('Demo Shop must also be denied another store', false, await allowed(() => ownership.service.verifyStoreAccess('shop', '6e9eb89c-f544-4f87-b724-1fe7aace2edc', 'SHOP_MANAGER')));

  const pending = fixture();
  record('KOL cannot resume a pending proposal', false, await allowed(() => pending.service.togglePauseCoupon('kol', 'coupon')));
  const unblock = fixture({ status: 'BLOCKED' });
  const activation = await unblock.service.adminUnblockCoupon('coupon', 'admin');
  record('Admin unblock must not activate a blocked KOL proposal that Shop has never approved', false, activation.coupon.status === 'ACTIVE');
  const platform = fixture({ status: 'ACTIVE', fundingSource: 'PLATFORM_FUNDED', approvedBy: 'admin' });
  record('Shop cannot increase a platform-funded coupon budget', false,
    await allowed(() => platform.service.updateCouponPolicy('shop', 'coupon', 'owner', 'SHOP_MANAGER', { budgetTotal: 999999999 })));
  process.stdout.write(JSON.stringify({ scope: 'Actual service and RolesGuard execution with fake data; no DB writes or browser claims',
    passed: results.filter(r => r.result === 'PASS').length, failed: results.filter(r => r.result === 'FAIL').length, results }, null, 2) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

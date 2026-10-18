// Read-only Word section 6 audit: executes real services with isolated fake data.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const { CouponsService } = require('../src/modules/coupons/coupons.service');
const { TiersService } = require('../src/modules/tiers/tiers.service');

const storeId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';
const baseCoupon = {
  id: 'audit-only', storeId, store: { name: 'Audit Shop' },
  displayCode: 'AUDIT5', status: 'ACTIVE', deletedAt: null,
  benefitType: 'GOODS', fundingSource: 'SHOP_FUNDED', scopeType: 'STORE_WIDE',
  startsAt: null, expiresAt: null, usageLimitTotal: null, usageCount: 0,
  budgetTotal: null, budgetUsed: 0, minimumOrderAmount: 200000,
  maximumDiscountAmount: null, discountType: 'PERCENTAGE', discountValue: 5,
  stackableWithShopVoucher: true, stackableWithPlatformVoucher: true,
  stackableWithProductDiscount: true, couponProducts: [], couponCategories: [],
  collaboratorId: null, liveSession: null,
};
function service(coupon) {
  const prisma = {
    coupon: { findUnique: async () => coupon },
    product: { findMany: async () => [{ id: productId, storeId, price: 250000 }] },
  };
  const instance = new CouponsService(prisma, {});
  instance.checkRateLimit = async () => {};
  instance.resetValidationFailure = async () => {};
  instance.recordValidationFailure = async () => {};
  return instance;
}
const dto = {
  code: 'AUDIT5', storeId, items: [{ productId, quantity: 1, unitPrice: 250000 }],
  hasShopVoucher: false, hasPlatformVoucher: false, hasProductDiscount: false,
};
const results = [];
async function rejectionCheck(name, coupon, request) {
  try {
    const result = await service(coupon).validateCoupon(request);
    results.push({ name, expected: 'REJECT', actual: 'ACCEPT', result: 'FAIL', discount: result.discountAmount });
  } catch (error) {
    results.push({ name, expected: 'REJECT', actual: 'REJECT', result: 'PASS', message: error.message });
  }
}
(async () => {
  const basic = await service(baseCoupon).validateCoupon(dto);
  results.push({ name: 'KOL/Shop 5% on eligible goods 250000', expected: 12500, actual: basic.discountAmount, result: basic.discountAmount === 12500 ? 'PASS' : 'FAIL' });
  await rejectionCheck('Absolute ban on another Shop goods voucher, including legacy stack=true', baseCoupon, { ...dto, hasShopVoucher: true });
  await rejectionCheck('Shipping voucher cannot enter the goods slot', { ...baseCoupon, benefitType: 'SHIPPING' }, dto);
  await rejectionCheck('Platform voucher cannot enter the Shop goods slot', { ...baseCoupon, fundingSource: 'PLATFORM_FUNDED' }, dto);
  await rejectionCheck('Live voucher cannot be used while paused', { ...baseCoupon, liveSession: { status: 'PAUSED', inviteStatus: 'ACCEPTED', commissionRate: 3, products: [{ productId }] } }, dto);
  try {
    await service({ ...baseCoupon, stackableWithPlatformVoucher: false, liveSession: { status: 'LIVE', inviteStatus: 'ACCEPTED', commissionRate: 3, products: [{ productId }] } }).validateCoupon({ ...dto, hasPlatformVoucher: true });
    results.push({ name: 'Live goods voucher plus one platform voucher', expected: 'ACCEPT', actual: 'ACCEPT', result: 'PASS' });
  } catch (error) {
    results.push({ name: 'Live goods voucher plus one platform voucher', expected: 'ACCEPT', actual: 'REJECT', result: 'FAIL', message: error.message });
  }
  // A stacked shipping reduction belongs to shipping; it must not reduce net goods GMV.
  const tierService = new TiersService({ order: { findMany: async () => [{ id: 'audit-order', subtotalAmount: 250000, couponDiscountAmount: 20000, discountAmount: 45000, finalAmount: 230000, refundedAmount: 0 }] } });
  const sales = await tierService.previousMonthSales('audit-user');
  results.push({ name: 'Tier net goods GMV excludes shipping voucher 25000', expected: 230000, actual: sales.revenue, result: sales.revenue === 230000 ? 'PASS' : 'FAIL' });
  process.stdout.write(JSON.stringify({ scope: 'Service execution with fake data only; no database writes or browser claims', passed: results.filter(r => r.result === 'PASS').length, failed: results.filter(r => r.result === 'FAIL').length, results }, null, 2) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

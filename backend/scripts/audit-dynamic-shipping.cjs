// Word section 4: service execution on fake data only. Never creates real GHN orders.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const { GhnService } = require('../src/modules/shipping/ghn.service');
const results = [];
function record(name, expected, actual) { results.push({ name, expected, actual, result: expected === actual ? 'PASS' : 'FAIL' }); }
async function rejects(callback) { try { await callback(); return false; } catch { return true; } }
async function fee(response) {
  const service = new GhnService({}, {});
  service.ghnFetch = async () => response;
  return service.calculateShippingFee({ toDistrictId: 1, toWardCode: '001', weight: 500, insuranceValue: 250000 });
}
function sampleFixture(hasWarehouse = true) {
  let sent;
  const sample = { id: 'audit-sample', status: 'APPROVED', collaboratorId: 'audit-kol',
    recipientName: 'Audit KOL', recipientPhone: '0900000000', shippingAddress: 'Audit destination', ghnDistrictId: 2, ghnWardCode: '002',
    product: { title: 'Sample', price: 250000, store: { id: 'audit-store', ownerId: 'audit-owner', name: 'Audit Shop',
      onboardingData: hasWarehouse ? { warehouseAddress: 'Actual Shop warehouse', contactPhone: '0900000001' } : {}, returnWarehouse: {} } } };
  const prisma = {
    sampleProductRequest: { findUnique: async () => sample, updateMany: async () => ({ count: 1 }) },
    sampleShippingCharge: { create: async () => ({}) },
    sampleRequestEvent: { create: async () => ({}) }, notification: { create: async () => ({}) },
    $transaction: async callback => callback(prisma),
  };
  const service = new GhnService(prisma, {});
  service.resolveGhnLocation = async () => ({ districtId: 1, wardCode: '001' });
  service.ghnFetch = async (_path, options) => {
    sent = options.body;
    return { code: 200, data: { order_code: 'FAKE-AUDIT-ONLY', total_fee: 29001 } };
  };
  return { service, sent: () => sent };
}
(async () => {
  const quoted = await fee({ code: 200, data: { total: 29001, service_fee: 29001, insurance_fee: 0 } });
  record('Returns the GHN quoted amount, not a fixed 0 or 25000', 29001, quoted.totalFee);
  record('GHN error must reject rather than fall back to free shipping', true, await rejects(() => fee({ code: 400, message: 'Unavailable' })));
  record('Missing total must reject rather than reach order fallback zero', true, await rejects(() => fee({ code: 200, data: {} })));
  record('Negative total must reject', true, await rejects(() => fee({ code: 200, data: { total: -10000 } })));
  const sample = sampleFixture();
  await sample.service.createSampleShippingOrder('audit-sample', 'audit-owner');
  record('Sample COD is zero for the KOL', 0, sample.sent().cod_amount);
  record('Sample sender pays carrier freight', 1, sample.sent().payment_type_id);
  record('Sample dispatch uses the actual Shop warehouse', 'Actual Shop warehouse', sample.sent().from_address);
  const missingWarehouse = sampleFixture(false);
  record('Missing Shop warehouse must not silently use a sample SCANMS address', true,
    await rejects(() => missingWarehouse.service.createSampleShippingOrder('audit-sample', 'audit-owner')));
  process.stdout.write(JSON.stringify({ scope: 'Fake service data and mocked GHN transport; no real order or database writes',
    passed: results.filter(result => result.result === 'PASS').length, failed: results.filter(result => result.result === 'FAIL').length, results }, null, 2) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

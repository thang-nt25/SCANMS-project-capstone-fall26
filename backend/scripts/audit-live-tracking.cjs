// Audit only: execute existing services with fake Prisma and mocked GHN.
// No production orders, external requests, webhook writes or simulations in the UI.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const { GhnService } = require('../src/modules/shipping/ghn.service');
const { OrdersService } = require('../src/modules/orders/orders.service');
const { ShippingController } = require('../src/modules/shipping/shipping.controller');
const results = [];
const check = (name, expected, actual) => results.push({ name, expected, actual,
  result: JSON.stringify(expected) === JSON.stringify(actual) ? 'PASS' : 'FAIL' });
async function track(data, environment = 'LIVE') {
  const service = new GhnService({}, {});
  service.ghnFetch = async () => ({ code: 200, data });
  return service.trackOrder('AUDIT-ONLY', environment);
}
(async () => {
  const entries = ['picked', 'storing', 'delivering', 'delivered'].map((status, i) => ({ status, updated_date: `2026-10-16T0${i + 1}:00:00Z` }));
  const result = await track({ status: 'delivered', log: entries, shipper_name: 'Audit Driver', shipper_phone: '0900000000' });
  check('All four GHN log events reach the timeline', 4, result.timeline.length);
  check('Picked event clearly means the courier collected from the Shop', true, /lấy.*(?:shop|kho)/i.test(result.timeline[0].title));
  check('Warehouse milestone is labelled as entry into the transit warehouse', 'Nhập kho trung chuyển', result.timeline[1].title);
  check('Delivered event is labelled correctly', 'Giao hàng thành công', result.timeline[3].title);
  check('Detail response shipper name and phone are preserved when supplied', true,
    result.shipperName === 'Audit Driver' && result.shipperPhone === '0900000000');
  const noData = await track({ status: 'ready_to_pick' }, 'TEST');
  check('Staging does not invent a shipper or past milestones', true,
    noData.environment === 'TEST' && noData.timeline.length === 0 && noData.shipperName === null && noData.shipperPhone === null);
  const publicResponse = await new ShippingController({ trackOrder: async () => result }, {}).trackOrder('AUDIT-ONLY');
  check('Public API excludes the raw GHN object', false, Object.hasOwn(publicResponse, 'ghnRawDetail'));
  const shuffled = await track({ status: 'delivered', log: [...entries].reverse() });
  check('Milestones are normalized into chronological order', entries.map(e => e.status), shuffled.timeline.map(e => e.status));
  let toleratesBadLog = true;
  try { await track({ status: 'delivering', log: [null, ...entries] }); } catch { toleratesBadLog = false; }
  check('An invalid log entry does not discard the entire tracking response', true, toleratesBadLog);
  let saved = false;
  const secret = 'audit-webhook-secret-at-least-32-characters';
  const trackingRecords = {
    upsert: async () => ({ events: [] }),
    update: async ({ data }) => { saved = data.shipperName === 'Audit Driver' && data.events.length > 0; return data; },
  };
  const webhook = new GhnService({
    ghnTrackingRecord: trackingRecords,
    order: { findFirst: async () => ({ id: 'audit-order', status: 'SHIPPING', rawPayload: {} }) },
    $transaction: async callback => callback({ ghnTrackingRecord: trackingRecords }),
  }, { get: name => name === 'GHN_WEBHOOK_SECRET' ? secret : name === 'GHN_SHOP_ID' ? '123' : undefined });
  webhook.trackOrder = async () => ({ ghnRawDetail: { status: 'delivering' } });
  await webhook.handleGhnWebhook({ ShopID: 123, OrderCode: 'AUDIT-ONLY', Status: 'delivering',
    Time: '2026-10-16T03:00:00Z', ShipperName: 'Audit Driver', ShipperPhone: '0900000000' }, secret);
  check('Verified delivery callback retains shipper contact/history for later customer lookup', true, saved);
  const order = { id: 'audit-order', externalOrderSn: 'AUDIT-ONLY', status: 'SHIPPING', customerName: 'Audit',
    customerPhone: '0900000000', shippingAddress: 'Audit address', rawPayload: { trackingNumber: 'GHN-MANUAL', carrierName: 'GHN' },
    subtotalAmount: 100000, discountAmount: 0, finalAmount: 125000, orderItems: [], productReviews: [], store: { id: 'audit-store' } };
  const orders = Object.assign(Object.create(OrdersService.prototype), {
    prisma: { order: { findMany: async () => [order] } }, configService: { get: key => key === 'JWT_SECRET' ? 'audit-only-key' : undefined },
  });
  const publicLookup = await orders.trackOrderByPhoneOrSn({ phone: '0900000000', orderSn: 'AUDIT-ONLY' });
  check('Public order lookup includes manually stored GHN trackingNumber', 'GHN-MANUAL', publicLookup.orders[0].trackingNumber);
  process.stdout.write(JSON.stringify({ scope: 'Fake service data; no network or database writes',
    passed: results.filter(r => r.result === 'PASS').length, failed: results.filter(r => r.result === 'FAIL').length, results }, null, 2) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

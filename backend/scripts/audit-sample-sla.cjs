// Word section 2 audit. Fake database/transport only; no real sample or GHN writes.
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const { GhnService } = require('../src/modules/shipping/ghn.service');
const { SamplesService } = require('../src/modules/samples/samples.service');
const results = [];
const check = (name, expected, actual) => results.push({ name, expected, actual, result: expected === actual ? 'PASS' : 'FAIL' });
async function rejects(callback) { try { await callback(); return false; } catch { return true; } }
function fixture(status = 'SHIPPED') {
  const sample = { id: 'audit-sample', collaboratorId: 'audit-kol', status, carrier: 'GHN', trackingNumber: 'AUDIT-GHN',
    receivedAt: null, deadlineAt: null, expectedVideoAt: null,
    product: { id: 'audit-product', title: 'Audit', storeId: 'audit-store', store: { ownerId: 'audit-owner' } },
    collaborator: { id: 'audit-kol', fullName: 'Audit' } };
  let tracking = { status: 'delivering', log: [] };
  let evidence = { events: [] };
  const prisma = {
    sampleProductRequest: {
      findUnique: async () => ({ ...sample }), findFirst: async () => ({ ...sample }),
      findMany: async ({ where }) => (typeof where.status === 'string' ? where.status === sample.status : where.status.in.includes(sample.status)) ? [{ id: sample.id, trackingNumber: sample.trackingNumber }] : [],
      updateMany: async ({ where, data }) => {
        if ((typeof where.status === 'string' ? where.status !== sample.status : !where.status.in.includes(sample.status)) || (where.trackingNumber && where.trackingNumber !== sample.trackingNumber)) return { count: 0 };
        Object.assign(sample, data); return { count: 1 };
      },
    },
    sampleRequestEvent: { create: async () => ({}) }, notification: { create: async () => ({}) },
    order: { findFirst: async () => null },
    ghnTrackingRecord: { findUnique: async () => evidence, upsert: async () => evidence, update: async ({ data }) => (evidence = { ...evidence, ...data }) },
    $transaction: async callback => callback(prisma),
  };
  const secret = 'audit-only-webhook-secret-with-32-characters';
  const ghn = new GhnService(prisma, { get: key => key === 'GHN_WEBHOOK_SECRET' ? secret : key === 'GHN_SHOP_ID' ? '101' : undefined });
  ghn.trackOrder = async () => ({ environment: 'LIVE', ghnRawDetail: tracking, status: tracking.status });
  const samples = Object.assign(Object.create(SamplesService.prototype), { prisma });
  return { ghn, samples, sample, secret, setTracking: value => (tracking = value), evidence: () => evidence };
}
(async () => {
  const manual = fixture();
  check('KOL cannot confirm receipt manually', true, await rejects(() => manual.samples.confirmReceived('audit-sample', 'audit-kol')));
  for (const status of ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERY_ISSUE']) {
    const f = fixture(status);
    check(`Video submission is blocked in ${status}`, true, await rejects(() => f.samples.submitVideo('audit-sample', 'audit-kol', { title: 'Audit', videoUrl: 'https://www.tiktok.com/@audit/video/1' })));
  }
  const pending = fixture();
  await pending.ghn.syncSampleDelivery('audit-sample', 'audit-kol');
  check('GHN delivering does not start RECEIVED or a deadline', true, pending.sample.status === 'SHIPPED' && pending.sample.deadlineAt === null);
  await pending.ghn.reconcileShippedSamples();
  check('Scheduled fallback does not assume delivery just because shipping time elapsed', 'SHIPPED', pending.sample.status);
  const deliveredAt = '2026-10-01T10:00:00Z';
  pending.setTracking({ status: 'delivered', log: [{ status: 'delivered', created_date: deliveredAt }] });
  await pending.ghn.syncSampleDelivery('audit-sample', 'audit-kol');
  check('Verified GHN delivered transitions SHIPPED to RECEIVED', 'RECEIVED', pending.sample.status);
  check('Video SLA is exactly 14 days from the GHN delivery timestamp', 14, (pending.sample.deadlineAt - pending.sample.receivedAt) / 86400000);
  const firstDeadline = pending.sample.deadlineAt.getTime();
  await pending.ghn.syncSampleDelivery('audit-sample', 'audit-kol');
  check('Repeated synchronization never extends the video deadline', firstDeadline, pending.sample.deadlineAt.getTime());
  const noTime = fixture(); noTime.setTracking({ status: 'delivered', log: [] });
  await noTime.ghn.syncSampleDelivery('audit-sample', 'audit-kol');
  check('No delivery timestamp means no invented receipt time or premature SLA', true, noTime.sample.status === 'SHIPPED' && noTime.sample.deadlineAt === null);
  const issue = fixture('DELIVERY_ISSUE');
  issue.setTracking({ status: 'delivered', log: [{ status: 'delivered', created_date: deliveredAt }] });
  await issue.ghn.syncSampleDelivery('audit-sample', 'audit-kol');
  check('A previously reported delivery issue can recover after verified GHN delivery', 'RECEIVED', issue.sample.status);
  const callback = fixture(); callback.setTracking({ status: 'delivered', log: [] });
  await callback.ghn.handleGhnWebhook({ ShopID: 101, OrderCode: 'AUDIT-GHN', Status: 'delivered', Time: deliveredAt }, callback.secret);
  check('Authenticated delivered callback time starts SLA when detail omits log/finish_date', 'RECEIVED', callback.sample.status);
  check('The callback delivery time is actually retained as trusted tracking evidence', true,
    callback.evidence().events.some(event => event.status === 'delivered' && event.time));
  process.stdout.write(JSON.stringify({ scope: 'Mocked services; no network or database writes',
    passed: results.filter(r => r.result === 'PASS').length, failed: results.filter(r => r.result === 'FAIL').length, results }, null, 2) + '\n');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

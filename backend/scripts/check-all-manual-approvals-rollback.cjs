require('dotenv/config');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  try {
    const { AdminPayoutsController } = require('../dist/modules/payouts/admin-payouts.controller');
    const actor = await db.user.findFirstOrThrow({ where: { role: 'SYSTEM_MANAGER', isActive: true, isDeleted: false }, select: { id: true, role: true } });
    const rows = await db.payoutRequest.findMany({ where: { status: { in: ['PENDING', 'PROCESSING'] } }, orderBy: { createdAt: 'desc' } });
    const used = await db.payoutRequest.findFirst({ where: { transferProvider: 'MANUAL', proofImageSha256: { not: null } }, orderBy: { processedAt: 'desc' }, select: { proofImageSha256: true } });
    const customerPendingCount = await db.customerWithdrawal.count({ where: { status: 'PENDING' } });
    console.log(JSON.stringify({ pendingCount: rows.length, customerPendingCount, existingManualReceipt: !!used }));
    for (const row of rows) {
      for (const duplicate of used ? [false, true] : [false]) {
        const rollback = new Error('EXPECTED_ROLLBACK');
        let completed = false;
        const hash = duplicate ? used.proofImageSha256 : createHash('sha256').update(`rollback-only:${row.id}`).digest('hex');
        const facade = { payoutRequest: db.payoutRequest, $transaction: work => db.$transaction(async tx => { await work(tx); completed = true; throw rollback; }, { timeout: 20000 }) };
        const bills = { validateBill: () => hash, uploadBill: async () => ({ publicId: 'ROLLBACK_ONLY', secureUrl: 'https://example.invalid/rollback-only.png', format: 'png', sha256: hash }), removeUnusedBill: async () => {} };
        const controller = new AdminPayoutsController(facade, { serializePayout: x => ({ id: x.id }) }, {}, bills, {});
        let failure;
        try { await controller.approve(row.id, actor, { bankRefCode: `ROLLBACK-${row.id}`, expectedNetAmount: row.netAmount.toFixed(2) }, {}); } catch (e) { if (e !== rollback) failure = e; }
        assert.deepEqual(await db.payoutRequest.findUniqueOrThrow({ where: { id: row.id } }), row);
        if (duplicate) assert.equal(failure?.getStatus?.(), 409);
        else assert.ok(completed || failure?.getStatus?.() === 400, 'Unexpected approval server failure');
        console.log(JSON.stringify({ id: row.id, duplicateReceipt: duplicate, completedBeforeRollback: completed, status: failure?.getStatus?.(), code: failure?.code, message: failure ? String(failure.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]').slice(-500) : undefined, unchanged: true }));
      }
    }
    const { CustomerWithdrawalsService } = require('../dist/modules/payouts/customer-withdrawals.service');
    for (const row of await db.customerWithdrawal.findMany({ where: { status: 'PENDING' } })) {
      const rollback = new Error('EXPECTED_ROLLBACK');
      let completed = false;
      const hash = createHash('sha256').update(`rollback-only-customer:${row.id}`).digest('hex');
      const facade = { customerWithdrawal: db.customerWithdrawal, $transaction: work => db.$transaction(async tx => { await work(tx); completed = true; throw rollback; }, { timeout: 20000 }) };
      const bills = { validateBill: () => hash, uploadBill: async () => ({ publicId: 'ROLLBACK_ONLY', format: 'png', sha256: hash }), removeUnusedBill: async () => {} };
      const service = new CustomerWithdrawalsService(facade, {}, bills);
      try { await service.approve(actor, row.id, { bankRefCode: `ROLLBACK-${row.id}` }, {}); } catch (e) { if (e !== rollback) throw e; }
      assert.ok(completed);
      assert.deepEqual(await db.customerWithdrawal.findUniqueOrThrow({ where: { id: row.id } }), row);
      console.log(JSON.stringify({ customerId: row.id, completedBeforeRollback: completed, unchanged: true }));
    }
  } finally { await db.$disconnect(); }
})().catch(e => { console.error(JSON.stringify({ name: e.name, code: e.code })); process.exitCode = 1; });

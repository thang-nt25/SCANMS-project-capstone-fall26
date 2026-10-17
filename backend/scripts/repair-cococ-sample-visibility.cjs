// One-time repair of the two previously approved products affected by sample-form saves.
// Does not approve new products or alter product content / sample quota / stock.
require('reflect-metadata');
require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true });
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaService } = require('../src/core/database/prisma.service');
const { ProductsService } = require('../src/modules/products/products.service');
const { UserRole } = require('@prisma/client');
const storeId = 'a6389414-ccf8-4c35-be56-ab2d2e926229';
const targets = [
  { id: 'b484492e-9444-4097-85a3-f98befab55c1', sku: 'FASHION-Q8N8C' },
  { id: 'af1046a2-e648-4d9e-bd8c-a6cd40160b94', sku: 'FASHION-9POZ8' },
];
const allowed = new Set(['isActive', 'moderationStatus', 'moderationReason', 'moderatedAt', 'moderatedById', 'updatedAt']);
const content = row => Object.fromEntries(Object.entries(row).filter(([key]) => !allowed.has(key)));
(async () => {
  const db = new PrismaService();
  const apply = process.argv.includes('--apply');
  try {
    const snapshots = [];
    for (const target of targets) {
      const product = await db.product.findUniqueOrThrow({ where: { id: target.id } });
      assert.equal(product.storeId, storeId);
      assert.equal(product.sku, target.sku);
      assert.equal(product.isDeleted, false);
      const decision = await db.auditLog.findFirst({
        where: { action: { in: ['PRODUCT_MODERATION_APPROVED', 'PRODUCT_MODERATION_REJECTED'] }, details: { path: ['productId'], equals: product.id } },
        orderBy: { createdAt: 'desc' },
      });
      assert.equal(decision?.action, 'PRODUCT_MODERATION_APPROVED', 'Must have a previous approval with no later rejection');
      if (product.moderationStatus === 'APPROVED' && product.isActive) continue;
      const previousRepair = await db.auditLog.findFirst({ where: {
        action: 'PRODUCT_SAMPLE_VISIBILITY_REPAIRED', details: { path: ['productId'], equals: product.id },
      } });
      assert.equal(previousRepair, null, 'One-time repair already performed; do not bypass a later review');
      assert.equal(product.moderationStatus, 'DRAFT');
      assert.equal(product.moderationReason, null);
      assert.equal(product.sampleEnabled, true);
      const [version] = await db.$queryRaw`SELECT xmin::text AS version FROM products WHERE id = ${product.id}::uuid`;
      snapshots.push({ product, priorApproval: decision, rowVersion: version.version });
    }
    let backupFile = null;
    if (apply && snapshots.length) {
      backupFile = path.join(os.tmpdir(), `scanms-sample-visibility-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(snapshots, null, 2), { flag: 'wx' });
      await db.$transaction(async tx => {
        for (const { product, priorApproval, rowVersion } of snapshots) {
          const [locked] = await tx.$queryRaw`SELECT xmin::text AS version FROM products WHERE id = ${product.id}::uuid FOR UPDATE`;
          assert.equal(locked.version, rowVersion, 'Concurrent update: repair aborted');
          const changed = await tx.product.updateMany({
            where: { id: product.id, storeId, moderationStatus: 'DRAFT', moderationReason: null, isDeleted: false, sampleEnabled: true },
            data: { moderationStatus: 'APPROVED', isActive: true, moderationReason: null,
              moderatedAt: priorApproval.createdAt, moderatedById: priorApproval.userId },
          });
          assert.equal(changed.count, 1, 'Concurrent update: repair aborted');
          const after = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
          assert.deepEqual(content(after), content(product), 'Repair must preserve all product content, quotas and stock');
          await tx.auditLog.create({ data: { action: 'PRODUCT_SAMPLE_VISIBILITY_REPAIRED', details: {
            productId: product.id, storeId, previousStatus: product.moderationStatus, status: 'APPROVED',
            priorApprovalAuditId: priorApproval.id,
            reason: 'Restore prior approval after unintended draft transition while saving sample policy; requested by project owner.',
          } } });
        }
      });
    }
    const productsService = new ProductsService(db, {}, { delPrefix: async () => {} });
    const visible = await productsService.findAll({ storeId, limit: 50 }, { id: 'repair-verification', role: UserRole.COLLABORATOR });
    const rows = visible.items.filter(item => targets.some(target => target.id === item.id));
    if (apply) assert.equal(rows.length, 2, 'Both products must be visible through the real KOL product query');
    console.log(JSON.stringify({ applied: apply, productsToRepair: snapshots.length, backupFile,
      visibleToKol: rows.map(item => ({ sku: item.sku, moderationStatus: item.moderationStatus, isActive: item.isActive,
        sampleEnabled: item.sampleEnabled, sampleQuota: item.sampleQuota, sampleGrantedCount: item.sampleGrantedCount })) }, null, 2));
  } finally { await db.onModuleDestroy(); }
})().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'Sample visibility repair failed'); process.exitCode = 1; });

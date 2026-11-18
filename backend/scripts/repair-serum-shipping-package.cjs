// User-authorized temporary parcel estimate. Never overwrite existing measurements.
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const fields = ['packageWeight', 'packageLength', 'packageWidth', 'packageHeight'];
async function main() {
  const before = await db.product.findUniqueOrThrow({
    where: { id: '70d93fc2-fa05-41aa-bcbe-98a9b18d22ba' },
    select: { id: true, sku: true, updatedAt: true, packageWeight: true, packageLength: true, packageWidth: true, packageHeight: true },
  });
  if (before.sku !== 'SORA-VITC-215') throw new Error('Unexpected product; no changes made.');
  const estimate = { packageLength: 10, packageWidth: 8, packageHeight: 15 };
  const patch = Object.fromEntries(Object.entries(estimate).filter(([key]) => before[key] === null));
  if (process.argv.includes('--apply') && Object.keys(patch).length) {
    const backup = path.join(__dirname, `serum-package-before-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify({ reason: 'User-authorized temporary estimate; Shop must verify physical parcel', before, patch }, null, 2), { flag: 'wx' });
    const changed = await db.product.updateMany({ where: before, data: patch });
    if (changed.count !== 1) throw new Error('Concurrent edit detected; no product overwritten.');
    console.log(JSON.stringify({ updated: changed.count, backup, patch }));
  } else console.log(JSON.stringify({ mode: 'plan', before, patch }));
  const products = await db.product.findMany({
    where: { isDeleted: false, isActive: true, moderationStatus: 'APPROVED' },
    select: { id: true, sku: true, storeId: true, packageWeight: true, packageLength: true, packageWidth: true, packageHeight: true },
  });
  console.log(JSON.stringify({ activeProducts: products.length, missingPackages: products.filter(p => fields.some(f => !Number.isInteger(p[f]) || p[f] < 1)).map(p => p.sku) }));
  if (process.argv.includes('--verify-quotes')) {
    for (const product of products) {
      const response = await fetch('https://scanms-api.onrender.com/api/shipping/ghn/quote-address', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: product.storeId,
          address: '15 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
          items: [{ productId: product.id, quantity: 1 }] }),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json();
      console.log(JSON.stringify({ sku: product.sku, status: response.status,
        fee: body.data?.totalFee ?? body.totalFee, error: response.ok ? undefined : body.message }));
    }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());

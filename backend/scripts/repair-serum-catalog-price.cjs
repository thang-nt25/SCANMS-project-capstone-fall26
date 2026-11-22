// Repair the legacy base price, preserving the advertised selling/original prices.
require('dotenv/config');
require('ts-node/register/transpile-only');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { reservePromotionBudget } = require('../src/modules/pricing/pricing-policy');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
async function main() {
  const productId = '70d93fc2-fa05-41aa-bcbe-98a9b18d22ba';
  const select = { id: true, sku: true, price: true, listPrice: true, originalPrice: true, updatedAt: true };
  const before = await db.product.findUniqueOrThrow({ where: { id: productId }, select });
  console.log(JSON.stringify({ before }));
  if (process.argv.includes('--apply') && !before.listPrice.equals(before.price)) {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE`;
      const current = await tx.product.findUniqueOrThrow({ where: { id: productId }, select });
      const promotions = await tx.productPricePromotion.count({ where: { productId } });
      if (current.sku !== 'SORA-VITC-215' || !current.price.equals(390000) ||
          !current.listPrice.equals(450000) || promotions !== 0 ||
          current.updatedAt.getTime() !== before.updatedAt.getTime()) {
        throw new Error('Unexpected catalog state; no price changes made.');
      }
      const backup = path.join(__dirname, `serum-price-before-${Date.now()}.json`);
      fs.writeFileSync(backup, JSON.stringify({ before, reason: 'Legacy base-price mismatch without any price promotion; preserve selling price 390000 and original price 450000' }, null, 2), { flag: 'wx' });
      await tx.product.update({ where: { id: productId }, data: { listPrice: current.price } });
      console.log(JSON.stringify({ repairedBasePrice: 390000, backup }));
    });
  }
  // Exercise the actual checkout guard for every sellable SKU. The transaction
  // always rolls back, including any hypothetical promotion reservation.
  const rollback = new Error('READONLY_CHECK_COMPLETE');
  try {
    await db.$transaction(async tx => {
      const products = await tx.product.findMany({
        where: { isActive: true, isDeleted: false, moderationStatus: 'APPROVED' },
        include: { variants: { where: { isActive: true } } },
      });
      let checked = 0;
      for (const p of products) {
        for (const v of p.variants.length ? p.variants : [null]) {
          const price = Number(v?.price ?? p.price);
          await reservePromotionBudget(tx, '00000000-0000-4000-8000-000000000000', [{
            productId: p.id, variantId: v?.id, quantity: 1, unitPrice: price, netGoods: price,
          }]);
          checked++;
        }
      }
      console.log(JSON.stringify({ checkoutPriceChecksPassed: checked, products: products.length, financialWritesCommitted: false }));
      throw rollback;
    }, { timeout: 30000 });
  } catch (e) { if (e !== rollback && e.message !== rollback.message) throw e; }
  console.log(JSON.stringify({ after: await db.product.findUniqueOrThrow({ where: { id: productId }, select }) }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());

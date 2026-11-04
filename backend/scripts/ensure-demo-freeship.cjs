require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const apply = process.argv[2] === '--apply';
  if (!apply && process.argv[2] !== '--check') throw new Error('Use --check or --apply');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 15000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const codeNormalized = 'SCANMSFREESHIP';
    const existing = await prisma.coupon.findUnique({ where: { codeNormalized } });
    const store = await prisma.store.findFirst({
      where: { isActive: true, isDeleted: false, owner: { isActive: true, isDeleted: false } },
      select: { id: true, name: true }, orderBy: { createdAt: 'asc' },
    });
    const admin = await prisma.user.findFirst({
      where: { role: 'SYSTEM_ADMIN', isActive: true, isDeleted: false },
      select: { id: true }, orderBy: { createdAt: 'asc' },
    });
    console.log(JSON.stringify({
      exists: Boolean(existing), status: existing?.status || null,
      deleted: Boolean(existing?.deletedAt), uses: existing?.usageCount || 0,
      perCustomer: existing?.usageLimitPerCustomer || null,
      anchorStore: store?.name || null, adminAvailable: Boolean(admin),
    }));
    if (!apply || existing) return;
    if (!store || !admin) throw new Error('An active store and admin are required');
    const coupon = await prisma.coupon.create({ data: {
      codeNormalized, displayCode: codeNormalized,
      storeId: store.id, collaboratorId: admin.id,
      status: 'ACTIVE', discountType: 'PERCENTAGE', discountValue: 100,
      minimumOrderAmount: 0, maximumDiscountAmount: 100000,
      usageLimitTotal: 500, usageLimitPerCustomer: 3,
      budgetTotal: 20000000, budgetUsed: 0,
      startsAt: new Date(), scopeType: 'STORE_WIDE',
      fundingSource: 'PLATFORM_FUNDED', benefitType: 'SHIPPING',
      shopFundingRate: 0, platformFundingRate: 100,
      stackableWithProductDiscount: true, stackableWithShopVoucher: true,
      stackableWithPlatformVoucher: true,
      approvedBy: admin.id, approvedAt: new Date(),
    } });
    console.log(JSON.stringify({ created: coupon.displayCode, id: coupon.id }));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

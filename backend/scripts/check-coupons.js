require('dotenv').config({ path: 'c:/Users/tuann/OneDrive/Desktop/Đồ Án/backend/.env' });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function checkCoupons() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        store: { select: { name: true, slug: true } },
      },
    });
    console.log('=== COUPONS ===');
    console.log('COUNT:', coupons.length);
    console.log(JSON.stringify(coupons.map(c => ({
      id: c.id,
      code: c.displayCode,
      codeNormalized: c.codeNormalized,
      status: c.status,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrder: c.minimumOrderAmount,
      maxDiscount: c.maximumDiscountAmount,
      scopeType: c.scopeType,
      store: c.store?.name,
    })), null, 2));

    const stores = await prisma.store.findMany({ select: { id: true, name: true, slug: true } });
    console.log('=== STORES ===');
    console.log(stores);

    const collabs = await prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      select: { id: true, email: true, fullName: true },
      take: 5
    });
    console.log('=== COLLABORATORS ===');
    console.log(collabs);

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkCoupons().catch(console.error);

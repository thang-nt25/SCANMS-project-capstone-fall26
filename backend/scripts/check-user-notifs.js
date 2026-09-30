require('dotenv').config({ path: 'c:/Users/tuann/OneDrive/Desktop/Đồ Án/backend/.env' });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const deleted = await prisma.notification.deleteMany({
      where: {
        OR: [
          { type: 'WALLET_TOPUP' },
          { title: { contains: 'Ví tài khoản' } },
          { message: { contains: 'Ví điện tử' } },
        ]
      }
    });
    console.log('DELETED WALLET NOTIFS:', deleted.count);

    const notifs = await prisma.notification.findMany({
      where: { user: { email: { contains: 'nguyendinhcuong' } } },
      select: { id: true, title: true, type: true, createdAt: true, user: { select: { email: true } } }
    });
    console.log('REMAINING NOTIFICATIONS FOR nguyendinhcuong:');
    console.log(JSON.stringify(notifs, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);

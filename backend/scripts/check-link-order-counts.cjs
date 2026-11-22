require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
(async () => {
  try {
    const user = await db.user.findUnique({ where: { email: 'kol.bronze@scanms.vn' }, select: { id: true, role: true, email: true } });
    const links = await db.referralLink.findMany({ where: { collaboratorId: user.id, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, shortCode: true, totalOrders: true } });
    const rows = await Promise.all(links.map(async link => {
      const [orders, items] = await Promise.all([
        db.order.findMany({ where: { referralLinkId: link.id }, select: { id: true, status: true } }),
        db.orderItem.findMany({ where: { referralLinkId: link.id }, select: { orderId: true } }),
      ]);
      return { code: link.shortCode, displayed: link.totalOrders, orders: orders.length, nonCancelled: orders.filter(o => o.status !== 'CANCELLED').length, itemOrders: new Set(items.map(i => i.orderId)).size };
    }));
    console.log(JSON.stringify(rows));
    if (process.argv.includes('--api')) {
      const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2m' });
      const response = await fetch('http://localhost:3000/api/collaborator/referral-links?limit=100', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw Error(`List HTTP ${response.status}`);
      const body = await response.json();
      const result = body.data?.data ? body.data : body;
      if (!Array.isArray(result.data)) throw Error('Unexpected list response');
      for (const row of rows) {
        const actual = result.data.find(link => link.shortCode === row.code);
        if (actual?.totalOrders !== row.nonCancelled) throw Error(`Count mismatch: ${row.code}`);
      }
      const expected = rows.reduce((sum, row) => sum + row.nonCancelled, 0);
      if (result.summary.totalOrders !== expected) throw Error('Summary mismatch');
      console.log(JSON.stringify({ api: 'PASS', links: rows.length, totalOrders: expected }));
    }
  } finally { await db.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

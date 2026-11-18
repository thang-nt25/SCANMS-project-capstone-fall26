require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
(async () => { try {
  const store = await db.store.findFirst({ where: { name: { contains: 'Sora' }, isDeleted: false } });
  const user = await db.user.findUnique({ where: { id: store.ownerId } });
  const token = jwt.sign({sub:user.id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'3m'});
  for (const month of ['2026-12', '2026-11', '2026-10', '2026-01', '2026-11']) {
    const started = performance.now();
    const response = await fetch(`http://localhost:3000/api/monthly-rewards?month=${month}&storeId=${store.id}`, { headers:{Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(45000) });
    const json = await response.json(); const data = json.data ?? json;
    console.log(JSON.stringify({month,status:response.status,ms:Math.round(performance.now()-started),members:data.policies?.reduce((total,p)=>total+p.members.length,0),history:data.legacyHistory?.length}));
  }
} catch(err) { console.error(err.message?.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]')); process.exitCode=1; } finally { await db.$disconnect(); } })();

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const assert = require('node:assert/strict');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
(async () => { try {
  const stores = await db.store.findMany({ where: { isDeleted: false }, select: { id: true, name: true } });
  for (const store of stores) {
    const rules = await db.commissionRule.findMany({ where: { storeId: store.id }, select: { name: true, minMonthlyRevenue: true, achievementBonus: true, bonusPercentage: true, effectiveFrom: true, effectiveTo: true, createdAt: true, isActive: true, isDeleted: true } });
    const settlements = await db.monthlyBonusResult.findMany({ where: { storeId: store.id }, select: { yearMonth: true, validRevenue: true, appliedRuleName: true, bonusAmount: true, status: true, ruleSnapshot: true } });
    console.log(JSON.stringify({ store: store.name, rules, settlements }));
  }
  if (process.argv.includes('--api')) {
    const saved = await db.monthlyBonusResult.findFirst({ where: { yearMonth: '2026-10', status: 'PAID' }, include: { store: true } });
    assert(saved);
    const users = [await db.user.findUnique({where:{id:saved.store.ownerId}}), await db.user.findUnique({where:{id:saved.collaboratorId}}), await db.user.findFirst({where:{role:'SYSTEM_MANAGER',isActive:true,isDeleted:false}}), await db.user.findFirst({where:{role:'SYSTEM_ADMIN',isActive:true,isDeleted:false}})];
    for (const user of users) {
      const token = jwt.sign({sub:user.id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'2m'});
      const get = async month => { const response = await fetch(`http://localhost:3000/api/monthly-rewards?month=${month}&storeId=${saved.storeId}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(45000)}); assert.equal(response.status,200); const json = await response.json(); return json.data ?? json; };
      const old = await get('2026-10');
      const row = old.legacyHistory.flatMap(h=>h.settlements).find(s=>s.id===saved.id);
      assert(row); assert.equal(row.amount,saved.bonusAmount.toString()); assert.equal(row.validRevenue,saved.validRevenue.toString()); assert.equal(row.status,'PAID');
      if(user.role==='COLLABORATOR') assert(old.legacyHistory.every(h=>h.settlements.every(s=>s.collaboratorId===user.id)));
      const history = old.legacyHistory.find(h => h.storeId === saved.storeId);
      assert(history.members.some(m => m.id === saved.id && m.isSettled && m.amount === saved.bonusAmount.toString()));
      assert(history.members.filter(m => !m.isSettled).every(m => m.status === 'NOT_SETTLED' && m.amount === null));
      if(user.role==='COLLABORATOR') assert(history.members.every(m=>m.collaboratorId===user.id));
      const empty = await get('2026-01'); assert.equal(empty.legacyHistory.length,0); assert.equal(empty.policies.length,0);
      console.log(JSON.stringify({role:user.role,restoredMonth:'2026-10',revenue:row.validRevenue,reward:row.amount,status:row.status,members:history.members.length,unsettled:history.members.filter(m=>!m.isSettled).map(m=>({name:m.name,revenue:m.validRevenue})),january:'EMPTY'}));
    }
  }
} catch (err) { console.error(err.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; } finally { await db.$disconnect(); } })();

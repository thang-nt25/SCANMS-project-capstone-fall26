require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');
const assert = require('node:assert/strict');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
(async () => {
  try {
    const policy = await db.storeMonthlyRewardPolicy.findFirst({ where: { isDemo: true }, orderBy: { yearMonth: 'desc' } });
    assert(policy, 'Missing demo policy');
    const demoOrder = await db.order.findFirst({ where: { storeId: policy.storeId, idempotencyKey: { startsWith: 'DEMO-MONTHLY-REWARD-' } } });
    assert(demoOrder, 'Missing demo order');
    const priorReward = await db.monthlyBonusResult.findUnique({ where: { storeId_collaboratorId_yearMonth: { storeId: policy.storeId, collaboratorId: demoOrder.attributedCollaboratorId, yearMonth: policy.yearMonth } } });
    assert(!priorReward || !['APPROVED', 'PAID'].includes(priorReward.status), 'Demo KOL already has an old reviewed reward; reconcile before demoing a new grant');
    const store = await db.store.findUnique({ where: { id: policy.storeId } });
    const partnerships = await db.storeCollaborator.findMany({where:{storeId:store.id,status:'APPROVED'},select:{collaboratorId:true}});
    const approvedIds = new Set(partnerships.map(p=>p.collaboratorId));
    const roles = [await db.user.findUnique({ where: { id: store.ownerId } }), await db.user.findUnique({ where: { id: demoOrder.attributedCollaboratorId } }), await db.user.findFirst({ where: { role: 'SYSTEM_MANAGER', isActive: true, isDeleted: false } }), await db.user.findFirst({ where: { role: 'SYSTEM_ADMIN', isActive: true, isDeleted: false } })];
    for (const user of roles) {
      assert(user);
      const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2m' });
      const response = await fetch(`http://localhost:3000/api/monthly-rewards?month=${policy.yearMonth}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(45000) });
      assert.equal(response.status, 200, `${user.role}: API status ${response.status}`);
      const json = await response.json(); const data = json.data ?? json;
      const result = data.policies.find(p => p.id === policy.id);
      assert(result, `${user.role}: demo not visible`);
      assert(result.members.every(m=>approvedIds.has(m.collaboratorId)), 'Reward list must contain approved store partners only');
      const member = result.members.find(m => m.collaboratorId === demoOrder.attributedCollaboratorId);
      assert(member?.eligible, `${user.role}: demo KOL not eligible: ${JSON.stringify(member)}`);
      assert(Number(member.validRevenue) >= 52000000);
      if (user.role === 'COLLABORATOR') assert(result.members.every(m => m.collaboratorId === user.id));
      if (user.role === 'SHOP_MANAGER') assert(data.policies.every(p => p.storeId === store.id));
      console.log(JSON.stringify({ role: user.role, month: policy.yearMonth, kol: member.name, revenue: member.validRevenue, eligible: member.eligible, reward: member.estimatedReward, grant: member.grant?.status ?? 'NOT_REQUESTED', members:result.members.length,approvedStorePartners:approvedIds.size,scope:'APPROVED_STORE_PARTNERS_ONLY' }));
    }
  } catch (err) { console.error(err.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; }
  finally { await db.$disconnect(); }
})();

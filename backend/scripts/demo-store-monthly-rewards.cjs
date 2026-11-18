require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 12000 }) });
const apply = process.argv.includes('--apply');
(async () => {
  try {
    const stores = await db.store.findMany({ where: { isDeleted: false }, select: { id: true, name: true, ownerId: true }, orderBy: { name: 'asc' } });
    const store = stores.find(s => /sora/i.test(s.name)) || stores[0];
    if (!store) throw new Error('No demo store');
    const memberships = await db.storeCollaborator.findMany({ where: { storeId: store.id, status: 'APPROVED', collaborator: { isDeleted: false, isActive: true } }, include: { collaborator: { select: { id: true, fullName: true } } } });
    const kol = memberships.find(m => /Thảo Nhi/i.test(m.collaborator.fullName))?.collaborator || memberships[0]?.collaborator;
    const reviewer = await db.user.findFirst({ where: { role: 'SYSTEM_MANAGER', isActive: true, isDeleted: false }, select: { id: true } });
    const product = await db.product.findFirst({ where: { storeId: store.id, isDeleted: false, price: { gt: 0 } }, select: { id: true, title: true, price: true }, orderBy: { price: 'asc' } });
    if (!kol || !reviewer || !product) throw new Error('Missing demo membership/reviewer/product');
    const now = new Date();
    const month = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0,7);
    const qty = Math.ceil(52000000 / Number(product.price));
    const amount = product.price.mul(qty);
    const key = `DEMO-MONTHLY-REWARD-${store.id.slice(0,8)}-${month}`;
    const existing = await db.order.findUnique({ where: { idempotencyKey: key }, select: { id: true } });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'plan', month, store: store.name, kol: kol.fullName, product: product.title, qty, sales: amount.toString(), target: 50000000, reward: 2000000, existingOrder: !!existing, walletCredit: false }));
    if (!apply) return;
    await db.$transaction(async tx => {
      const policy = await tx.storeMonthlyRewardPolicy.upsert({
        where: { storeId_yearMonth: { storeId: store.id, yearMonth: month } },
        create: { storeId: store.id, yearMonth: month, name: 'Thưởng doanh số tháng · Mốc 50 triệu', targetRevenue: 50000000, rewardAmount: 2000000, status: 'APPROVED', createdBy: store.ownerId, reviewedBy: reviewer.id, reviewedAt: now, reviewNote: 'Chính sách mẫu đã duyệt để demo KPI tháng hiện tại', isDemo: true }, update: {},
      });
      if (!policy.isDemo) throw new Error('Existing non-demo policy: seed will not alter it');
      // Completed after the return window, in the selected VN month. Does not
      // call commission/payment processors or modify wallets, tiers or stock.
      const completedAt = new Date(`${month}-01T03:00:00Z`);
      const deliveredAt = new Date(completedAt.getTime() - 15 * 86400000);
      await tx.order.upsert({ where: { idempotencyKey: key }, update: {}, create: {
        storeId: store.id, externalOrderSn: key, idempotencyKey: key,
        attributedCollaboratorId: kol.id, customerName: 'Khách mẫu KPI thưởng tháng', customerEmail: 'monthly.reward.demo@scanms.test',
        subtotalAmount: amount, finalAmount: amount, status: 'COMPLETED',
        deliveredAt, completedAt, createdAt: new Date(deliveredAt.getTime() - 2 * 86400000),
        rawPayload: { isDemo: true, scenario: 'STORE_MONTHLY_REWARD', note: 'KPI-only sample; no wallet/commission credit' },
        orderItems: { create: { productId: product.id, quantity: qty, unitPrice: product.price, appliedCommissionRate: new Prisma.Decimal(0), calculatedCommissionAmount: new Prisma.Decimal(0) } },
      } });
      await tx.auditLog.create({ data: { userId: reviewer.id, action: 'SEED_STORE_MONTHLY_REWARD_DEMO', details: { policyId: policy.id, idempotencyKey: key, walletCredit: false } } });
    }, { timeout: 30000 });
    console.log('Demo ready; no grants or wallet credits created.');
  } catch (err) { console.error(err.message?.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; }
  finally { await db.$disconnect(); }
})();

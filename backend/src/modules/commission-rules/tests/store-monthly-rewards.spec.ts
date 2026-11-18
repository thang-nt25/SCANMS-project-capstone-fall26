import { Prisma, UserRole } from '@prisma/client';
import {
  StoreMonthlyRewardsService,
  rewardMonth,
} from '../store-monthly-rewards.service';

describe('Store monthly rewards review workflow', () => {
  const shop = { id: 'shop-user', role: UserRole.SHOP_MANAGER } as any;
  const manager = { id: 'reviewer', role: UserRole.SYSTEM_MANAGER } as any;
  const policy = {
    id: 'policy',
    storeId: 'store',
    yearMonth: rewardMonth(),
    status: 'APPROVED',
    name: 'Monthly KPI',
    targetRevenue: new Prisma.Decimal(50000000),
    rewardAmount: new Prisma.Decimal(2000000),
    createdBy: 'shop-user', store: { name: 'Sora' },
  };
  let tx: any,
    db: any,
    revenue: any,
    wallets: any,
    service: StoreMonthlyRewardsService;
  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      storeMonthlyRewardPolicy: {
        create: jest.fn().mockResolvedValue(policy),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      storeMonthlyRewardGrant: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: any) => where.policyId_collaboratorId ? Promise.resolve(null) : Promise.resolve({
            id: 'grant',
            collaboratorId: 'kol',
            requestedBy: shop.id,
            amount: policy.rewardAmount,
            status: 'PENDING',
            policy,
          })),
        upsert: jest.fn().mockResolvedValue({ id: 'grant', status: 'PENDING' }),
        update: jest.fn(),
      },
      storeCollaborator: { findFirst: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      monthlyBonusResult: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'settlement' }),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      commissionRule: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn(), createMany: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'reviewer' }]) },
      store: { findUnique: jest.fn().mockResolvedValue({ name: 'Sora' }) },
      financePosting: {
        create: jest.fn().mockResolvedValue({ id: 'finance' }),
      },
    };
    db = {
      ...tx,
      store: {
        findFirst: jest.fn().mockResolvedValue({ id: 'store' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'store', name: 'Sora' }]),
      },
      $transaction: jest.fn((work: any) => work(tx)),
    };
    db.storeMonthlyRewardPolicy.findUnique = jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.storeId_yearMonth ? null : policy));
    revenue = {
      calculateValidMonthlyRevenue: jest
        .fn()
        .mockResolvedValue({ validRevenue: '52000000', validOrdersCount: 10 }),
    };
    wallets = {
      creditAvailableBalance: jest
        .fn()
        .mockResolvedValue({ ledger: { id: 'ledger' } }),
    };
    service = new StoreMonthlyRewardsService(db, revenue, wallets);
  });
  it('uses Vietnam months and handles year rollover', () => {
    expect(rewardMonth(new Date('2026-11-30T18:00:00Z'))).toBe('2026-12');
    expect(rewardMonth(new Date('2026-12-20T00:00:00Z'), 1)).toBe('2027-01');
  });
  function historyFixture() {
    const savedRule = { id: 'legacy-rule', name: 'Old 50m policy', minMonthlyRevenue: '50000000', achievementBonus: '2000000', bonusPercentage: '0', isActive: true, effectiveFrom: '2026-09-30T17:00:00Z', effectiveTo: '2026-10-31T16:59:59Z' };
    return { id: 'old-paid', storeId: 'store', collaboratorId: 'kol', collaborator: { fullName: 'Nhi' }, yearMonth: '2026-10', validRevenue: new Prisma.Decimal(51871862), bonusAmount: new Prisma.Decimal(2000000), appliedRuleName: savedRule.name, status: 'PAID', ruleSnapshot: { rules: [savedRule] }, settledAt: new Date('2026-11-01T00:00:00Z'), paidAt: new Date('2026-11-02T00:00:00Z') };
  }
  it('restores paid legacy snapshots without recalculating or crediting money', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    tx.monthlyBonusResult.findMany.mockResolvedValue([historyFixture()]);
    const result = await service.list(shop, '2026-10');
    expect(result.legacyHistory[0].rules[0].targetRevenue).toBe('50000000');
    expect(result.legacyHistory[0].settlements[0]).toMatchObject({ validRevenue: '51871862', amount: '2000000', status: 'PAID' });
    expect(revenue.calculateValidMonthlyRevenue).not.toHaveBeenCalled();
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
    expect(tx.commissionRule.findMany).not.toHaveBeenCalled();
  });
  it('includes the historical team and order-only KOL while retaining the original paid snapshot', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    tx.monthlyBonusResult.findMany.mockResolvedValue([historyFixture()]);
    const creator = (id: string) => ({ id, fullName: id, email: `${id}@example.test`, phoneNumber: null });
    db.storeCollaborator.findMany.mockResolvedValue(['kol','zero','other'].map(id => ({ storeId: 'store', collaboratorId: id, collaborator: creator(id) })));
    const order = (id: string, amount: number) => ({ storeId: 'store', attributedCollaboratorId: id, attributedCollaborator: creator(id), customerId: 'buyer', subtotalAmount: new Prisma.Decimal(amount), finalAmount: new Prisma.Decimal(amount), refundedAmount: new Prisma.Decimal(0), refunds: [] });
    db.order.findMany.mockResolvedValue([order('kol', 99999999), order('other', 1000000), order('order-only', 500000)]);
    const result = await service.list(shop, '2026-10');
    const members = result.legacyHistory[0].members;
    expect(members).toHaveLength(4);
    expect(members.find(m => m.collaboratorId === 'kol')).toMatchObject({ validRevenue: '51871862', amount: '2000000', status: 'PAID', isSettled: true });
    expect(members.find(m => m.collaboratorId === 'zero')).toMatchObject({ validRevenue: '0.00', amount: null, status: 'NOT_SETTLED', isSettled: false });
    expect(members.find(m => m.collaboratorId === 'other')).toMatchObject({ validRevenue: '1000000.00', amount: null, validOrdersCount: 1 });
    expect(members.find(m => m.collaboratorId === 'order-only')).toMatchObject({ validRevenue: '500000.00', status: 'NOT_SETTLED' });
    expect(db.storeCollaborator.findMany.mock.calls[0][0].where.AND).toEqual([
      { OR: [{ approvedAt: { lt: new Date('2026-10-31T17:00:00Z') } }, { approvedAt: null, status: 'APPROVED', createdAt: { lt: new Date('2026-10-31T17:00:00Z') } }] },
      { OR: [{ terminatedAt: null }, { terminatedAt: { gte: new Date('2026-09-30T17:00:00Z') } }] },
    ]);
    expect(db.order.findMany).toHaveBeenCalledTimes(1);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('does not fabricate policy history for months before the rule existed', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    tx.commissionRule.findMany.mockResolvedValue([{ id: 'rule', createdAt: new Date('2026-10-01T00:00:00Z') }]);
    const result = await service.list(shop, '2026-01');
    expect(result.legacyHistory).toEqual([]);
  });
  it('shows a historical policy even if no settlement has been recorded', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    const row = historyFixture();
    tx.commissionRule.findMany.mockResolvedValue([{ ...row.ruleSnapshot.rules[0], storeId: 'store', minMonthlyRevenue: new Prisma.Decimal(50000000), achievementBonus: new Prisma.Decimal(2000000), bonusPercentage: new Prisma.Decimal(0), createdAt: new Date('2026-09-30T17:00:00Z') }]);
    const result = await service.list(shop, '2026-10');
    expect(result.legacyHistory[0].settlements).toEqual([]);
    expect(result.legacyHistory[0].rules).toHaveLength(1);
  });
  it('excludes new-workflow ledger snapshots from legacy history', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    tx.monthlyBonusResult.findMany.mockResolvedValue([{ ...historyFixture(), ruleSnapshot: { storeMonthlyRewardPolicyId: 'policy' } }]);
    expect((await service.list(shop, '2026-10')).legacyHistory).toEqual([]);
  });
  it('scopes old history to the KOL identity, including former memberships', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([]);
    tx.monthlyBonusResult.findMany.mockResolvedValue([historyFixture()]);
    await service.list({ id: 'kol', role: UserRole.COLLABORATOR } as any, '2026-10');
    expect(tx.monthlyBonusResult.findMany.mock.calls[0][0].where).toMatchObject({ collaboratorId: 'kol', yearMonth: '2026-10', storeId: { in: ['store'] } });
    expect(db.store.findMany.mock.calls[0][0].where.OR).toContainEqual({ monthlyBonusResults: { some: { collaboratorId: 'kol' } } });
    expect(db.storeCollaborator.findMany.mock.calls[0][0].where.collaboratorId).toBe('kol');
    expect(db.order.findMany.mock.calls[0][0].where.attributedCollaboratorId).toBe('kol');
  });
  it('creates pending policy without credit or tier mutation', async () => {
    await service.create(shop, 'store', {
      yearMonth: rewardMonth(new Date(), 1),
      name: 'Next month',
      targetRevenue: '50000000',
      rewardAmount: '2000000',
    });
    expect(
      tx.storeMonthlyRewardPolicy.create.mock.calls[0][0].data,
    ).not.toHaveProperty('status', 'APPROVED');
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('blocks reward above KPI before writing a policy or sending notifications', async () => {
    await expect(service.create(shop, 'store', { yearMonth: rewardMonth(), name: 'Oversized', targetRevenue: '55000000', rewardAmount: '100000000' })).rejects.toThrow('không được vượt');
    expect(tx.storeMonthlyRewardPolicy.create).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it('allows the KPI boundary and notifies reviewers, not KOL, while policy is pending', async () => {
    await service.create(shop, 'store', { yearMonth: rewardMonth(), name: 'Boundary', targetRevenue: '55000000', rewardAmount: '55000000' });
    const recipients = tx.notification.createMany.mock.calls.flatMap((call: any) => call[0].data);
    expect(recipients.map((n: any) => n.userId)).toEqual(['reviewer']);
    expect(recipients[0].data.actionUrl).toContain('tab=monthly&yearMonth=');
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('announces approved policy only to approved partnerships, once per KOL', async () => {
    tx.storeCollaborator.findMany.mockResolvedValue([{ collaboratorId: 'kol' }, { collaboratorId: 'kol' }, { collaboratorId: 'kol-b' }]);
    await service.reviewPolicy(manager, 'policy', { decision: 'APPROVED' });
    expect(tx.storeCollaborator.findMany).toHaveBeenCalledWith({ where: { storeId: 'store', status: 'APPROVED' }, select: { collaboratorId: true } });
    const notices = tx.notification.createMany.mock.calls[0][0].data;
    expect(notices.map((n: any) => n.userId)).toEqual(['kol', 'kol-b']);
    expect(notices[0].message).toContain('50.000.000');
    expect(notices[0].data.actionUrl).toContain(policy.yearMonth);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('does not announce rejected or already processed policy to KOL', async () => {
    await service.reviewPolicy(manager, 'policy', { decision: 'REJECTED', note: 'Need revision' });
    expect(tx.notification.createMany).not.toHaveBeenCalled();
    tx.storeMonthlyRewardPolicy.updateMany.mockResolvedValue({ count: 0 });
    tx.notification.create.mockClear();
    await expect(service.reviewPolicy(manager, 'policy', { decision: 'APPROVED' })).rejects.toThrow();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
  it('blocks approval of an oversized legacy policy', async () => {
    tx.storeMonthlyRewardPolicy.findUnique.mockResolvedValueOnce({ ...policy, rewardAmount: new Prisma.Decimal(100000000) });
    await expect(service.reviewPolicy(manager, 'policy', { decision: 'APPROVED' })).rejects.toThrow('không được vượt');
    expect(tx.storeMonthlyRewardPolicy.updateMany).not.toHaveBeenCalled();
  });
  it('notifies eligible KOL and reviewers on request without crediting money or duplicate notices', async () => {
    await service.request(shop, 'policy', 'kol');
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'kol', title: 'Đề nghị thưởng tháng đang chờ duyệt' }) });
    expect(tx.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: 'reviewer' })] });
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
    tx.notification.create.mockClear(); tx.notification.createMany.mockClear();
    tx.storeMonthlyRewardGrant.findUnique.mockResolvedValue({ id: 'existing', status: 'PENDING' });
    await expect(service.request(shop, 'policy', 'kol')).rejects.toThrow('đã được gửi');
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it('reports credited money to the rewarded KOL only after approval', async () => {
    await service.reviewGrant(manager, 'grant', { decision: 'APPROVED' });
    expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'kol', title: 'Đã nhận thưởng doanh số tháng', data: expect.objectContaining({ yearMonth: policy.yearMonth }) }) });
  });
  it('rejects another store and a past month', async () => {
    db.store.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.create(shop, 'other', {
        yearMonth: rewardMonth(),
        name: 'Bonus',
        targetRevenue: '1',
        rewardAmount: '1',
      }),
    ).rejects.toThrow();
    await expect(
      service.create(shop, 'store', {
        yearMonth: rewardMonth(new Date(), -1),
        name: 'Bonus',
        targetRevenue: '1',
        rewardAmount: '1',
      }),
    ).rejects.toThrow();
  });
  it('allows directly selected future months beyond next month', async () => {
    await service.create(shop, 'store', { yearMonth: rewardMonth(new Date(), 14), name: 'Future reward', targetRevenue: '50000000', rewardAmount: '2000000' });
    expect(tx.storeMonthlyRewardPolicy.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ yearMonth: rewardMonth(new Date(), 14) }) }));
  });

  it('resubmits a rejected policy in place and retains its complete rejected snapshot in audit', async () => {
    const rejected = { ...policy, status:'REJECTED', reviewNote:'Need evidence', reviewedBy:'reviewer', reviewedAt:new Date('2026-11-14T12:00:00Z'), updatedAt:new Date('2026-11-14T12:00:00Z') };
    tx.storeMonthlyRewardPolicy.findUnique.mockResolvedValueOnce(rejected);
    const result=await service.create(shop,'store',{yearMonth:policy.yearMonth,name:'Revised policy',targetRevenue:'45000000',rewardAmount:'1500000'});
    expect(result).toMatchObject({id:'policy',status:'PENDING',resubmitted:true});
    expect(tx.storeMonthlyRewardPolicy.updateMany).toHaveBeenCalledWith({where:{id:'policy',status:'REJECTED',updatedAt:rejected.updatedAt},data:expect.objectContaining({status:'PENDING',createdBy:shop.id,reviewNote:null,reviewedBy:null,reviewedAt:null})});
    expect(tx.auditLog.create).toHaveBeenCalledWith({data:expect.objectContaining({action:'RESUBMIT_STORE_MONTHLY_REWARD',details:expect.objectContaining({policyId:'policy',previous:expect.objectContaining({reviewNote:'Need evidence',targetRevenue:'50000000.00',rewardAmount:'2000000.00'}),submitted:expect.objectContaining({targetRevenue:'45000000',rewardAmount:'1500000'})})})});
    expect(tx.storeMonthlyRewardPolicy.create).not.toHaveBeenCalled();
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it.each(['PENDING','APPROVED'])('does not overwrite a %s policy', async status => {
    tx.storeMonthlyRewardPolicy.findUnique.mockResolvedValueOnce({...policy,status});
    await expect(service.create(shop,'store',{yearMonth:policy.yearMonth,name:'Revised',targetRevenue:'1',rewardAmount:'1'})).rejects.toThrow();
    expect(tx.storeMonthlyRewardPolicy.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a concurrent resubmission without duplicating its audit event', async () => {
    tx.storeMonthlyRewardPolicy.findUnique.mockResolvedValueOnce({...policy,status:'REJECTED',updatedAt:new Date()});
    tx.storeMonthlyRewardPolicy.updateMany.mockResolvedValueOnce({count:0});
    await expect(service.create(shop,'store',{yearMonth:policy.yearMonth,name:'Revised',targetRevenue:'1',rewardAmount:'1'})).rejects.toThrow();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('does not let an operator resubmit as a shop', async () => {
    await expect(service.create(manager,'store',{yearMonth:policy.yearMonth,name:'Revised',targetRevenue:'1',rewardAmount:'1'})).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('shows archived rejection notes to the shop and operator after the policy is resubmitted', async () => {
    db.storeMonthlyRewardPolicy.findMany=jest.fn().mockResolvedValue([{...policy,status:'PENDING',reviewNote:null,grants:[]}]);
    db.auditLog.findMany.mockResolvedValue([{id:'audit',createdAt:new Date(),details:{policyId:'policy',previous:{name:'Original',targetRevenue:'50000000.00',rewardAmount:'2000000.00',reviewNote:'Need evidence',reviewedAt:'2026-11-14T12:00:00Z'}}}]);
    const result=await service.list(shop,policy.yearMonth);
    expect(result.policies[0].reviewHistory[0]).toMatchObject({reviewNote:'Need evidence',targetRevenue:'50000000.00',rewardAmount:'2000000.00'});
    expect(db.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({action:'RESUBMIT_STORE_MONTHLY_REWARD',OR:[{details:{path:['policyId'],equals:'policy'}}]})}));
  });
  it('queues eligible requests without moving money', async () => {
    await service.request(shop, 'policy', 'kol');
    expect(tx.storeMonthlyRewardGrant.upsert).toHaveBeenCalledTimes(1);
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('requires an approved policy and blocks legacy double payments', async () => {
    db.storeMonthlyRewardPolicy.findUnique.mockResolvedValueOnce({
      ...policy,
      status: 'PENDING',
    });
    await expect(service.request(shop, 'policy', 'kol')).rejects.toThrow();
    tx.monthlyBonusResult.findUnique.mockResolvedValue({ status: 'PAID' });
    await expect(service.request(shop, 'policy', 'kol')).rejects.toThrow();
    expect(tx.storeMonthlyRewardGrant.upsert).not.toHaveBeenCalled();
  });
  it('requires operator review of a policy, with a reason for rejection', async () => {
    await expect(
      service.reviewPolicy(shop, 'policy', { decision: 'APPROVED' }),
    ).rejects.toThrow();
    await expect(
      service.reviewPolicy(manager, 'policy', { decision: 'REJECTED' }),
    ).rejects.toThrow();
    await service.reviewPolicy(manager, 'policy', { decision: 'APPROVED' });
    expect(
      tx.storeMonthlyRewardPolicy.updateMany.mock.calls[0][0].where,
    ).toMatchObject({ status: 'PENDING', createdBy: { not: manager.id } });
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('blocks non-reviewers and rechecks sales after a refund', async () => {
    await expect(
      service.reviewGrant(shop, 'grant', { decision: 'APPROVED' }),
    ).rejects.toThrow();
    revenue.calculateValidMonthlyRevenue.mockResolvedValue({
      validRevenue: '49000000',
    });
    await expect(
      service.reviewGrant(manager, 'grant', { decision: 'APPROVED' }),
    ).rejects.toThrow('KPI');
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('credits once, saving a policy snapshot for existing refund recovery', async () => {
    await service.reviewGrant(manager, 'grant', { decision: 'APPROVED' });
    expect(wallets.creditAvailableBalance).toHaveBeenCalledWith(
      tx,
      'kol',
      policy.rewardAmount,
      { id: 'settlement', type: 'MONTHLY_BONUS' },
      'store',
    );
    const snapshot =
      tx.monthlyBonusResult.upsert.mock.calls[0][0].create.ruleSnapshot;
    expect(snapshot.policyVersion).toBe(3);
    expect(snapshot.rules[0].minMonthlyRevenue).toBe('50000000');
    expect(tx.storeMonthlyRewardGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PAID' }),
      }),
    );
    tx.storeMonthlyRewardGrant.findUnique.mockResolvedValue({
      status: 'PAID',
      policy,
    });
    await expect(
      service.reviewGrant(manager, 'grant', { decision: 'APPROVED' }),
    ).rejects.toThrow();
    expect(wallets.creditAvailableBalance).toHaveBeenCalledTimes(1);
  });
  it('requires a rejection reason and never credits rejected requests', async () => {
    await expect(
      service.reviewGrant(manager, 'grant', { decision: 'REJECTED' }),
    ).rejects.toThrow();
    await service.reviewGrant(manager, 'grant', {
      decision: 'REJECTED',
      note: 'Cần đối soát',
    });
    expect(wallets.creditAvailableBalance).not.toHaveBeenCalled();
  });
  it('limits KOL results to their own store membership and reward', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest
      .fn()
      .mockResolvedValue([{ ...policy, grants: [] }]);
    db.storeCollaborator.findMany = jest
      .fn()
      .mockResolvedValue([
        { collaboratorId: 'kol', collaborator: { fullName: 'Nhi' } },
      ]);
    await service.list(
      { id: 'kol', role: UserRole.COLLABORATOR } as any,
      policy.yearMonth,
    );
    expect(
      db.storeMonthlyRewardPolicy.findMany.mock.calls[0][0].include.grants
        .where,
    ).toEqual({ collaboratorId: 'kol' });
    expect(
      db.storeCollaborator.findMany.mock.calls[0][0].where.collaboratorId,
    ).toBe('kol');
  });
  it('reads orders once for the entire team while preserving refunds and self-purchase exclusions', async () => {
    db.storeMonthlyRewardPolicy.findMany = jest.fn().mockResolvedValue([{ ...policy, targetRevenue: new Prisma.Decimal(50), grants: [] }]);
    const ids = ['kol', 'self', 'risk', 'inactive', ...Array.from({length: 12}, (_, i) => `empty-${i}`)];
    db.storeCollaborator.findMany = jest.fn().mockResolvedValue(ids.map(id => ({ collaboratorId: id, collaborator: { id, fullName: id, email: `${id}@example.test`, role: UserRole.COLLABORATOR, isActive: id !== 'inactive', isDeleted: false } })));
    const order = (id: string, extra = {}) => ({ attributedCollaboratorId: id, customerId: 'buyer', customerEmail: 'buyer@example.test', subtotalAmount: new Prisma.Decimal(100), finalAmount: new Prisma.Decimal(120), refundedAmount: new Prisma.Decimal(0), refunds: [], ...extra });
    db.order.findMany.mockResolvedValue([
      order('kol', { refunds: [{amount: new Prisma.Decimal(20)}, {amount: new Prisma.Decimal(40)}] }),
      order('self', { customerId: 'self' }), order('self', { customerEmail: 'SELF@example.test' }),
      order('risk', {rawPayload: {selfReferralReviewRequired: true}}), order('inactive'),
    ]);
    const result = await service.list(shop, '2026-11');
    const members = result.policies[0].members;
    expect(members.find(m => m.collaboratorId === 'kol')).toMatchObject({ validRevenue: '50.00', validOrdersCount: 1, eligible: true });
    expect(members.find(m => m.collaboratorId === 'self')).toMatchObject({ validRevenue: '0.00', eligible: false });
    expect(members.find(m => m.collaboratorId === 'risk')).toMatchObject({ validRevenue: null, eligible: false });
    expect(members.find(m => m.collaboratorId === 'inactive')).toMatchObject({ validRevenue: null, eligible: false });
    expect(members.find(m => m.collaboratorId === 'empty-0')).toMatchObject({ validRevenue: '0.00', validOrdersCount: 0 });
    expect(db.order.findMany).toHaveBeenCalledTimes(1);
    expect(db.order.findMany.mock.calls[0][0].where).toMatchObject({ storeId: 'store', status: 'COMPLETED', completedAt: { gte: new Date('2026-10-31T17:00:00Z'), lt: new Date('2026-11-30T17:00:00Z') } });
    expect(revenue.calculateValidMonthlyRevenue).not.toHaveBeenCalled();
  });
});

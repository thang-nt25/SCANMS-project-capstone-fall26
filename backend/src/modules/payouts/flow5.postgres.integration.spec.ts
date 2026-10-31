import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { FinancialLedgerService } from '../wallets/financial-ledger.service';
import { WithdrawalPolicyService } from '../wallets/withdrawal-policy.service';
import { PayoutTaxService } from './payout-tax.service';
import { PayoutsService } from './payouts.service';
import { PayoutTransferService } from './payout-transfer.service';
import { AdminPayoutsController } from './admin-payouts.controller';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { CommissionRulesService } from '../commission-rules/commission-rules.service';
import { TiersService } from '../tiers/tiers.service';
import { CommissionsService } from '../commissions/commissions.service';
import { CommissionCalculatorService } from '../commissions/commission-calculator.service';
import { ReturnService } from '../returns/return.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';

const url = process.env.WITHDRAWAL_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    !parsed.pathname.endsWith('_test')
  )
    throw new Error(
      'Flow 5 integration tests require a disposable loopback *_test database',
    );
}
const suite = url ? describe : describe.skip;
jest.setTimeout(30000);

suite('Flow 5 real PostgreSQL transactions', () => {
  let prisma: PrismaService;
  let wallets: WalletsService;
  let payouts: PayoutsService;
  let actorId: string;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    prisma = new PrismaService(
      new ConfigService({ DATABASE_URL: url, DB_POOL_MAX: '8' }),
    );
    await prisma.onModuleInit();
    wallets = new WalletsService(new FinancialLedgerService());
    payouts = new PayoutsService(
      prisma,
      wallets,
      new WithdrawalPolicyService(new ConfigService()),
      new PayoutTaxService(),
    );
    actorId = (
      await prisma.user.create({
        data: {
          email: `${randomUUID()}@flow5.test`,
          fullName: 'Flow 5 accountant',
          passwordHash: 'test-only',
          role: 'SYSTEM_MANAGER',
        },
      })
    ).id;
    // Exercise the migration's append-only rule on this isolated database only.
    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION reject_finance_posting_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Finance postings are append-only'; END; $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'finance_postings_immutable') THEN CREATE TRIGGER finance_postings_immutable BEFORE UPDATE OR DELETE ON finance_postings FOR EACH ROW EXECUTE FUNCTION reject_finance_posting_mutation(); END IF; END $$`,
    );
  });
  afterAll(async () => {
    global.fetch = originalFetch;
    if (prisma) await prisma.onModuleDestroy();
  });

  async function creator(amount = '2500000') {
    return prisma.user.create({
      data: {
        email: `${randomUUID()}@flow5.test`,
        fullName: 'Flow 5 creator',
        passwordHash: 'test-only',
        role: 'COLLABORATOR',
        collaboratorProfile: {
          create: {
            bankName: 'MB',
            bankAccountNumber: '001234',
            bankAccountName: 'FLOW FIVE',
            kycStatus: 'VERIFIED',
          },
        },
        wallet: { create: { availableBalance: amount, pendingBalance: '0' } },
      },
    });
  }

  it('reserves gross exactly once under concurrent withdrawals and rolls back if the posting fails', async () => {
    const user = await creator();
    const results = await Promise.allSettled([
      payouts.createWithdrawal(user.id, { amount: '2072000' }),
      payouts.createWithdrawal(user.id, { amount: '2072000' }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId: user.id },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('428000.00');
    const request = await prisma.payoutRequest.findFirstOrThrow({
      where: { collaboratorId: user.id },
    });
    expect(request.taxAmount.toFixed(2)).toBe('207200.00');
    expect(
      await prisma.financePosting.count({ where: { referenceId: request.id } }),
    ).toBe(1);
    const previous = wallet.availableBalance;
    const broken = new Proxy(prisma, {
      get(target, property) {
        if (property !== '$transaction') return Reflect.get(target, property);
        return (callback: (tx: any) => Promise<any>) =>
          target.$transaction((tx) =>
            callback(
              new Proxy(tx, {
                get(db, key) {
                  if (key === 'financePosting')
                    return {
                      create: async () => {
                        throw new Error('posting failed');
                      },
                    };
                  return Reflect.get(db, key);
                },
              }),
            ),
          );
      },
    });
    await expect(
      new PayoutsService(
        broken,
        wallets,
        new WithdrawalPolicyService(new ConfigService()),
        new PayoutTaxService(),
      ).createWithdrawal(user.id, { amount: '200000' }),
    ).rejects.toThrow();
    expect(
      (
        await prisma.wallet.findUniqueOrThrow({
          where: { collaboratorId: user.id },
        })
      ).availableBalance.equals(previous),
    ).toBe(true);
    expect(
      await prisma.payoutRequest.count({ where: { collaboratorId: user.id } }),
    ).toBe(1);
  });

  it('concurrent rejection refunds gross only once', async () => {
    const user = await creator();
    const created = await payouts.createWithdrawal(user.id, {
      amount: '2072000',
    });
    const merchant = new MerchantPayoutsService(prisma, wallets, {} as any);
    const admin = new AdminPayoutsController(
      prisma,
      merchant,
      {} as any,
      {} as any,
      wallets,
    );
    const results = await Promise.allSettled([
      admin.reject(created.request.id, { id: actorId } as any, {
        reason: 'Invalid request',
      }),
      admin.reject(created.request.id, { id: actorId } as any, {
        reason: 'Duplicate',
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      (
        await prisma.wallet.findUniqueOrThrow({
          where: { collaboratorId: user.id },
        })
      ).availableBalance.toFixed(2),
    ).toBe('2500000.00');
    expect(
      await prisma.financePosting.count({
        where: { referenceId: created.request.id },
      }),
    ).toBe(2);
  });

  it('restores each store allocation when a combined withdrawal is rejected', async () => {
    const user = await creator('0');
    const owner = await prisma.user.create({
      data: {
        email: `${randomUUID()}@flow5.test`,
        fullName: 'Owner',
        passwordHash: 'test',
        role: 'SHOP_MANAGER',
      },
    });
    const storeA = await prisma.store.create({
      data: { ownerId: owner.id, name: 'Source A', slug: randomUUID() },
    });
    const storeB = await prisma.store.create({
      data: { ownerId: owner.id, name: 'Source B', slug: randomUUID() },
    });
    await prisma.$transaction(async (tx) => {
      await wallets.creditAvailableBalance(
        tx,
        user.id,
        new Prisma.Decimal(1500000),
        { id: randomUUID(), type: 'MONTHLY_BONUS' },
        storeA.id,
      );
      await wallets.creditAvailableBalance(
        tx,
        user.id,
        new Prisma.Decimal(1000000),
        { id: randomUUID(), type: 'MONTHLY_BONUS' },
        storeB.id,
      );
    });
    const request = await payouts.createWithdrawal(user.id, {
      amount: '2072000',
    });
    const after = await prisma.storeWallet.aggregate({
      where: { wallet: { collaboratorId: user.id } },
      _sum: { availableBalance: true },
    });
    expect(after._sum.availableBalance?.toFixed(2)).toBe('428000.00');
    const admin = new AdminPayoutsController(
      prisma,
      new MerchantPayoutsService(prisma, wallets, {} as any),
      {} as any,
      {} as any,
      wallets,
    );
    await admin.reject(request.request.id, { id: actorId } as any, {
      reason: 'Reconcile',
    });
    const restored = await prisma.storeWallet.findMany({
      where: { wallet: { collaboratorId: user.id } },
    });
    expect(
      restored
        .find((row) => row.storeId === storeA.id)
        ?.availableBalance.toFixed(2),
    ).toBe('1500000.00');
    expect(
      restored
        .find((row) => row.storeId === storeB.id)
        ?.availableBalance.toFixed(2),
    ).toBe('1000000.00');
  });

  it('concurrent bank approvals pay net once and preserve balanced immutable accounting', async () => {
    const user = await creator();
    const created = await payouts.createWithdrawal(user.id, {
      amount: '2072000',
    });
    const bankRefCode = `FT-${randomUUID()}`;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        payoutId: created.request.id,
        amount: '1864800.00',
        currency: 'VND',
        status: 'SUCCEEDED',
        bankRefCode,
      }),
    });
    global.fetch = fetchMock as typeof fetch;
    const service = new PayoutTransferService(
      prisma,
      new ConfigService({
        PAYOUT_GATEWAY_URL: 'https://gateway.example.test',
        PAYOUT_GATEWAY_TOKEN: 'test',
      }),
    );
    await Promise.allSettled([
      service.transfer(created.request.id, actorId),
      service.transfer(created.request.id, actorId),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const paid = await prisma.payoutRequest.findUniqueOrThrow({
      where: { id: created.request.id },
    });
    expect(paid.status).toBe('APPROVED');
    const entries = await prisma.financePosting.findMany({
      where: { referenceId: paid.id },
    });
    expect(entries).toHaveLength(3);
    expect(
      entries
        .filter((row) => row.debitAccount === 'PAYOUT_RESERVED')
        .reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0))
        .equals(paid.amount),
    ).toBe(true);
    await expect(
      prisma.financePosting.update({
        where: { id: entries[0].id },
        data: { amount: 1 },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.financePosting.delete({ where: { id: entries[0].id } }),
    ).rejects.toThrow();
    await service.transfer(paid.id, actorId);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('settles a closed month once, credits FR-09 once, excludes shipping, and assigns Gold at 52m cumulative revenue', async () => {
    const user = await creator('0');
    const owner = await prisma.user.create({
      data: {
        email: `${randomUUID()}@flow5.test`,
        fullName: 'Owner',
        passwordHash: 'test',
        role: UserRole.SHOP_MANAGER,
      },
    });
    const store = await prisma.store.create({
      data: { ownerId: owner.id, name: 'Flow 5 store', slug: randomUUID() },
    });
    await prisma.storeCollaborator.create({
      data: { storeId: store.id, collaboratorId: user.id, status: 'APPROVED' },
    });
    const historicalRule = await prisma.commissionRule.create({
      data: {
        storeId: store.id,
        name: '50m reward',
        minMonthlyRevenue: '50000000',
        achievementBonus: '2000000',
        bonusPercentage: 0,
        effectiveFrom: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    });
    await prisma.order.create({
      data: {
        storeId: store.id,
        attributedCollaboratorId: user.id,
        externalOrderSn: randomUUID(),
        sourcePlatform: 'INTERNAL',
        status: 'COMPLETED',
        subtotalAmount: '52000000',
        shippingFee: '30000',
        finalAmount: '52030000',
        completedAt: new Date('2026-09-15T00:00:00+07:00'),
      },
    });
    const rules = new CommissionRulesService(prisma, wallets);
    // A later edit must not rewrite September's opening policy.
    await rules.update(store.id, historicalRule.id, { achievementBonus: '1000000' }, owner.id);
    await rules.remove(store.id, historicalRule.id, owner.id);
    const policyAudit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'UPDATE_COMMISSION_RULE', details: { path: ['ruleId'], equals: historicalRule.id } } });
    await expect(prisma.auditLog.update({ where: { id: policyAudit.id }, data: { action: 'TAMPERED' } })).rejects.toThrow();
    await expect(prisma.auditLog.delete({ where: { id: policyAudit.id } })).rejects.toThrow();
    const results = await Promise.all([
      rules.settleMonthlyBonus(store.id, user.id, '2026-09', owner.id),
      rules.settleMonthlyBonus(store.id, user.id, '2026-09', owner.id),
    ]);
    expect(results.filter((item) => !item.isAlreadySettled)).toHaveLength(1);
    const settlement = results[0].settlement;
    expect(Number(settlement.validRevenue)).toBe(52000000);
    expect(Number(settlement.bonusAmount)).toBe(2000000);
    await rules.approveSettlement(store.id, settlement.id, owner.id);
    const credit = await Promise.allSettled([
      rules.payoutSettlement(store.id, settlement.id, owner.id),
      rules.payoutSettlement(store.id, settlement.id, owner.id),
    ]);
    expect(credit.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(
      (
        await prisma.wallet.findUniqueOrThrow({
          where: { collaboratorId: user.id },
        })
      ).availableBalance.toFixed(2),
    ).toBe('2000000.00');
    await prisma.collaboratorTier.createMany({
      data: [
        { name: 'Bronze', minRevenueThreshold: 0, extraBonusPercentage: 0 },
        {
          name: 'Silver',
          minRevenueThreshold: 20000000,
          extraBonusPercentage: 1,
        },
        {
          name: 'Gold',
          minRevenueThreshold: 50000000,
          extraBonusPercentage: 2,
        },
        {
          name: 'Diamond',
          minRevenueThreshold: 100000000,
          extraBonusPercentage: 3,
        },
      ],
    });
    const status = await new TiersService(prisma).getMyTierStatus(user.id);
    expect(status.currentTier.name).toBe('Gold');
    expect(status.currentRevenue).toBe(52000000);
  });

  it('connects real Escrow → FR-09 → reservation → return refund → immediate clawback, before customer confirmation', async () => {
    const kol = await creator('0');
    const customer = await prisma.user.create({
      data: {
        email: `${randomUUID()}@flow5.test`,
        passwordHash: 'test',
        fullName: 'Buyer',
        role: 'CUSTOMER',
      },
    });
    const owner = await prisma.user.create({
      data: {
        email: `${randomUUID()}@flow5.test`,
        passwordHash: 'test',
        fullName: 'Staff',
        role: 'SHOP_MANAGER',
      },
    });
    const store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        name: 'Refund integration',
        slug: randomUUID(),
      },
    });
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        title: 'Product',
        sku: randomUUID(),
        price: '52000000',
      },
    });
    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        attributedCollaboratorId: kol.id,
        externalOrderSn: randomUUID(),
        sourcePlatform: 'INTERNAL',
        status: 'COMPLETED',
        subtotalAmount: '52000000',
        shippingFee: '30000',
        finalAmount: '52030000',
        completedAt: new Date('2026-09-15T00:00:00+07:00'),
        deliveredAt: new Date('2026-09-15T00:00:00+07:00'),
        orderItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: '52000000',
            appliedCommissionRate: 16,
            calculatedCommissionAmount: '8320000',
            commissionSnapshotAt: new Date('2026-09-15'),
          },
        },
      },
    });
    const commissions = new CommissionsService(
      prisma,
      new CommissionCalculatorService(),
      wallets,
    );
    expect(
      await commissions.createPendingCommission(
        order.id,
        new Date('2026-09-15T12:00:00Z'),
      ),
    ).toBe(true);
    const commission = await prisma.commission.findFirstOrThrow({
      where: { orderId: order.id },
    });
    expect(commission.commissionAmount.toFixed(2)).toBe('8320000.00');
    const assigned = await prisma.user.create({ data: { email: `${randomUUID()}@flow5.test`, fullName: 'Assigned manager', passwordHash: 'test', role: 'SHOP_MANAGER', storeId: store.id } });
    expect((await commissions.getOrderEscrowDetails(order.id, { id: assigned.id, role: 'SHOP_MANAGER' }))?.commissionId).toBe(commission.id);
    const outsider = await prisma.user.create({ data: { email: `${randomUUID()}@flow5.test`, fullName: 'Other manager', passwordHash: 'test', role: 'SHOP_MANAGER' } });
    expect(await commissions.getOrderEscrowDetails(order.id, { id: outsider.id, role: 'SHOP_MANAGER' })).toBeNull();
    await prisma.order.update({ where: { id: order.id }, data: { rawPayload: { selfReferralReviewRequired: true, selfReferralRiskSignals: ['SHARED_DELIVERY_ADDRESS'] } } });
    expect(await commissions.approveMatureCommission(commission.id, new Date('2026-10-01T00:00:00Z'))).toBe(false);
    await expect(commissions.reviewReferral(order.id, { id: owner.id, role: 'SHOP_MANAGER' }, 'CLEARED', 'Hai người độc lập cùng địa chỉ')).rejects.toThrow();
    await commissions.reviewReferral(order.id, { id: actorId, role: 'SYSTEM_MANAGER' }, 'CLEARED', 'Đối soát người mua và KOC là hai cá nhân độc lập');
    expect(
      await commissions.approveMatureCommission(
        commission.id,
        new Date('2026-10-01T00:00:00Z'),
      ),
    ).toBe(true);
    await prisma.commissionRule.create({
      data: {
        storeId: store.id,
        name: '50m',
        minMonthlyRevenue: '50000000',
        achievementBonus: '2000000',
        bonusPercentage: 0,
        effectiveFrom: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    });
    const rules = new CommissionRulesService(prisma, wallets);
    const settlement = await rules.settleMonthlyBonus(
      store.id,
      kol.id,
      '2026-09',
      owner.id,
    );
    await rules.approveSettlement(store.id, settlement.settlement.id, actorId);
    await rules.payoutSettlement(store.id, settlement.settlement.id, actorId);
    const reserved = await payouts.createWithdrawal(kol.id, {
      amount: '2072000',
    });
    expect(reserved.request.taxAmount).toBe('207200.00');
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'RETURN_REQUESTED' },
    });
    const claim = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        reason: 'DAMAGED',
        status: 'INSPECTING',
        originalOrderStatus: 'COMPLETED',
        deadlineAt: new Date('2026-11-01'),
        unboxingVideoUrl: 'https://example.test/video',
      },
    });
    const returns = new ReturnService(
      prisma,
      {} as CloudinaryService,
      undefined,
      wallets,
      rules,
    );
    await returns.inspect(owner.id, UserRole.SHOP_MANAGER, claim.id, {
      resolution: 'REFUND',
      notes: 'Sản phẩm lỗi đã được xác minh',
    });
    const after = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId: kol.id },
    });
    expect(after.availableBalance.toFixed(2)).toBe('-2072000.00');
    expect(
      (
        await prisma.wallet.findUniqueOrThrow({
          where: { collaboratorId: customer.id },
        })
      ).shoppingBalance.toFixed(2),
    ).toBe('52030000.00');
    expect(
      (
        await prisma.returnRequest.findUniqueOrThrow({
          where: { id: claim.id },
        })
      ).status,
    ).toBe('AWAITING_CUSTOMER_CONFIRMATION');
    expect(
      (
        await prisma.commission.findUniqueOrThrow({
          where: { id: commission.id },
        })
      ).status,
    ).toBe('REVERSED');
    const gateway = new PayoutTransferService(
      prisma,
      new ConfigService({
        PAYOUT_GATEWAY_URL: 'https://bank.example.test',
        PAYOUT_GATEWAY_TOKEN: 'test',
      }),
    );
    await expect(
      gateway.transfer(reserved.request.id, actorId),
    ).rejects.toThrow('thu hồi');
    expect(
      await prisma.bonusAdjustment.count({
        where: {
          originalSettlementId: settlement.settlement.id,
          status: 'APPLIED',
        },
      }),
    ).toBe(1);
    // Retrying the same returned-order accounting hook does not refund twice.
    await prisma.$transaction((tx) =>
      rules.handleRefundAdjustment(
        store.id,
        order.id,
        '52030000',
        'retry',
        actorId,
        undefined,
        tx,
        `return:${claim.id}`,
      ),
    );
    expect(
      await prisma.orderRefund.count({ where: { orderId: order.id } }),
    ).toBe(1);
    const earnings = await prisma.financePosting.findMany({
      where: {
        referenceType: {
          in: ['COMMISSION', 'ORDER_REFUND', 'MONTHLY_BONUS_ADJUSTMENT'],
        },
      },
    });
    expect(
      earnings.some((row) => row.creditAccount === 'AFFILIATE_ESCROW'),
    ).toBe(true);
    expect(
      earnings.some(
        (row) =>
          row.debitAccount === 'PARTNER_EARNINGS_PAYABLE' &&
          row.creditAccount === 'AFFILIATE_MARKETING_EXPENSE',
      ),
    ).toBe(true);
  });

  it('reverses held earnings once when operations confirms a shared-identity order is self-referral', async () => {
    const kol = await creator('0');
    const owner = await prisma.user.create({ data: { email: `${randomUUID()}@flow5.test`, fullName: 'Owner', passwordHash: 'test', role: 'SHOP_MANAGER' } });
    const store = await prisma.store.create({ data: { ownerId: owner.id, name: 'Risk review', slug: randomUUID() } });
    const order = await prisma.order.create({ data: { storeId: store.id, attributedCollaboratorId: kol.id, externalOrderSn: randomUUID(), sourcePlatform: 'INTERNAL', status: 'DELIVERED', subtotalAmount: '450000', finalAmount: '450000', rawPayload: { selfReferralReviewRequired: true } } });
    const commission = await prisma.commission.create({ data: { orderId: order.id, collaboratorId: kol.id, commissionAmount: '72000', status: 'PENDING', eligibleAt: new Date('2026-09-01'), availableAt: new Date('2026-09-08'), storeWalletTracked: true } });
    await prisma.$transaction(tx => wallets.creditPendingBalance(tx, kol.id, new Prisma.Decimal(72000), { id: commission.id, type: 'COMMISSION' }, store.id));
    const service = new CommissionsService(prisma, new CommissionCalculatorService(), wallets);
    await service.reviewReferral(order.id, { id: actorId, role: 'SYSTEM_MANAGER' }, 'SELF_REFERRAL', 'Chứng cứ xác nhận người mua và KOC cùng một người');
    await expect(service.reviewReferral(order.id, { id: actorId, role: 'SYSTEM_MANAGER' }, 'SELF_REFERRAL', 'Lặp lại cùng kết luận thẩm định')).rejects.toThrow();
    expect((await prisma.wallet.findUniqueOrThrow({ where: { collaboratorId: kol.id } })).pendingBalance.toFixed(2)).toBe('0.00');
    const reversed = await prisma.commission.findUniqueOrThrow({ where: { id: commission.id } });
    expect(reversed.status).toBe('REVERSED'); expect(reversed.commissionAmount.toFixed(2)).toBe('0.00');
  });

  it('keeps top-ups outside payout earnings even for a fully verified KOC', async () => {
    const kol = await creator('0');
    await prisma.$transaction((tx) =>
      wallets.creditAvailableBalance(tx, kol.id, new Prisma.Decimal(3000000), {
        id: randomUUID(),
        type: 'TOPUP_PAYOS',
      }),
    );
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { collaboratorId: kol.id },
    });
    expect(wallet.availableBalance.toFixed(2)).toBe('0.00');
    expect(wallet.shoppingBalance.toFixed(2)).toBe('3000000.00');
    await expect(
      payouts.createWithdrawal(kol.id, { amount: '2000000' }),
    ).rejects.toThrow('không đủ');
  });
});

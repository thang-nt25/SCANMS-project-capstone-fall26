import { Prisma } from '@prisma/client';
import { StoreOwnerGuard } from '../commission-rules/guards/store-owner.guard';
import { precedenceCommissionRate } from '../commissions/commission-policy';
import { exclusiveDealBonus } from '../orders/exclusive-deal-bonus';
import { FinanceReportService } from './finance-report.service';
import { assertPayoutBeneficiary } from './payout-beneficiary';
import { isSelfReferral } from '../commissions/self-referral';

describe('Audited Flow 5 regressions', () => {
  it('reports actual COGS and sample costs, and withholds profit when any source is missing', async () => {
    const costs = [ { subjectType: 'ORDER', subjectId: 'order', amount: new Prisma.Decimal(60000) }, { subjectType: 'SAMPLE', subjectId: 'sample', amount: new Prisma.Decimal(10000) } ];
    const prisma: any = {
      store: { findFirst: async () => ({ id: 'store', ownerId: 'owner', name: 'Store' }) },
      order: { findMany: async () => [{ id: 'order', externalOrderSn: 'ORDER', subtotalAmount: new Prisma.Decimal(100000), finalAmount: new Prisma.Decimal(120000), refundedAmount: new Prisma.Decimal(30000) }] },
      commission: { aggregate: async () => ({ _sum: { commissionAmount: new Prisma.Decimal(7500) } }) },
      monthlyBonusResult: { aggregate: async () => ({ _sum: { bonusAmount: new Prisma.Decimal(1000) } }) },
      bonusAdjustment: { aggregate: async () => ({ _sum: { adjustmentAmount: new Prisma.Decimal(-500) } }) },
      sampleShippingCharge: { aggregate: async () => ({ _sum: { amount: new Prisma.Decimal(2000) } }) },
      sampleProductRequest: { findMany: async () => [{ id: 'sample' }] },
      financeCostEntry: { findMany: async () => costs },
    };
    const report = new FinanceReportService(prisma);
    const complete = await report.storePnl('store', 'admin', 'SYSTEM_ADMIN');
    expect(complete.netRevenue).toBe('75000.00');
    expect(complete.cogs).toBe('45000.00');
    expect(complete.monthlyBonuses).toBe('500.00');
    expect(complete.knownMarketingExpense).toBe('20000.00');
    expect(complete.contributionProfit).toBe('10000.00');
    costs.pop();
    const incomplete = await report.storePnl('store', 'admin', 'SYSTEM_ADMIN');
    expect(incomplete.contributionProfit).toBeNull();
    expect(incomplete.missingCostSources).toContain('SAMPLE_PRODUCT_COST');
  });
  it('excludes exact self purchases consistently, including normalized VN phone and persisted flags', () => {
    const creator = {
      id: 'creator',
      email: 'Koc@Example.test',
      phoneNumber: '+84 912 345 678',
    };
    expect(isSelfReferral({ customerId: 'creator' }, creator)).toBe(true);
    expect(isSelfReferral({ customerEmail: 'koc@example.test' }, creator)).toBe(
      true,
    );
    expect(isSelfReferral({ customerPhone: '0912345678' }, creator)).toBe(true);
    expect(isSelfReferral({ rawPayload: { selfReferralDetected: true } })).toBe(
      true,
    );
    expect(isSelfReferral({ customerPhone: '0988888888' }, creator)).toBe(
      false,
    );
  });
  it.each(['?audit=/preview', '/preview?x=y', '?next=/preview', ''])(
    'rejects writes by CUSTOMER with URL %s',
    async (suffix) => {
      const guard = new StoreOwnerGuard(
        {
          store: { findUnique: async () => ({ id: 's', ownerId: 'owner' }) },
        } as any,
        {} as any,
      );
      const request = {
        user: { id: 'customer', role: 'CUSTOMER' },
        method: 'POST',
        url: `/stores/s/commission-rules${suffix}`,
        params: { storeId: 's' },
      };
      await expect(
        guard.canActivate({
          getHandler: () => function create() {},
          switchToHttp: () => ({ getRequest: () => request }),
        } as any),
      ).rejects.toThrow('SHOP_MANAGER');
    },
  );
  it('keeps the actual 16% entitlement from the order helper, ahead of tier and campaign', () => {
    const deal = {
      productId: 'p',
      collaboratorId: 'c',
      storeId: 's',
      approvedCommissionRate: 16,
    };
    const bonus = exclusiveDealBonus(deal, 'p', 'c', 's');
    expect(precedenceCommissionRate(0, 10 + bonus, 12, 0)).toBe(16);
    expect(precedenceCommissionRate(3, 10 + bonus, 12, 3)).toBe(19);
    expect(precedenceCommissionRate(3, 25, 12, 3)).toBe(25);
    expect(precedenceCommissionRate(3, 11, 12, 0)).toBe(13);
  });
  it('does not pay the beneficiary captured before an account edit', async () => {
    const tx: any = {
      user: {
        findUnique: async () => ({
          isActive: true,
          role: 'COLLABORATOR',
          collaboratorProfile: {
            kycStatus: 'VERIFIED',
            bankName: 'MB',
            bankAccountNumber: 'new',
            bankAccountName: 'CREATOR',
          },
          wallet: { availableBalance: new Prisma.Decimal(0) },
        }),
      },
    };
    await expect(
      assertPayoutBeneficiary(tx, {
        collaboratorId: 'c',
        bankName: 'MB',
        bankAccountNumber: 'old',
        bankAccountName: 'CREATOR',
      }),
    ).rejects.toThrow('không khớp');
  });
  it('blocks reserved payouts when a refund leaves clawback debt', async () => {
    const tx: any = {
      user: {
        findUnique: async () => ({
          isActive: true,
          role: 'COLLABORATOR',
          collaboratorProfile: {
            kycStatus: 'VERIFIED',
            bankName: 'MB',
            bankAccountNumber: '001',
            bankAccountName: 'CREATOR',
          },
          wallet: { availableBalance: new Prisma.Decimal(-1) },
        }),
      },
    };
    await expect(
      assertPayoutBeneficiary(tx, {
        collaboratorId: 'c',
        bankName: 'MB',
        bankAccountNumber: '001',
        bankAccountName: 'CREATOR',
      }),
    ).rejects.toThrow('thu hồi');
  });
  it.each(['2026-02', '2026-09', '2026-12'])(
    'uses real Vietnam month boundaries for tax period %s',
    async (month) => {
      const findMany = jest.fn().mockResolvedValue([]);
      await new FinanceReportService({
        payoutRequest: { findMany },
      } as any).monthlyTax(month);
      const period = findMany.mock.calls[0][0].where.processedAt;
      expect(period.gte.toISOString()).toBe(
        new Date(`${month}-01T00:00:00+07:00`).toISOString(),
      );
      const next = new Date(`${month}-01T07:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      expect(period.lt.toISOString().slice(0, 10)).toBe(
        new Date(next.getTime() - 14 * 3600000).toISOString().slice(0, 10),
      );
    },
  );
});

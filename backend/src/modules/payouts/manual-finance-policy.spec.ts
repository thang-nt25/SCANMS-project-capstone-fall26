import 'reflect-metadata';
import { FinanceReportController } from './finance-report.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { PayoutsModule } from './payouts.module';
import { actualPayoutWhere, isTestPayout } from './payout-environment';

describe('manual-only payout operations', () => {
  it('keeps test history distinct from actual manual payments', () => {
    expect(isTestPayout({ transferProvider: 'BIDV_SANDBOX' })).toBe(true);
    expect(isTestPayout({ bankRefCode: 'SBX-old' })).toBe(true);
    expect(isTestPayout({ transferProvider: 'MANUAL', bankRefCode: 'BANK-123' })).toBe(false);
    expect(isTestPayout({ transferProvider: null, bankRefCode: 'BANK-123' })).toBe(false);
  });
  it('unregisters bank API routes and the automatic bank reconciliation provider', () => {
    const providers: any[] = Reflect.getMetadata('providers', PayoutsModule);
    expect(providers.map(provider => provider.name)).not.toContain('PayoutTransferService');
    expect(providers.map(provider => provider.name)).not.toContain('BidvSandboxService');
    const controllers: any[] = Reflect.getMetadata('controllers', PayoutsModule);
    expect(controllers.map(controller => controller.name)).not.toContain('BidvSandboxController');
    for (const name of ['gateway', 'transfer', 'reconcile']) expect(FinanceReportController.prototype).not.toHaveProperty(name);
  });
  it('uses the actual-payment scope for every payout dashboard total', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _count: { id: 0 }, _sum: {} });
    const count = jest.fn().mockResolvedValue(0);
    const controller = new AdminPayoutsController({ payoutRequest: { aggregate, count } } as any, {} as any, {} as any, {} as any, {} as any);
    await controller.getStats();
    for (const [query] of aggregate.mock.calls) expect(query.where.AND).toEqual(actualPayoutWhere.AND);
    for (const [query] of count.mock.calls) expect(query.where.AND).toEqual(actualPayoutWhere.AND);
  });
  it.each([{transferProvider:'BIDV_SANDBOX'}, {transferProvider:null, bankRefCode:'SBX-legacy'}])('rejects real tax certificates for a historical test payout %j', async row => {
    const create = jest.fn();
    const tx = { payoutRequest: { findFirst: jest.fn().mockResolvedValue(row) }, payoutTaxCertificate: { create } };
    const controller = new FinanceReportController({} as any, { $transaction: (work: any) => work(tx) } as any);
    await expect(controller.attachCertificate('payout', { id:'operator' } as any, { buffer: Buffer.from('%PDF-1.7\n') } as any, { issuer:'Accounting', certificateNumber:'CERT-1', issuedAt:'2026-11-13' })).rejects.toThrow('thử nghiệm');
    expect(create).not.toHaveBeenCalled();
  });
});

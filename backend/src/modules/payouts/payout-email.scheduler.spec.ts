import { PayoutEmailScheduler } from './payout-email.scheduler';

describe('payout statement delivery evidence', () => {
  const originalEnvironment = { ...process.env };
  afterEach(() => { process.env = { ...originalEnvironment }; });
  function setup(accepted: boolean | Error) {
    process.env.DISABLE_SCHEDULED_JOBS = 'false';
    process.env.SMTP_USER = 'fixture'; process.env.SMTP_PASS = 'fixture';
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'notification' }]),
      notification: { findUniqueOrThrow: jest.fn().mockResolvedValue({ userId: 'creator', data: { payoutId: 'payout' } }), update: jest.fn() },
      payoutRequest: { findFirst: jest.fn().mockResolvedValue({ id: 'payout', bankRefCode: 'TEST-RECEIPT', collaborator: { email: 'fixture@example.test' }, amount: { toFixed: () => '2064800.00' }, taxAmount: { toFixed: () => '206480.00' }, netAmount: { toFixed: () => '1858320.00' } }) },
      auditLog: { create: jest.fn() },
    };
    const database: any = { $queryRaw: jest.fn().mockResolvedValue([{ id: 'notification' }]), $transaction: (callback: any) => callback(tx) };
    const mail: any = { sendPayoutStatement: accepted instanceof Error ? jest.fn().mockRejectedValue(accepted) : jest.fn().mockResolvedValue(accepted) };
    return { service: new PayoutEmailScheduler(database, mail), tx, database, mail };
  }
  it('marks sent only after the provider accepts the message', async () => {
    const { service, tx, mail } = setup(true); await service.deliver();
    expect(mail.sendPayoutStatement).toHaveBeenCalledWith('fixture@example.test', expect.objectContaining({ gross: '2064800.00', net: '1858320.00' }));
    expect(tx.notification.update.mock.calls[0][0].data.data.emailSentAt).toBeDefined();
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'PAYOUT_EMAIL_SENT' }) }));
  });
  it.each([false, new Error('SMTP refused')])('does not claim delivery after rejection %s', async accepted => {
    const { service, tx } = setup(accepted); await service.deliver();
    expect(tx.notification.update.mock.calls[0][0].data.data.emailSentAt).toBeUndefined();
    expect(tx.notification.update.mock.calls[0][0].data.data.emailAttemptAt).toBeDefined();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('does not send an already delivered outbox item again', async () => {
    const { service, tx, mail } = setup(true);
    tx.notification.findUniqueOrThrow.mockResolvedValue({ userId: 'creator', data: { payoutId: 'payout', emailSentAt: '2026-11-01T00:00:00Z' } });
    await service.deliver(); expect(mail.sendPayoutStatement).not.toHaveBeenCalled();
  });
  it('does not send without a paid payout with bank reference', async () => {
    const { service, tx, mail } = setup(true); tx.payoutRequest.findFirst.mockResolvedValue(null);
    await service.deliver(); expect(mail.sendPayoutStatement).not.toHaveBeenCalled();
  });
});

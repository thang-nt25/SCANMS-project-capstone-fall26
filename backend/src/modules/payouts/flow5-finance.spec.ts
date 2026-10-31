import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PayoutTransferService } from './payout-transfer.service';
import { FinanceReportController } from './finance-report.controller';
import { FinanceReportService } from './finance-report.service';
import { postFinance, postPayoutCompletion } from './finance-posting';
import { MonthlyBonusScheduler } from '../commission-rules/monthly-bonus.scheduler';
import { StoreOwnerGuard } from '../commission-rules/guards/store-owner.guard';

describe('Flow 5 bank settlement invariants', () => {
  const payoutId = '28b2b124-12d2-47f8-881f-c3107ee71084';
  let state: any;
  let tx: any;
  let service: PayoutTransferService;
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  beforeEach(() => {
    state = {
      id: payoutId,
      collaboratorId: 'creator',
      amount: new Prisma.Decimal(2072000),
      taxAmount: new Prisma.Decimal(207200),
      netAmount: new Prisma.Decimal(1864800),
      status: 'PENDING',
      batchId: null,
      bankName: 'MB',
      bankAccountNumber: '001234',
      bankAccountName: 'TEST CREATOR',
      collaborator: {
        isActive: true,
        isDeleted: false,
        collaboratorProfile: { kycStatus: 'VERIFIED' },
      },
    };
    tx = {
      user: {
        findUnique: jest.fn(async () => ({
          ...state.collaborator,
          role: 'COLLABORATOR',
          collaboratorProfile: {
            ...state.collaborator.collaboratorProfile,
            bankName: state.bankName,
            bankAccountNumber: state.bankAccountNumber,
            bankAccountName: state.bankAccountName,
          },
        })),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      payoutRequest: {
        findUnique: jest.fn(async () => ({ ...state })),
        findUniqueOrThrow: jest.fn(async () => ({ ...state })),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(async ({ data }) => Object.assign(state, data)),
        updateMany: jest.fn(async ({ where, data }) => {
          if (state.status !== where.status) return { count: 0 };
          Object.assign(state, data);
          return { count: 1 };
        }),
      },
      financialLedger: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal(-2072000) },
        }),
      },
      financePosting: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    let queue = Promise.resolve();
    tx.$transaction = jest.fn((cb: (db: any) => Promise<any>) => {
      const call = queue.then(() => cb(tx));
      queue = call.then(
        () => undefined,
        () => undefined,
      );
      return call;
    });
    service = new PayoutTransferService(
      tx,
      new ConfigService({
        PAYOUT_GATEWAY_URL: 'https://bank.example.test',
        PAYOUT_GATEWAY_TOKEN: 'test-token',
      }),
    );
    global.fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        payoutId,
        status: 'SUCCEEDED',
        amount: '1864800.00',
        currency: 'VND',
        bankRefCode: 'FT-REAL-1',
      }),
    });
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('transfers NET once and posts separate bank and tax legs without another wallet debit', async () => {
    await service.transfer(payoutId, 'accountant');
    expect(state.status).toBe('APPROVED');
    const input = fetchMock.mock.calls[0][1];
    expect(input.headers['Idempotency-Key']).toBe(payoutId);
    expect(JSON.parse(input.body)).toMatchObject({
      amount: '1864800.00',
      accountNumber: '001234',
    });
    expect(
      tx.financePosting.create.mock.calls.map(([arg]) => [
        arg.data.creditAccount,
        arg.data.amount.toFixed(2),
      ]),
    ).toEqual([
      ['CORPORATE_BANK', '1864800.00'],
      ['PIT_TAX_PAYABLE', '207200.00'],
    ]);
    await service.transfer(payoutId, 'accountant');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });

  it('allows only one of two simultaneous approval attempts to send a bank instruction', async () => {
    const result = await Promise.allSettled([
      service.transfer(payoutId, 'a'),
      service.transfer(payoutId, 'b'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.some((item) => item.status === 'fulfilled')).toBe(true);
    expect(tx.financePosting.create).toHaveBeenCalledTimes(2);
  });

  it('keeps PROCESSING on timeout and reconciles through GET instead of sending again', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.transfer(payoutId, 'accountant')).rejects.toThrow(
      'đối soát',
    );
    expect(state.status).toBe('PROCESSING');
    await expect(service.transfer(payoutId, 'accountant')).rejects.toThrow(
      'Trạng thái',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await service.transfer(payoutId, 'accountant', true);
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
    expect(state.status).toBe('APPROVED');
  });

  it('serializes concurrent GET reconciliation so a stale failure cannot overwrite success', async () => {
    state.status = 'PROCESSING';
    let respond!: (value: any) => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    fetchMock.mockImplementationOnce(() => {
      started();
      return new Promise((resolve) => {
        respond = resolve;
      });
    });
    const first = service.transfer(payoutId, 'accountant', true);
    await ready;
    await expect(
      service.transfer(payoutId, 'other-accountant', true),
    ).rejects.toThrow('vui lòng chờ');
    respond({
      ok: true,
      json: async () => ({
        payoutId,
        status: 'SUCCEEDED',
        amount: '1864800.00',
        currency: 'VND',
        bankRefCode: 'REAL-RECONCILED',
      }),
    });
    await first;
    expect(state.status).toBe('APPROVED');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { payoutId: 'another', amount: '1864800.00', currency: 'VND' },
    { payoutId, amount: '2072000.00', currency: 'VND' },
    { payoutId, amount: '1864800.00', currency: 'USD' },
  ])('never completes a mismatched bank receipt %j', async (receipt) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...receipt,
        status: 'SUCCEEDED',
        bankRefCode: 'FT-OTHER',
      }),
    });
    await expect(service.transfer(payoutId, 'accountant')).rejects.toThrow(
      'Chưa xác định',
    );
    expect(state.status).toBe('PROCESSING');
    expect(tx.financePosting.create).not.toHaveBeenCalled();
  });

  it('returns to PENDING only after an explicit matched FAILED result', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        payoutId,
        amount: '1864800.00',
        currency: 'VND',
        status: 'FAILED',
      }),
    });
    await expect(service.transfer(payoutId, 'accountant')).rejects.toThrow(
      'thất bại',
    );
    expect(state.status).toBe('PENDING');
    expect(tx.financePosting.create).not.toHaveBeenCalled();
  });

  it('does not submit unfunded, unverified, or exported requests', async () => {
    tx.financialLedger.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
    });
    await expect(service.transfer(payoutId, 'a')).rejects.toThrow('giữ tiền');
    state.collaborator.collaboratorProfile.kycStatus = 'UNVERIFIED';
    await expect(service.transfer(payoutId, 'a')).rejects.toThrow(
      'đủ điều kiện',
    );
    state.collaborator.collaboratorProfile.kycStatus = 'VERIFIED';
    state.batchId = 'batch';
    await expect(service.transfer(payoutId, 'a')).rejects.toThrow('lô');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fake success when no gateway is configured', async () => {
    const disabled = new PayoutTransferService(tx, new ConfigService({}));
    await expect(disabled.transfer(payoutId, 'a')).rejects.toThrow(
      'Chưa cấu hình',
    );
    expect(state.status).toBe('PENDING');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Flow 5 accounting and access', () => {
  it('records a balanced pair for gross = tax + net and skips zero tax', async () => {
    const tx: any = { financePosting: { create: jest.fn() } };
    await postPayoutCompletion(tx, {
      id: 'id',
      netAmount: new Prisma.Decimal(200000),
      taxAmount: new Prisma.Decimal(0),
    });
    expect(tx.financePosting.create).toHaveBeenCalledTimes(1);
    await expect(
      postFinance(tx, 'id', 'bad', 'A', 'A', new Prisma.Decimal(1)),
    ).rejects.toThrow();
    await expect(
      postFinance(tx, 'id', 'bad', 'A', 'B', new Prisma.Decimal(-1)),
    ).rejects.toThrow();
  });
  it('restricts executive reports to ADMIN and settlement to operations roles', () => {
    expect(
      Reflect.getMetadata('roles', FinanceReportController.prototype.executive),
    ).toEqual(['SYSTEM_ADMIN']);
    expect(
      Reflect.getMetadata('roles', FinanceReportController.prototype.transfer),
    ).toEqual(['SYSTEM_ADMIN', 'SYSTEM_MANAGER']);
    expect(
      Reflect.getMetadata('roles', FinanceReportController.prototype.receipt),
    ).toEqual(['COLLABORATOR']);
  });
  it('never exposes another creator receipt', async () => {
    const prisma: any = {
      payoutRequest: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      new FinanceReportService(prisma).receipt('owner', 'id'),
    ).rejects.toThrow('của bạn');
    expect(prisma.payoutRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'id', collaboratorId: 'owner', status: 'APPROVED' },
      }),
    );
  });
  it('accepts assigned shop staff but rejects another shop and legacy demo IDs', async () => {
    const db: any = {
      store: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'store',
          ownerId: 'owner',
          isDeleted: false,
        }),
      },
    };
    const guard = new StoreOwnerGuard(db, {} as any);
    const request: any = {
      user: { id: 'staff', role: 'SHOP_MANAGER', storeId: 'store' },
      params: { storeId: 'store' },
      method: 'POST',
    };
    const context: any = {
      getHandler: () => function createRule() {},
      switchToHttp: () => ({ getRequest: () => request }),
    };
    await expect(guard.canActivate(context)).resolves.toBe(true);
    request.user.storeId = 'other';
    await expect(guard.canActivate(context)).rejects.toThrow();
    request.user.id = '6e9eb89c-f544-4f87-b724-1fe7aace2edc';
    await expect(guard.canActivate(context)).rejects.toThrow();
  });
  it('settles the last CLOSED Vietnam month and resumes approved unpaid bonuses', async () => {
    const old = process.env.DISABLE_SCHEDULED_JOBS;
    delete process.env.DISABLE_SCHEDULED_JOBS;
    try {
      const prisma: any = {
        order: {
          aggregate: jest
            .fn()
            .mockResolvedValue({
              _min: { completedAt: new Date('2026-09-01T00:00:00Z') },
            }),
        },
        store: { findMany: jest.fn().mockResolvedValue([{ id: 'store' }]) },
        monthlyBonusResult: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'pending', status: 'PENDING', yearMonth: '2026-09' },
            { id: 'approved', status: 'APPROVED', yearMonth: '2026-09' },
          ]),
        },
      };
      const rules: any = {
        settleAllEligible: jest.fn(),
        approveSettlement: jest.fn(),
        payoutSettlement: jest.fn(),
      };
      await new MonthlyBonusScheduler(prisma, rules).settleClosedMonth(
        new Date('2026-10-01T00:10:00+07:00'),
      );
      expect(rules.settleAllEligible).toHaveBeenCalledWith('store', '2026-09');
      expect(rules.approveSettlement).toHaveBeenCalledTimes(1);
      expect(rules.payoutSettlement).toHaveBeenCalledTimes(2);
    } finally {
      if (old === undefined) delete process.env.DISABLE_SCHEDULED_JOBS;
      else process.env.DISABLE_SCHEDULED_JOBS = old;
    }
  });
});

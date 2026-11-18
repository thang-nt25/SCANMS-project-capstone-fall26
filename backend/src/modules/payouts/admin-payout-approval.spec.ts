import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AdminPayoutsController } from './admin-payouts.controller';
import { assertPayoutBeneficiary } from './payout-beneficiary';
import { postPayoutCompletion } from './finance-posting';

jest.mock('./payout-beneficiary', () => ({ assertPayoutBeneficiary: jest.fn() }));
jest.mock('./payout-funding', () => ({ assertPayoutFunding: jest.fn() }));
jest.mock('./finance-posting', () => ({ postPayoutCompletion: jest.fn() }));
jest.mock('./payout-monthly-tax', () => ({ lockPayoutTaxForRequest: jest.fn(), assertPayoutNetSnapshot: jest.fn() }));

describe('Admin manual approval receipt failures', () => {
  beforeEach(() => jest.resetAllMocks());
  const setup = () => {
    const row = { id: 'payout', collaboratorId: 'kol', status: 'PENDING', transferProvider: null, bankRefCode: null, amount: new Prisma.Decimal(200000), taxAmount: new Prisma.Decimal(10000), netAmount: new Prisma.Decimal(190000) };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      payoutRequest: { findUnique: jest.fn().mockResolvedValue(row), findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({ ...row, status: 'APPROVED' }) },
      auditLog: { create: jest.fn() }, notification: { create: jest.fn() },
    };
    const prisma = { payoutRequest: { findUnique: jest.fn().mockResolvedValue(row), findFirst: jest.fn().mockResolvedValue(null) }, $transaction: jest.fn(async work => work(tx)) };
    const bills = { validateBill: jest.fn().mockReturnValue('a'.repeat(64)), uploadBill: jest.fn().mockResolvedValue({ publicId: 'new-proof', secureUrl: 'https://example.invalid/bill.png', format: 'png', sha256: 'a'.repeat(64) }), removeUnusedBill: jest.fn().mockResolvedValue(undefined) };
    const controller = new AdminPayoutsController(prisma as never, { serializePayout: x => x } as never, {} as never, bills as never, {} as never);
    const approve = (role = UserRole.SYSTEM_MANAGER) => controller.approve(row.id, { id: 'operator', role } as never, { bankRefCode: ' GD-20261114-0002 ', expectedNetAmount: '190000.00' }, {} as never);
    return { prisma, tx, bills, approve };
  };
  it.each([UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN])('allows a valid receipt for %s without another wallet debit', async role => {
    const { approve, tx, bills } = setup();
    await expect(approve(role)).resolves.toMatchObject({ status: 'APPROVED' });
    expect(tx.payoutRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ transferProvider: 'MANUAL', bankRefCode: 'GD-20261114-0002' }) }));
    expect(postPayoutCompletion).toHaveBeenCalledTimes(1);
    expect(bills.removeUnusedBill).not.toHaveBeenCalled();
  });
  it('allows a receipt already attached to another request', async () => {
    const { prisma, approve, bills, tx } = setup();
    prisma.payoutRequest.findFirst.mockResolvedValue({ id: 'other' } as never);
    await expect(approve()).resolves.toMatchObject({ status: 'APPROVED' });
    expect(bills.uploadBill).toHaveBeenCalledTimes(1);
    expect(prisma.payoutRequest.findFirst).not.toHaveBeenCalled();
    expect(tx.payoutRequest.update).toHaveBeenCalledTimes(1);
  });
  it('does not reject a shared receipt inside the transaction', async () => {
    const { approve, tx, bills } = setup();
    tx.payoutRequest.findFirst.mockResolvedValue({ id: 'other', proofImageSha256: 'a'.repeat(64) } as never);
    await expect(approve()).resolves.toMatchObject({ status: 'APPROVED' });
    expect(tx.payoutRequest.update).toHaveBeenCalledTimes(1);
    expect(bills.removeUnusedBill).not.toHaveBeenCalled();
  });
  it('allows a bank reference shared by other requests', async () => {
    const { approve, tx } = setup();
    tx.payoutRequest.findFirst.mockResolvedValue({ id: 'other', bankRefCode: 'GD-20261114-0002' } as never);
    await expect(approve()).resolves.toMatchObject({ status: 'APPROVED' });
    expect(tx.payoutRequest.findFirst).not.toHaveBeenCalled();
    expect(tx.payoutRequest.update).toHaveBeenCalledTimes(1);
  });
  it('uploads evidence even when another request used the bank reference', async () => {
    const { approve, prisma, bills, tx } = setup();
    prisma.payoutRequest.findFirst.mockResolvedValue({ id: 'other', bankRefCode: 'GD-20261114-0002', proofImageSha256: 'b'.repeat(64) } as never);
    await expect(approve()).resolves.toMatchObject({ status: 'APPROVED' });
    expect(bills.uploadBill).toHaveBeenCalledTimes(1);
    expect(tx.payoutRequest.update).toHaveBeenCalledTimes(1);
  });
  it('returns 409 for a database uniqueness race even when receipt cleanup fails', async () => {
    const { approve, tx, bills } = setup();
    tx.payoutRequest.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test', meta: { target: 'financial_posting_identity' } }));
    bills.removeUnusedBill.mockRejectedValue(new Error('storage unavailable'));
    await expect(approve()).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(postPayoutCompletion).not.toHaveBeenCalled();
  });
  it('preserves KYC rejection instead of bypassing it or masking it as a cleanup error', async () => {
    const { approve, tx, bills } = setup();
    jest.mocked(assertPayoutBeneficiary).mockRejectedValue(new BadRequestException('Tài khoản chưa khớp KYC'));
    bills.removeUnusedBill.mockRejectedValue(new Error('storage unavailable'));
    await expect(approve()).rejects.toThrow('Tài khoản chưa khớp KYC');
    expect(tx.payoutRequest.update).not.toHaveBeenCalled();
  });
  it('never removes shared evidence when a new approval fails', async () => {
    const { approve, tx, bills } = setup();
    bills.uploadBill.mockResolvedValue({ publicId: 'shared-proof', secureUrl: 'https://example.invalid/shared.png', format: 'png', sha256: 'a'.repeat(64), reused: true } as never);
    tx.payoutRequest.update.mockRejectedValue(new Error('database unavailable'));
    await expect(approve()).rejects.toThrow('database unavailable');
    expect(bills.removeUnusedBill).not.toHaveBeenCalled();
    expect(postPayoutCompletion).not.toHaveBeenCalled();
  });
});

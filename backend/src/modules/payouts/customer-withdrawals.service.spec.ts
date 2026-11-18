import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { CustomerWithdrawalsService } from './customer-withdrawals.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PayoutBillService } from './payout-bill.service';

describe('Customer withdrawal boundaries', () => {
  const customer = {
    id: 'customer',
    role: UserRole.CUSTOMER,
    email: 'customer@example.test',
  };
  const manager = { ...customer, id: 'manager', role: UserRole.SYSTEM_MANAGER };
  const input = {
    requestKey: 'retry-key',
    amount: 200000,
    bankName: 'Bank',
    bankAccountName: 'CUSTOMER',
    bankAccountNumber: '12345678',
  };
  const setup = () => {
    const row = {
      ...input,
      id: 'withdrawal',
      userId: customer.id,
      amount: new Prisma.Decimal(200000),
      status: 'PENDING',
      proofPublicId: null,
      proofFormat: null,
      proofHash: null,
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ id: row.id }]),
      customerWithdrawal: {
        findUnique: jest.fn().mockImplementation(async () => row),
        create: jest.fn().mockResolvedValue(row),
        update: jest
          .fn()
          .mockImplementation(async ({ data }) => Object.assign(row, data)),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      financePosting: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const wallets = {
      reserveCustomerWithdrawal: jest.fn().mockResolvedValue({}),
      refundCustomerWithdrawal: jest.fn().mockResolvedValue({}),
    };
    const bills = {
      validateBill: jest.fn().mockReturnValue('hash'),
      uploadBill: jest
        .fn()
        .mockResolvedValue({
          publicId: 'proof',
          format: 'png',
          sha256: 'hash',
        }),
      removeUnusedBill: jest.fn().mockResolvedValue({}),
      getBillDownloadUrl: jest.fn().mockReturnValue('signed-url'),
    };
    const service = new CustomerWithdrawalsService(
      prisma as unknown as PrismaService,
      wallets as unknown as WalletsService,
      bills as unknown as PayoutBillService,
    );
    return { row, tx, wallets, bills, service };
  };
  it('retries return the same request without reserving money twice', async () => {
    const { service, wallets, tx } = setup();
    tx.customerWithdrawal.findUnique.mockResolvedValueOnce(null);
    await service.create(customer, input);
    await service.create(customer, input);
    expect(wallets.reserveCustomerWithdrawal).toHaveBeenCalledTimes(1);
    expect(tx.customerWithdrawal.create).toHaveBeenCalledTimes(1);
  });
  it('cannot reuse another customer request key', async () => {
    const { service } = setup();
    await expect(
      service.create({ ...customer, id: 'other' }, input),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('only operators can approve, and approval never debits the wallet again or posts PIT tax', async () => {
    const { service, wallets, tx } = setup();
    await expect(
      service.approve(customer, 'withdrawal', { bankRefCode: 'REF' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.approve(
      manager,
      'withdrawal',
      { bankRefCode: 'REF' },
      {} as Express.Multer.File,
    );
    expect(wallets.reserveCustomerWithdrawal).not.toHaveBeenCalled();
    expect(tx.financePosting.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        debitAccount: 'CUSTOMER_WITHDRAWAL_RESERVED',
        creditAccount: 'CORPORATE_BANK',
        amount: new Prisma.Decimal(200000),
      }),
    });
    expect(tx.financePosting.create).toHaveBeenCalledTimes(1);
  });
  it('rejecting refunds exactly once and rejects repeated processing', async () => {
    const { service, wallets } = setup();
    await service.reject(manager, 'withdrawal', 'Wrong bank account');
    await expect(
      service.reject(manager, 'withdrawal', 'Wrong bank account'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(wallets.refundCustomerWithdrawal).toHaveBeenCalledTimes(1);
  });
  it('customers cannot read another customer proof', async () => {
    const { service } = setup();
    await expect(
      service.proof({ ...customer, id: 'other' }, 'withdrawal'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('allows reused customer evidence and bank references but posts each request once', async () => {
    const { service, tx, bills } = setup();
    tx.customerWithdrawal.findFirst.mockResolvedValueOnce({ id: 'other' });
    await expect(service.approve(manager, 'withdrawal', { bankRefCode: 'REF' }, {} as Express.Multer.File)).resolves.toMatchObject({ status: 'APPROVED' });
    expect(tx.customerWithdrawal.findFirst).not.toHaveBeenCalled();
    expect(bills.uploadBill).toHaveBeenCalledTimes(1);
    await expect(service.approve(manager, 'withdrawal', { bankRefCode: 'REF' }, {} as Express.Multer.File)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.financePosting.create).toHaveBeenCalledTimes(1);
  });
  it('never removes shared customer evidence after an approval failure', async () => {
    const { service, tx, bills } = setup();
    bills.uploadBill.mockResolvedValueOnce({ publicId: 'shared-proof', format: 'png', sha256: 'hash', reused: true } as never);
    tx.customerWithdrawal.update.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.approve(manager, 'withdrawal', { bankRefCode: 'REF' }, {} as Express.Multer.File)).rejects.toThrow('database unavailable');
    expect(bills.removeUnusedBill).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
  it('maps a concurrent customer posting duplicate to 409 even if cleanup fails', async () => {
    const { service, tx, bills } = setup();
    tx.customerWithdrawal.update.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    bills.removeUnusedBill.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(service.approve(manager, 'withdrawal', { bankRefCode: 'REF' }, {} as Express.Multer.File)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
});

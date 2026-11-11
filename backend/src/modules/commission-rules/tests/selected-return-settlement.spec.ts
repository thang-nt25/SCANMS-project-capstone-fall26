import { Prisma } from '@prisma/client';
import { CommissionRulesService } from '../commission-rules.service';
const d = (value: number) => new Prisma.Decimal(value);

it('settles a selected 10% line without clawing back the unrelated 16% line or its KPI bonus', async () => {
  const order = {
    id: 'order',
    storeId: 'store',
    attributedCollaboratorId: 'kol',
    createdAt: new Date(),
    finalAmount: d(200000),
    refundedAmount: d(0),
    rawPayload: {},
  };
  const items = [10000, 16000].map((amount, index) => ({
    id: `item-${index}`,
    quantity: 1,
    unitPrice: d(100000),
    calculatedCommissionAmount: d(amount),
    appliedCommissionRate: d(amount / 1000),
    referralLink: { collaboratorId: 'kol' },
  }));
  const income = {
    id: 'income',
    collaboratorId: 'kol',
    status: 'PENDING',
    commissionAmount: d(26000),
    baseCommissionAmount: d(20000),
    baseCommissionRate: d(10),
    dealBonusAmount: d(6000),
    dealBonusStatus: 'PENDING_KPI',
  };
  const tx = {
    $queryRaw: jest.fn(),
    order: {
      findFirst: jest.fn(async () => order),
      findUnique: jest.fn(async () => order),
      update: jest.fn(),
    },
    orderRefund: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: 'refund' })),
    },
    couponRedemption: { findUnique: jest.fn(async () => null) },
    stackedVoucherRedemption: { findMany: jest.fn(async () => []) },
    orderItem: { findMany: jest.fn(async () => items), update: jest.fn() },
    returnItem: { findMany: jest.fn(async () => []) },
    commission: { findMany: jest.fn(async () => [income]), update: jest.fn() },
    monthlyBonusResult: { findUnique: jest.fn(async () => null) },
    auditLog: { create: jest.fn() },
  };
  const wallets = {
    reversePendingBalance: jest.fn(),
    forfeitConditionalDealBonus: jest.fn(),
  };
  const service = new CommissionRulesService(
    { store: { findUnique: async () => ({ id: 'store' }) } } as never,
    wallets as never,
  );
  await service.handleRefundAdjustment(
    'store',
    'order',
    '100000',
    'Selected item',
    'manager',
    undefined,
    tx as never,
    'return:request',
    [{ orderItemId: 'item-0', quantity: 1 }],
  );
  expect(wallets.reversePendingBalance).toHaveBeenCalledWith(
    tx,
    'kol',
    d(10000),
    { id: 'refund', type: 'ORDER_REFUND' },
    undefined,
  );
  expect(wallets.forfeitConditionalDealBonus).not.toHaveBeenCalled();
  expect(tx.orderItem.update).toHaveBeenCalledTimes(1);
  expect(tx.orderItem.update).toHaveBeenCalledWith({
    where: { id: 'item-0' },
    data: { calculatedCommissionAmount: { decrement: d(10000) } },
  });
  expect(tx.commission.update).toHaveBeenCalledWith({
    where: { id: 'income' },
    data: {
      baseCommissionAmount: d(10000),
      dealBonusAmount: d(6000),
      commissionAmount: d(16000),
    },
  });
});

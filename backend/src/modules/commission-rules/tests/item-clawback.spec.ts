import { Prisma } from '@prisma/client';
import { allocateItemClawback } from '../item-clawback';
const d = (value: number) => new Prisma.Decimal(value);
const item = (id: string, amount: number, collaboratorId = 'kol') => ({
  id,
  quantity: 1,
  unitPrice: d(100000),
  calculatedCommissionAmount: d(amount),
  appliedCommissionRate: d(amount / 1000),
  referralLink: { collaboratorId },
});
const income = (collaboratorId = 'kol') => ({
  collaboratorId,
  commissionAmount: d(26000),
  baseCommissionAmount: d(20000),
  baseCommissionRate: d(10),
  dealBonusAmount: d(6000),
});
describe('Selected-line income clawback', () => {
  it('reverses 10,000 for the 10% item, leaving the 16% item untouched', () => {
    const result = allocateItemClawback(
      [item('a', 10000), item('b', 16000)],
      [income()],
      [{ orderItemId: 'a', quantity: 1 }],
      new Map(),
      'kol',
    );
    expect(result.itemAmounts.has('b')).toBe(false);
    expect(result.incomeAmounts.get('kol')?.base.toString()).toBe('10000');
    expect(result.incomeAmounts.get('kol')?.deal.toString()).toBe('0');
  });
  it('preserves the base/deal split and unrelated collaborators', () => {
    const result = allocateItemClawback(
      [item('a', 16000), item('b', 10000, 'other')],
      [income(), income('other')],
      [{ orderItemId: 'a', quantity: 1 }],
      new Map(),
      null,
    );
    expect(result.incomeAmounts.get('kol')?.deal.toString()).toBe('6000');
    expect(result.incomeAmounts.has('other')).toBe(false);
  });
  it('uses remaining quantities after an earlier partial refund', () => {
    const result = allocateItemClawback(
      [{ ...item('a', 16000), quantity: 3 }],
      [income()],
      [{ orderItemId: 'a', quantity: 1 }],
      new Map([['a', 1]]),
      'kol',
    );
    expect(result.itemAmounts.get('a')?.toString()).toBe('8000');
  });
  it('rejects duplicate or excessive quantities', () => {
    expect(() =>
      allocateItemClawback(
        [item('a', 10000)],
        [],
        [{ orderItemId: 'a', quantity: 2 }],
        new Map(),
        null,
      ),
    ).toThrow();
    expect(() =>
      allocateItemClawback(
        [item('a', 10000)],
        [],
        [
          { orderItemId: 'a', quantity: 1 },
          { orderItemId: 'a', quantity: 1 },
        ],
        new Map(),
        null,
      ),
    ).toThrow();
  });
  it('preserves a previous monetary refund when a remaining unit is returned', () => {
    const result = allocateItemClawback(
      [{ ...item('a', 16000), quantity: 2 }],
      [
        {
          ...income(),
          commissionAmount: d(16000),
          baseCommissionAmount: d(10000),
        },
      ],
      [{ orderItemId: 'a', quantity: 1 }],
      new Map(),
      'kol',
    );
    expect(result.incomeAmounts.get('kol')?.base.toString()).toBe('5000');
    expect(result.incomeAmounts.get('kol')?.deal.toString()).toBe('3000');
  });
  it('requires reconciliation instead of guessing a missing deal rate', () => {
    expect(() =>
      allocateItemClawback(
        [{ ...item('a', 16000), appliedCommissionRate: undefined }],
        [income()],
        [{ orderItemId: 'a', quantity: 1 }],
        new Map(),
        'kol',
      ),
    ).toThrow('Thiếu tỷ lệ thù lao gốc');
  });
});

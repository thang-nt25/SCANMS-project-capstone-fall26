import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { ReleaseLiveVoucherDto } from './dto/create-live-session.dto';
import { validate } from 'class-validator';

describe('live voucher drop', () => {
  function setup(sessionChanges = {}, couponChanges = {}) {
    const coupon = { id: 'coupon', displayCode: 'LIVE10', status: 'ACTIVE', usageLimitTotal: 100, usageCount: 20,
      budgetTotal: null, budgetUsed: 0, ...couponChanges };
    const session = { id: 'session', creatorId: 'kol', createdBy: 'shop', status: 'LIVE', inviteStatus: 'ACCEPTED',
      startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 60000),
      coupon, governance: { pinnedProductId: 'product', preserveOrderTerms: true }, ...sessionChanges };
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]),
      liveShoppingSession: { findUnique: jest.fn().mockResolvedValue(session), update: jest.fn().mockResolvedValue(session) },
      coupon: { findUniqueOrThrow: jest.fn().mockResolvedValue(coupon), update: jest.fn() } };
    const prisma = { $transaction: jest.fn(run => run(tx)) };
    return { service: new LiveSessionsService(prisma as never, {} as never, {} as never), tx };
  }
  it.each(['kol', 'shop'])('publishes the selected real coupon and quantity for %s without changing the budget', async user => {
    const { service, tx } = setup();
    const result = await service.releaseVoucher(user, 'session', { couponId: 'coupon', quantity: 50 });
    expect(result).toMatchObject({ couponId: 'coupon', code: 'LIVE10', quantity: 50 });
    expect(tx.liveShoppingSession.update.mock.calls[0][0].data.governance).toMatchObject({
      pinnedProductId: 'product', preserveOrderTerms: true, voucherDrop: result,
    });
    expect(tx.coupon.update).not.toHaveBeenCalled();
  });
  it('rejects strangers and coupons outside the session', async () => {
    const { service, tx } = setup();
    await expect(service.releaseVoucher('other', 'session', { couponId: 'coupon', quantity: 50 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.releaseVoucher('kol', 'session', { couponId: 'another', quantity: 50 })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.liveShoppingSession.update).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, 81, 10001])('rejects invalid or unavailable quantity %s', async quantity => {
    const { service, tx } = setup();
    await expect(service.releaseVoucher('kol', 'session', { couponId: 'coupon', quantity })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.liveShoppingSession.update).not.toHaveBeenCalled();
  });
  it.each([{ status: 'ENDED' }, { status: 'PAUSED' }, { inviteStatus: 'PENDING' }, { endsAt: new Date(0) }])('rejects sessions outside an accepted active broadcast (%j)', async changes => {
    await expect(setup(changes).service.releaseVoucher('kol', 'session', { couponId: 'coupon', quantity: 50 })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([{ status: 'PAUSED' }, { usageCount: 100 }, { expiresAt: new Date(0) }, { budgetTotal: 100, budgetUsed: 100 }])('rejects inactive or exhausted coupons (%j)', async changes => {
    await expect(setup({}, changes).service.releaseVoucher('kol', 'session', { couponId: 'coupon', quantity: 50 })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('validates the HTTP request DTO', async () => {
    const dto = Object.assign(new ReleaseLiveVoucherDto(), { couponId: 'bad', quantity: '50' });
    expect((await validate(dto)).map(error => error.property)).toEqual(expect.arrayContaining(['couponId', 'quantity']));
  });
});

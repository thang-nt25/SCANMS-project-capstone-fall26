import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  hasSponsorshipCapacity,
  SponsorshipService,
  validateSponsorshipWindow,
  sponsorshipHasExpired,
} from './sponsorship.service';

describe('Sponsorship booking invariants', () => {
  const now = Date.now();
  const window = {
    startsAt: new Date(now + 1000),
    endsAt: new Date(now + 7200000),
  };
  it('requires a valid future window lasting 1h–31d', () => {
    expect(() =>
      validateSponsorshipWindow(window.startsAt, window.endsAt, now),
    ).not.toThrow();
    for (const end of [
      new Date(now - 1),
      new Date(now + 2000),
      new Date(now + 40 * 86400000),
      new Date('invalid'),
    ]) {
      expect(() =>
        validateSponsorshipWindow(window.startsAt, end, now),
      ).toThrow(BadRequestException);
    }
  });
  it('prevents overselling at any instant, permitting adjacent non-overlapping bookings', () => {
    expect(hasSponsorshipCapacity(Array(5).fill(window), window)).toBe(true);
    expect(hasSponsorshipCapacity(Array(6).fill(window), window)).toBe(false);
    const later = { startsAt: window.endsAt, endsAt: new Date(now + 14400000) };
    expect(hasSponsorshipCapacity(Array(6).fill(window), later)).toBe(true);
    expect(
      hasSponsorshipCapacity(
        Array(6).fill({
          startsAt: new Date(now + 3600000),
          endsAt: window.endsAt,
        }),
        window,
      ),
    ).toBe(false);
  });
  function setup(row?: object) {
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'shop' }) },
      sponsoredPlacement: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(row),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockResolvedValue({ id: 'new' }),
      },
      auditLog: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (work) => Array.isArray(work) ? Promise.all(work) : work(tx)) };
    return { tx, service: new SponsorshipService(prisma as never) };
  }
  const pending = () => ({
    id: 'placement',
    storeId: 'shop',
    requestedById: 'owner',
    status: 'REQUESTED',
    amount: 100000,
    ...window,
    store: {
      isActive: true,
      isDeleted: false,
      isVerified: true,
      onboardingStatus: 'VERIFIED',
      owner: { isActive: true },
    },
  });
  it('derives expiry without replacing cancellations or rejections', () => {
    const past = new Date(Date.now() - 1000);
    expect(sponsorshipHasExpired({ status: 'APPROVED', endsAt: past })).toBe(true);
    expect(sponsorshipHasExpired({ status: 'REQUESTED', endsAt: past })).toBe(true);
    expect(sponsorshipHasExpired({ status: 'CANCELLED', endsAt: past })).toBe(false);
    expect(sponsorshipHasExpired({ status: 'REJECTED', endsAt: past })).toBe(false);
  });
  it('filters expired bookings on the server and returns an expired status', async () => {
    const { service, tx } = setup();
    tx.sponsoredPlacement.findMany.mockResolvedValue([{ ...pending(), endsAt: new Date(Date.now() - 1000) }]);
    const result = await service.list('owner', UserRole.SHOP_MANAGER, { page: 1, status: 'EXPIRED' });
    expect(result.items[0].status).toBe('EXPIRED');
    expect(tx.sponsoredPlacement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { store: { ownerId: 'owner' }, status: { in: ['REQUESTED', 'APPROVED'] }, endsAt: { lte: expect.any(Date) } },
    }));
  });
  it('keeps expired approvals outside the approved filter', async () => {
    const { service, tx } = setup();
    await service.list('owner', UserRole.SHOP_MANAGER, { page: 1, status: 'APPROVED' });
    expect(tx.sponsoredPlacement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'APPROVED', endsAt: { gt: expect.any(Date) } }),
    }));
  });
  it('creates a separately billed renewal and leaves the old booking intact', async () => {
    const { service, tx } = setup();
    tx.sponsoredPlacement.findFirst.mockResolvedValueOnce({ ...pending(), status: 'APPROVED', endsAt: new Date(Date.now() - 1000) });
    await service.request('owner', { requestKey: 'new-request', headline: 'Quảng bá gia hạn',
      startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString(), quotedAmount: 100000, renewsPlacementId: 'old' });
    expect(tx.sponsoredPlacement.findFirst).toHaveBeenCalledWith({ where: { id: 'old', storeId: 'shop' } });
    expect(tx.sponsoredPlacement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 100000, fundingType: 'PAID' }) });
    expect(tx.sponsoredPlacement.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SPONSORSHIP_RENEWAL_REQUESTED', details: expect.objectContaining({ renewsPlacementId: 'old' }) }) });
  });
  it('rejects renewal of an ineligible or other shops booking', async () => {
    const { service, tx } = setup();
    for (const row of [null, pending()]) {
      tx.sponsoredPlacement.findFirst.mockResolvedValue(row);
      await expect(service.request('owner', { requestKey: 'new', headline: 'Quảng bá gia hạn',
        startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString(), quotedAmount: 100000, renewsPlacementId: 'old' })).rejects.toThrow(BadRequestException);
    }
    expect(tx.sponsoredPlacement.create).not.toHaveBeenCalled();
  });
  it('does not cancel an expired booking', async () => {
    const { service, tx } = setup();
    tx.sponsoredPlacement.findFirst.mockResolvedValue({ ...pending(), endsAt: new Date(Date.now() - 1000) });
    await expect(service.cancel('old', 'owner', UserRole.SHOP_MANAGER, 'Dừng quảng cáo')).rejects.toThrow(ConflictException);
    expect(tx.sponsoredPlacement.updateMany).not.toHaveBeenCalled();
  });
  it('rejects customer access and owner self-approval before database work', async () => {
    const { service } = setup();
    await expect(
      service.list('customer', UserRole.CUSTOMER, { page: 1 }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.cancel('p', 'customer', UserRole.CUSTOMER, 'Lý do hủy'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.review('p', 'owner', UserRole.SHOP_MANAGER, {
        decision: 'APPROVE',
        note: 'Đồng ý',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('requires actual manual reconciliation evidence for a paid booking', async () => {
    const { service, tx } = setup(pending());
    await expect(
      service.review('p', 'admin', UserRole.SYSTEM_ADMIN, {
        decision: 'APPROVE',
        note: 'Đối soát',
        fundingType: 'PAID',
        amount: 100000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.sponsoredPlacement.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a tampered quote before writing a booking', async () => {
    const { service, tx } = setup();
    await expect(service.request('owner', {
      headline: 'Quảng bá Shop', requestKey: 'request',
      startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString(), quotedAmount: 1,
    })).rejects.toThrow(BadRequestException);
    expect(tx.sponsoredPlacement.create).not.toHaveBeenCalled();
  });
  it('stores the server quote on a pending request without confirming payment', async () => {
    const { service, tx } = setup();
    await service.request('owner', {
      headline: 'Quảng bá Shop', requestKey: 'request',
      startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString(), quotedAmount: 100000,
    });
    expect(tx.sponsoredPlacement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      amount: 100000, fundingType: 'PAID',
    }) });
    expect(tx.sponsoredPlacement.create.mock.calls[0][0].data.paymentReference).toBeUndefined();
  });
  it('rejects approval with a different amount than the stored quote', async () => {
    const { service, tx } = setup(pending());
    await expect(service.review('placement', 'admin', UserRole.SYSTEM_ADMIN, {
      decision: 'APPROVE', note: 'Đối soát thanh toán', fundingType: 'PAID', amount: 200000,
      paymentReference: 'BANK-123456', paymentProofUrl: 'https://example.com/receipt',
    })).rejects.toThrow(BadRequestException);
    expect(tx.sponsoredPlacement.updateMany).not.toHaveBeenCalled();
  });
  it('rejects free grants even when an administrator requests approval', async () => {
    const { service, tx } = setup(pending());
    await expect(service.review('placement', 'admin', UserRole.SYSTEM_ADMIN, {
      decision: 'APPROVE', note: 'Sàn cấp miễn phí',
      fundingType: 'PLATFORM_GRANT', amount: 0,
    })).rejects.toThrow(BadRequestException);
    expect(tx.sponsoredPlacement.updateMany).not.toHaveBeenCalled();
  });
  it('approves a reconciled paid booking atomically with audit and owner notification', async () => {
    const { service, tx } = setup(pending());
    await service.review('placement', 'admin', UserRole.SYSTEM_ADMIN, {
      decision: 'APPROVE',
      note: 'Đã kiểm tra tiền nhận',
      fundingType: 'PAID',
      amount: 100000,
      paymentReference: 'BANK-123456',
      paymentProofUrl: 'https://example.com/receipt',
    });
    expect(tx.sponsoredPlacement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'placement', status: 'REQUESTED' },
        data: expect.objectContaining({
          status: 'APPROVED',
          fundingType: 'PAID',
          amount: 100000,
          paymentReference: 'BANK-123456',
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });
  it('rejects a second approval or concurrent processing', async () => {
    const { service, tx } = setup({ ...pending(), status: 'APPROVED' });
    await expect(
      service.review('p', 'admin', UserRole.SYSTEM_ADMIN, {
        decision: 'REJECT',
        note: 'Không phù hợp',
      }),
    ).rejects.toThrow(ConflictException);
    tx.sponsoredPlacement.findUnique.mockResolvedValue(pending());
    tx.sponsoredPlacement.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.review('p', 'admin', UserRole.SYSTEM_ADMIN, {
        decision: 'REJECT',
        note: 'Không phù hợp',
      }),
    ).rejects.toThrow(ConflictException);
  });
  it('scopes cancellation to the owner and does not report money refunded', async () => {
    const { service, tx } = setup();
    tx.sponsoredPlacement.findFirst.mockResolvedValue(pending());
    expect(
      await service.cancel('p', 'owner', UserRole.SHOP_MANAGER, 'Dừng lịch'),
    ).toMatchObject({ status: 'CANCELLED' });
    expect(tx.sponsoredPlacement.findFirst).toHaveBeenCalledWith({
      where: { id: 'p', store: { ownerId: 'owner' } },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: expect.objectContaining({ automaticallyRefunded: false }),
        }),
      }),
    );
  });
});

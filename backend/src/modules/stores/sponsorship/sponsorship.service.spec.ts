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
    const prisma = { $transaction: jest.fn(async (work) => work(tx)) };
    return { tx, service: new SponsorshipService(prisma as never) };
  }
  const pending = () => ({
    id: 'placement',
    storeId: 'shop',
    requestedById: 'owner',
    status: 'REQUESTED',
    ...window,
    store: {
      isActive: true,
      isDeleted: false,
      isVerified: true,
      onboardingStatus: 'VERIFIED',
      owner: { isActive: true },
    },
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
  it('approves an explicitly free platform grant atomically with audit and owner notification', async () => {
    const { service, tx } = setup(pending());
    await service.review('placement', 'admin', UserRole.SYSTEM_ADMIN, {
      decision: 'APPROVE',
      note: 'Sàn cấp miễn phí',
      fundingType: 'PLATFORM_GRANT',
      amount: 0,
    });
    expect(tx.sponsoredPlacement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'placement', status: 'REQUESTED' },
        data: expect.objectContaining({
          status: 'APPROVED',
          amount: 0,
          paymentReference: null,
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

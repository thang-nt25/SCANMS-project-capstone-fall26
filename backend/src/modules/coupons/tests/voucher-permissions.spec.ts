import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CouponStatus, UserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { CouponsService } from '../coupons.service';
import { StoreCouponsController, CollaboratorCouponsController, AdminCouponsController, PublicCouponsController } from '../coupons.controller';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('Word section 7 voucher ownership and lifecycle', () => {
  function fixture(overrides: any = {}) {
    let clock = 0;
    const coupon: any = { id: 'coupon', storeId: 'shop', collaboratorId: 'kol', codeNormalized: 'AUDIT5',
      status: CouponStatus.ACTIVE, fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS', scopeType: 'STORE_WIDE',
      shopFundingRate: 100, platformFundingRate: 0, approvedBy: 'owner', approvedAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'), statusBeforeBlock: null, expiresAt: new Date('2099-01-01'), ...overrides };
    const prisma: any = {
      store: { findUnique: jest.fn().mockResolvedValue({ id: 'shop', ownerId: 'owner' }) },
      coupon: {
        findFirst: jest.fn(async ({ where }: any) => (!where.collaboratorId || where.collaboratorId === coupon.collaboratorId) ? { ...coupon } : null),
        findUnique: jest.fn(async ({ where }: any) => where.id ? { ...coupon } : null),
        create: jest.fn(async ({ data }: any) => ({ id: 'new-coupon', ...data })),
        update: jest.fn(async ({ where, data }: any) => {
          for (const [key, value] of Object.entries(where)) {
            if (value === undefined) continue;
            const actual = coupon[key];
            if (key === 'updatedAt' && typeof value === 'object' && !(value instanceof Date)) {
              const range = value as { gte: Date; lt: Date };
              if (actual < range.gte || actual >= range.lt) throw { code: 'P2025' };
              continue;
            }
            if (value instanceof Date ? actual?.getTime() !== value.getTime() : actual !== value) throw { code: 'P2025' };
          }
          Object.assign(coupon, data, { updatedAt: new Date(Date.parse('2026-10-16') + ++clock) });
          return { ...coupon };
        }),
      },
      auditLog: { create: jest.fn() }, notification: { create: jest.fn() }, order: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((callback: any) => callback(prisma)),
    };
    const service: any = new CouponsService(prisma, { del: jest.fn() } as any);
    service.checkRateLimit = jest.fn();
    return { service, prisma, coupon };
  }

  it.each(['other-owner', '6e9eb89c-f544-4f87-b724-1fe7aace2edc', 'df25d2c6-706a-4ff1-973e-17b222626764'])(
    'rejects foreign store management, including former demo exceptions (%s)', async userId => {
      const { service, prisma } = fixture();
      await expect(service.getStoreCoupons('shop', userId, 'SHOP_MANAGER', {})).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.coupon.update).not.toHaveBeenCalled();
    });

  it.each(['PLATFORM_FUNDED', 'CO_FUNDED'])('denies Shop policy writes against stored %s funding', async fundingSource => {
    const { service, prisma } = fixture({ fundingSource, platformFundingRate: 100 });
    for (const payload of [{ budgetTotal: 999999999 }, { discountValue: 99 }, { minimumOrderAmount: 0 }, { fundingSource: 'SHOP_FUNDED' }]) {
      await expect(service.updateCouponPolicy('shop', 'coupon', 'owner', 'SHOP_MANAGER', payload)).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(prisma.coupon.update).not.toHaveBeenCalled();
  });

  it('permits legitimate Shop policy changes and enforces 100% Shop funding', async () => {
    const { service, coupon } = fixture();
    await service.updateCouponPolicy('shop', 'coupon', 'owner', 'SHOP_MANAGER', { budgetTotal: 1000000 });
    expect(Number(coupon.budgetTotal)).toBe(1000000);
    expect(Number(coupon.shopFundingRate)).toBe(100);
    expect(Number(coupon.platformFundingRate)).toBe(0);
    await expect(service.updateCouponPolicy('shop', 'coupon', 'owner', 'SHOP_MANAGER', { shopFundingRate: 1 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permits Admin financial maintenance of platform vouchers', async () => {
    const { service, coupon } = fixture({ fundingSource: 'PLATFORM_FUNDED', shopFundingRate: 0, platformFundingRate: 100 });
    await service.updateCouponPolicy('shop', 'coupon', 'admin', 'SYSTEM_ADMIN', { budgetTotal: 2000000 });
    expect(Number(coupon.budgetTotal)).toBe(2000000);
    expect(coupon.fundingSource).toBe('PLATFORM_FUNDED');
  });

  it.each(['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'COLLABORATOR', 'CUSTOMER'])(
    'does not let %s approve a KOL proposal or spend Shop budget by issuing a Shop coupon', async role => {
      const { service, prisma } = fixture({ status: 'PENDING_APPROVAL' });
      await expect(service.approveCoupon('shop', 'coupon', 'owner', role, { discountType: 'PERCENTAGE', discountValue: 5 })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.createStoreCoupon('shop', 'owner', role, { code: 'AUDIT5' })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.coupon.update).not.toHaveBeenCalled(); expect(prisma.coupon.create).not.toHaveBeenCalled();
    });

  it('only the owner Shop can approve and fund a pending proposal', async () => {
    const { service, coupon } = fixture({ status: 'PENDING_APPROVAL', approvedBy: null, approvedAt: null });
    await service.approveCoupon('shop', 'coupon', 'owner', 'SHOP_MANAGER', { discountType: 'PERCENTAGE', discountValue: 5 });
    expect(coupon.status).toBe('ACTIVE'); expect(coupon.approvedBy).toBe('owner');
    expect(coupon.fundingSource).toBe('SHOP_FUNDED'); expect(Number(coupon.shopFundingRate)).toBe(100);
  });

  it.each(['ACTIVE', 'PAUSED', 'PENDING_APPROVAL', 'REJECTED'])(
    'restores %s after blocking without inventing an approval', async status => {
      const unapproved = status === 'PENDING_APPROVAL' || status === 'REJECTED';
      const { service, coupon } = fixture({ status, ...(unapproved ? { approvedBy: null, approvedAt: null } : {}) });
      await service.adminBlockCoupon('coupon', 'admin', { reason: 'Audit security hold' });
      expect(coupon.status).toBe('BLOCKED'); expect(coupon.statusBeforeBlock).toBe(status);
      await service.adminUnblockCoupon('coupon', 'admin');
      expect(coupon.status).toBe(status); expect(coupon.statusBeforeBlock).toBeNull();
      if (unapproved) expect(coupon.approvedBy).toBeNull();
    });

  it('keeps a never-approved legacy blocked proposal pending and does not allow KOL activation', async () => {
    const { service, coupon } = fixture({ status: 'BLOCKED', approvedBy: null, approvedAt: null });
    await service.adminUnblockCoupon('coupon', 'admin');
    expect(coupon.status).toBe('PENDING_APPROVAL');
    await expect(service.togglePauseCoupon('kol', 'coupon')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not auto-activate legacy approved blocked coupons when their former state is unknown', async () => {
    const { service, coupon } = fixture({ status: 'BLOCKED' });
    await service.adminUnblockCoupon('coupon', 'admin'); expect(coupon.status).toBe('PAUSED');
  });

  it('rejects repeated blocking, unblocking a non-blocked coupon, and expired activation', async () => {
    const { service, coupon } = fixture({ expiresAt: new Date('2000-01-01') });
    await expect(service.adminUnblockCoupon('coupon', 'admin')).rejects.toBeInstanceOf(BadRequestException);
    await service.adminBlockCoupon('coupon', 'admin', { reason: 'Audit' });
    await expect(service.adminBlockCoupon('coupon', 'admin', { reason: 'Again' })).rejects.toBeInstanceOf(BadRequestException);
    expect(coupon.statusBeforeBlock).toBe('ACTIVE');
    await service.adminUnblockCoupon('coupon', 'admin'); expect(coupon.status).toBe('EXPIRED');
  });

  it('a stale KOL action cannot overwrite an Admin block', async () => {
    const { service, prisma, coupon } = fixture();
    prisma.coupon.findFirst.mockImplementationOnce(async () => {
      const snapshot = { ...coupon }; coupon.status = 'BLOCKED'; return snapshot;
    });
    await expect(service.togglePauseCoupon('kol', 'coupon')).rejects.toBeInstanceOf(ConflictException);
    expect(coupon.status).toBe('BLOCKED'); expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('a stale Shop approval cannot overwrite an Admin block', async () => {
    const { service, prisma, coupon } = fixture({ status: 'PENDING_APPROVAL', approvedBy: null, approvedAt: null });
    prisma.coupon.findFirst.mockImplementationOnce(async () => {
      const snapshot = { ...coupon }; coupon.status = 'BLOCKED'; return snapshot;
    });
    await expect(service.approveCoupon('shop', 'coupon', 'owner', 'SHOP_MANAGER', { discountType: 'PERCENTAGE', discountValue: 5 })).rejects.toBeInstanceOf(ConflictException);
    expect(coupon.status).toBe('BLOCKED'); expect(coupon.approvedBy).toBeNull();
  });

  it('KOL cannot delete an active/blocked voucher to bypass Shop/Admin controls', async () => {
    const { service, prisma, coupon } = fixture();
    await expect(service.softDeleteCoupon('kol', 'coupon', {})).rejects.toBeInstanceOf(BadRequestException);
    coupon.status = 'BLOCKED';
    await expect(service.softDeleteCoupon('kol', 'coupon', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.coupon.update).not.toHaveBeenCalled();
  });

  it('enforces the voucher role matrix using actual controller metadata and RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());
    const matrix: Array<[any, string, UserRole[]]> = [
      [StoreCouponsController, 'createStoreCoupon', [UserRole.SHOP_MANAGER]],
      [StoreCouponsController, 'approveCoupon', [UserRole.SHOP_MANAGER]],
      [CollaboratorCouponsController, 'proposeCoupon', [UserRole.COLLABORATOR]],
      [AdminCouponsController, 'createPlatformCoupon', [UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER]],
      [PublicCouponsController, 'getSavedAvailableCoupons', [UserRole.CUSTOMER]],
    ];
    for (const [Controller, method, permitted] of matrix) for (const role of Object.values(UserRole)) {
      const context: any = { getClass: () => Controller, getHandler: () => Controller.prototype[method],
        switchToHttp: () => ({ getRequest: () => ({ user: { id: 'audit', role } }) }) };
      if (permitted.includes(role)) expect(guard.canActivate(context)).toBe(true);
      else expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    }
  });

  it('Customer saved voucher reads and deletion are scoped to the authenticated customer', async () => {
    const { service, prisma } = fixture();
    let rows = [{ userId: 'customer-a', couponId: 'voucher-a' }, { userId: 'customer-b', couponId: 'voucher-b' }];
    prisma.customerSavedCoupon = {
      findMany: jest.fn(async ({ where }: any) => rows.filter(row => row.userId === where.userId)),
      deleteMany: jest.fn(async ({ where }: any) => { rows = rows.filter(row => row.userId !== where.userId || row.couponId !== where.couponId); }),
    };
    expect(await service.getSavedCouponIds('customer-a')).toEqual(['voucher-a']);
    await service.removeSavedCoupon('customer-a', 'voucher-b');
    expect(rows).toHaveLength(2);
    await service.removeSavedCoupon('customer-a', 'voucher-a');
    expect(rows).toEqual([{ userId: 'customer-b', couponId: 'voucher-b' }]);
  });
});

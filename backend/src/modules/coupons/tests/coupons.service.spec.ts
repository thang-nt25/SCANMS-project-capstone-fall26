import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from '../coupons.service';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponStatus,
  DiscountType,
  CouponScope,
  CouponFundingSource,
  UserRole,
  Prisma,
} from '@prisma/client';

import { CacheService } from '../../../core/cache/cache.service';

describe('CouponsService (FR-12 Unit Tests)', () => {
  let service: CouponsService;
  let prisma: PrismaService;

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    checkRateLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000,
    }),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    storeCollaborator: {
      findUnique: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    couponProduct: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    couponCategory: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    couponRedemption: {
      count: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    commissionRule: {
      findFirst: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Section 8 & 9: normalizeAndValidateCode', () => {
    it('should trim and uppercase valid alphanumeric code', () => {
      expect(service.normalizeAndValidateCode('  thangvip10  ')).toBe('THANGVIP10');
      expect(service.normalizeAndValidateCode('kol2026')).toBe('KOL2026');
      expect(service.normalizeAndValidateCode('nhatxinh')).toBe('NHATXINH');
    });

    it('should reject code shorter than 4 characters', () => {
      expect(() => service.normalizeAndValidateCode('ABC')).toThrow(
        BadRequestException,
      );
    });

    it('should reject code longer than 20 characters', () => {
      expect(() =>
        service.normalizeAndValidateCode('A123456789012345678901'),
      ).toThrow(BadRequestException);
    });

    it('should reject code containing special characters, spaces, or Vietnamese accents', () => {
      expect(() => service.normalizeAndValidateCode('THẮNG10')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('VIP 10')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('CODE-10')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('<SCRIPT>')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('KOL🎉10')).toThrow(
        BadRequestException,
      );
    });

    it('should reject code composed solely of numbers', () => {
      expect(() => service.normalizeAndValidateCode('123456')).toThrow(
        BadRequestException,
      );
    });

    it('should reject banned keywords (Section 10)', () => {
      expect(() => service.normalizeAndValidateCode('ADMIN123')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('SCANMSVIP')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('OFFICIAL99')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('SYSTEM2026')).toThrow(
        BadRequestException,
      );
      expect(() => service.normalizeAndValidateCode('SUPPORTME')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Section 5 & 6: proposeCoupon', () => {
    const collaboratorId = 'collab-uuid-1';
    const storeId = 'store-uuid-1';

    it('should throw ForbiddenException if KOL not approved by Shop', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: collaboratorId,
        isActive: true,
        isDeleted: false,
      });
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        isDeleted: false,
      });
      mockPrisma.storeCollaborator.findUnique.mockResolvedValue(null);

      await expect(
        service.proposeCoupon(collaboratorId, {
          storeId,
          code: 'THANGVIP10',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if code already exists in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: collaboratorId,
        isActive: true,
        isDeleted: false,
      });
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        isDeleted: false,
        defaultCommissionRate: 15,
      });
      mockPrisma.storeCollaborator.findUnique.mockResolvedValue({
        status: 'APPROVED',
      });
      mockPrisma.coupon.count.mockResolvedValue(0);
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        codeNormalized: 'THANGVIP10',
      });

      await expect(
        service.proposeCoupon(collaboratorId, {
          storeId,
          code: 'THANGVIP10',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully propose coupon with PENDING_APPROVAL status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: collaboratorId,
        isActive: true,
        isDeleted: false,
      });
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        name: 'Sora Skin Official',
        isDeleted: false,
        defaultCommissionRate: 15,
      });
      mockPrisma.storeCollaborator.findUnique.mockResolvedValue({
        status: 'APPROVED',
      });
      mockPrisma.coupon.count.mockResolvedValue(0);
      mockPrisma.coupon.findUnique.mockResolvedValue(null);
      mockPrisma.coupon.create.mockResolvedValue({
        id: 'new-coupon-uuid',
        codeNormalized: 'THANGVIP10',
        displayCode: 'THANGVIP10',
        status: CouponStatus.PENDING_APPROVAL,
        collaboratorId,
        storeId,
      });

      const result = await service.proposeCoupon(collaboratorId, {
        storeId,
        code: 'thangvip10',
      });

      expect(result.coupon.status).toBe(CouponStatus.PENDING_APPROVAL);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COUPON_PROPOSED',
            userId: collaboratorId,
          }),
        }),
      );
    });
  });

  describe('Section 6, 7, 13, 14, 15: approveCoupon & policy', () => {
    const storeId = 'store-uuid-1';
    const couponId = 'coupon-uuid-1';
    const userId = 'shop-owner-uuid';

    it('should reject if user is not store owner', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: 'other-user',
      });

      await expect(
        service.approveCoupon(
          storeId,
          couponId,
          userId,
          UserRole.SHOP_MANAGER,
          {
            discountType: DiscountType.PERCENTAGE,
            discountValue: 15,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invalid percentage (> 100 or <= 0)', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: userId,
      });
      mockPrisma.coupon.findFirst.mockResolvedValue({
        id: couponId,
        storeId,
        status: CouponStatus.PENDING_APPROVAL,
      });

      await expect(
        service.approveCoupon(
          storeId,
          couponId,
          userId,
          UserRole.SHOP_MANAGER,
          {
            discountType: DiscountType.PERCENTAGE,
            discountValue: 120,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve coupon and set status to ACTIVE with policy config', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: userId,
      });
      mockPrisma.coupon.findFirst.mockResolvedValue({
        id: couponId,
        storeId,
        codeNormalized: 'THANGVIP10',
        status: CouponStatus.PENDING_APPROVAL,
      });
      mockPrisma.coupon.update.mockResolvedValue({
        id: couponId,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
      });

      const result = await service.approveCoupon(
        storeId,
        couponId,
        userId,
        UserRole.SHOP_MANAGER,
        {
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
          maximumDiscountAmount: 50000,
          minimumOrderAmount: 200000,
          budgetTotal: 5000000,
          usageLimitTotal: 100,
        },
      );

      expect(result.coupon.status).toBe(CouponStatus.ACTIVE);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COUPON_APPROVED',
          }),
        }),
      );
    });

    it('should reject Shop attempting to assign PLATFORM_FUNDED or CO_FUNDED without Admin authority', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        ownerId: userId,
      });
      mockPrisma.coupon.findFirst.mockResolvedValue({
        id: couponId,
        storeId,
        status: CouponStatus.PENDING_APPROVAL,
      });

      await expect(
        service.approveCoupon(
          storeId,
          couponId,
          userId,
          UserRole.SHOP_MANAGER,
          {
            discountType: DiscountType.PERCENTAGE,
            discountValue: 15,
            fundingSource: CouponFundingSource.PLATFORM_FUNDED,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Section 19 & 20: validateCoupon', () => {
    const storeId = 'store-uuid-1';
    const prod1Id = 'prod-uuid-1';

    it('should throw COUPON_NOT_FOUND when coupon does not exist or is deleted', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCoupon({
          code: 'NONEXISTENT',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate percentage discount correctly with cap', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-1',
        codeNormalized: 'THANGVIP10',
        displayCode: 'THANGVIP10',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(20), // 20%
        maximumDiscountAmount: new Prisma.Decimal(50000), // Cap at 50k
        minimumOrderAmount: new Prisma.Decimal(100000),
        usageLimitTotal: 100,
        usageCount: 10,
        budgetTotal: new Prisma.Decimal(5000000),
        budgetUsed: new Prisma.Decimal(500000),
        scopeType: CouponScope.STORE_WIDE,
        startsAt: null,
        expiresAt: null,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: prod1Id,
          storeId,
          price: new Prisma.Decimal(400000), // 400k * 20% = 80k -> Capped at 50k
          isActive: true,
          isDeleted: false,
        },
      ]);

      const result = await service.validateCoupon({
        code: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(50000);
      expect(result.eligibleSubtotal).toBe(400000);
    });

    it('should calculate fixed amount discount correctly', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-2',
        codeNormalized: 'FIXED50K',
        displayCode: 'FIXED50K',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: new Prisma.Decimal(50000), // 50k
        maximumDiscountAmount: null,
        minimumOrderAmount: new Prisma.Decimal(100000),
        usageLimitTotal: null,
        usageCount: 0,
        budgetTotal: null,
        budgetUsed: new Prisma.Decimal(0),
        scopeType: CouponScope.STORE_WIDE,
        startsAt: null,
        expiresAt: null,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: prod1Id,
          storeId,
          price: new Prisma.Decimal(300000),
          isActive: true,
          isDeleted: false,
        },
      ]);

      const result = await service.validateCoupon({
        code: 'FIXED50K',
        items: [{ productId: prod1Id, quantity: 1 }],
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(50000);
    });

    it('should reject if minimum order amount is not met', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-3',
        codeNormalized: 'MINORDER',
        displayCode: 'MINORDER',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        minimumOrderAmount: new Prisma.Decimal(500000),
        usageLimitTotal: null,
        usageCount: 0,
        budgetTotal: null,
        budgetUsed: new Prisma.Decimal(0),
        scopeType: CouponScope.STORE_WIDE,
        startsAt: null,
        expiresAt: null,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: prod1Id,
          storeId,
          price: new Prisma.Decimal(200000), // 200k < 500k
          isActive: true,
          isDeleted: false,
        },
      ]);

      await expect(
        service.validateCoupon({
          code: 'MINORDER',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired coupon', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-expired',
        codeNormalized: 'EXPIRED10',
        displayCode: 'EXPIRED10',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        startsAt: new Date(Date.now() - 100000),
        expiresAt: new Date(Date.now() - 50000),
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      await expect(
        service.validateCoupon({
          code: 'EXPIRED10',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon when total usage limit is exhausted', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-limit',
        codeNormalized: 'LIMITOUT',
        displayCode: 'LIMITOUT',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        usageLimitTotal: 10,
        usageCount: 10,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      await expect(
        service.validateCoupon({
          code: 'LIMITOUT',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon when per-customer usage limit is exceeded', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-cust',
        codeNormalized: 'CUSTLIMIT',
        displayCode: 'CUSTLIMIT',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        usageLimitPerCustomer: 1,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      mockPrisma.couponRedemption.count.mockResolvedValue(1);

      await expect(
        service.validateCoupon({
          code: 'CUSTLIMIT',
          customerPhone: '0987654321',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject coupon when not stackable with product discount', async () => {
      mockPrisma.coupon.findUnique.mockResolvedValue({
        id: 'coupon-uuid-nostack',
        codeNormalized: 'NOSTACK',
        displayCode: 'NOSTACK',
        storeId,
        collaboratorId: 'collab-uuid-1',
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        stackableWithProductDiscount: false,
        store: { id: storeId, name: 'Sora Skin Official', isDeleted: false },
        couponProducts: [],
        couponCategories: [],
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: prod1Id,
          storeId,
          price: new Prisma.Decimal(100000),
          originalPrice: new Prisma.Decimal(150000),
          isActive: true,
          isDeleted: false,
        },
      ]);

      await expect(
        service.validateCoupon({
          code: 'NOSTACK',
          items: [{ productId: prod1Id, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Section 33: softDeleteCoupon', () => {
    it('should set status to DELETED with deletedAt and deletedBy', async () => {
      const collaboratorId = 'collab-uuid-1';
      const couponId = 'coupon-uuid-1';

      mockPrisma.coupon.findFirst.mockResolvedValue({
        id: couponId,
        collaboratorId,
        codeNormalized: 'THANGVIP10',
        status: CouponStatus.ACTIVE,
      });
      mockPrisma.coupon.update.mockResolvedValue({
        id: couponId,
        status: CouponStatus.DELETED,
      });

      const result = await service.softDeleteCoupon(collaboratorId, couponId, {
        reason: 'Kết thúc chiến dịch',
      });

      expect(result.coupon.status).toBe(CouponStatus.DELETED);
      expect(mockPrisma.coupon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: couponId },
          data: expect.objectContaining({
            status: CouponStatus.DELETED,
            deletedBy: collaboratorId,
            deleteReason: 'Kết thúc chiến dịch',
          }),
        }),
      );
    });
  });
});

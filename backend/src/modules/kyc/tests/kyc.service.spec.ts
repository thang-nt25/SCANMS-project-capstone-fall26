import { BadRequestException } from '@nestjs/common';
import { ShopOnboardingStatus, UserRole } from '@prisma/client';
import { KycService } from '../kyc.service';

describe('KycService shop onboarding', () => {
  let service: KycService;
  let prisma: any;

  const application = {
    shopName: 'Shop thử nghiệm',
    description: 'Gian hàng thử nghiệm',
    warehouseAddress: 'Số 1, Quận 1, TP.HCM',
    businessType: 'ENTERPRISE',
    taxCode: '0312345678',
    businessLicenseUrl: 'https://cdn.scanms.vn/license.jpg',
    contactPhone: '0901234567',
    contactEmail: 'shop@example.vn',
    bankName: 'Vietcombank',
    bankAccountNumber: '123456789',
    bankAccountName: 'SHOP THU NGHIEM',
    idCardNumber: '001201012345',
    frontCardUrl: 'https://cdn.scanms.vn/id-front.jpg',
    backCardUrl: 'https://cdn.scanms.vn/id-back.jpg',
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn(), update: jest.fn() },
      store: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      wallet: { findUnique: jest.fn(), create: jest.fn() },
      storeWallet: { findUnique: jest.fn(), create: jest.fn() },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    service = new KycService(prisma);
  });

  it('requires representative ID photos and business license before submission', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'owner-1', stores: [] });

    await expect(
      service.applyShopUpgrade('owner-1', {
        ...application,
        frontCardUrl: '',
      } as any),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.store.create).not.toHaveBeenCalled();
  });

  it('creates a pending, inactive Shop application with separate onboarding documents', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'owner-1', stores: [] });
    prisma.store.create.mockResolvedValue({ id: 'store-1', ...application });

    await service.applyShopUpgrade('owner-1', application as any);

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingStatus: ShopOnboardingStatus.PENDING_APPROVAL,
          onboardingSubmittedAt: expect.any(Date),
          isVerified: false,
          isActive: false,
          onboardingData: expect.objectContaining({
            idCardNumber: application.idCardNumber,
            frontCardUrl: application.frontCardUrl,
            backCardUrl: application.backCardUrl,
            businessLicenseUrl: application.businessLicenseUrl,
          }),
        }),
      }),
    );
  });

  it('stores a request for more information and notifies the Shop owner', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      ownerId: 'owner-1',
      name: 'Shop thử nghiệm',
      onboardingStatus: ShopOnboardingStatus.PENDING_APPROVAL,
      owner: { id: 'owner-1', role: UserRole.CUSTOMER },
    });
    prisma.store.update.mockResolvedValue({ id: 'store-1' });

    await service.reviewShopApplication('manager-1', 'store-1', {
      status: 'NEEDS_INFO',
      note: 'Ảnh CCCD mặt trước chưa rõ, vui lòng tải lại.',
    });

    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingStatus: ShopOnboardingStatus.NEEDS_INFO,
          onboardingReviewedById: 'manager-1',
          onboardingReviewNote: 'Ảnh CCCD mặt trước chưa rõ, vui lòng tải lại.',
          isVerified: false,
          isActive: false,
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'owner-1',
          type: 'SHOP_NEEDS_INFO',
          message: 'Ảnh CCCD mặt trước chưa rõ, vui lòng tải lại.',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'manager-1',
        action: 'SHOP_ONBOARDING_REVIEWED',
        details: expect.objectContaining({ storeId: 'store-1', status: 'NEEDS_INFO' }),
      }),
    }));
  });

  it('activates a Shop and promotes its owner only after Admin approval', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      ownerId: 'owner-1',
      name: 'Shop thử nghiệm',
      onboardingStatus: ShopOnboardingStatus.PENDING_APPROVAL,
      owner: { id: 'owner-1', role: UserRole.CUSTOMER },
    });
    prisma.store.update.mockResolvedValue({ id: 'store-1' });
    prisma.wallet.findUnique.mockResolvedValue(null);
    prisma.wallet.create.mockResolvedValue({ id: 'wallet-1' });
    prisma.storeWallet.findUnique.mockResolvedValue(null);

    await service.reviewShopApplication('manager-1', 'store-1', { status: 'VERIFIED' });

    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingStatus: ShopOnboardingStatus.VERIFIED,
          onboardingReviewedById: 'manager-1',
          isVerified: true,
          isActive: true,
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'owner-1' },
      data: { role: UserRole.SHOP_MANAGER },
    });
    expect(prisma.storeWallet.create).toHaveBeenCalled();
  });

  it('does not approve a Shop unless it is waiting for review or more information', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 'store-1',
      onboardingStatus: ShopOnboardingStatus.VERIFIED,
      owner: { id: 'owner-1', role: UserRole.SHOP_MANAGER },
    });

    await expect(
      service.reviewShopApplication('manager-1', 'store-1', { status: 'VERIFIED' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.store.update).not.toHaveBeenCalled();
  });
});

describe('KycService KOL identity documents', () => {
  const prisma = {} as any;
  const service = new KycService(prisma);

  it('rejects KOL applications without both ID card photos before saving a profile', async () => {
    await expect(
      service.applyKolUpgrade('kol-1', {
        frontCardUrl: 'https://cdn.scanms.vn/id-front.jpg',
        backCardUrl: ' ',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

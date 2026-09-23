import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import {
  ApplyKolUpgradeDto,
  ApplyShopUpgradeDto,
  ReviewUpgradeApplicationDto,
} from './dto/apply-upgrade.dto';
import { KycStatus, UserRole, SocialPlatform } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy hồ sơ KYC của chính KOL
   */
  async getMyKyc(userId: string) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            role: true,
            socialChannels: true,
          },
        },
        tier: true,
      },
    });

    return profile;
  }

  /**
   * KOL nộp hồ sơ KYC (CCCD, Ngân hàng)
   */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    let profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId },
    });

    const existingMeta = (profile?.socialLinksJson as any) || {};
    const updatedMeta = {
      ...existingMeta,
      ...(dto.frontCardUrl ? { frontCardUrl: dto.frontCardUrl } : {}),
      ...(dto.backCardUrl ? { backCardUrl: dto.backCardUrl } : {}),
    };

    if (!profile) {
      profile = await this.prisma.collaboratorProfile.create({
        data: {
          userId,
          idCardNumber: dto.idCardNumber.trim(),
          taxCode: dto.taxCode?.trim() || null,
          bankName: dto.bankName.trim(),
          bankAccountNumber: dto.bankAccountNumber.trim(),
          bankAccountName: dto.bankAccountName.trim().toUpperCase(),
          bio: dto.bio?.trim() || null,
          socialLinksJson: updatedMeta,
          kycStatus: KycStatus.UNVERIFIED,
        },
      });
    } else {
      profile = await this.prisma.collaboratorProfile.update({
        where: { userId },
        data: {
          idCardNumber: dto.idCardNumber.trim(),
          taxCode: dto.taxCode?.trim() || null,
          bankName: dto.bankName.trim(),
          bankAccountNumber: dto.bankAccountNumber.trim(),
          bankAccountName: dto.bankAccountName.trim().toUpperCase(),
          bio: dto.bio?.trim(),
          socialLinksJson: updatedMeta,
          kycStatus: KycStatus.UNVERIFIED,
        },
      });
    }

    return {
      message: 'Hồ sơ KYC đã được nộp thành công! Hệ thống sẽ xem xét và phê duyệt.',
      profile,
    };
  }

  /**
   * Khách Hàng nộp đơn nâng cấp tài khoản lên KOL
   */
  async applyKolUpgrade(userId: string, dto: ApplyKolUpgradeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { collaboratorProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const proofData = {
      platform: dto.platform,
      channelName: dto.channelName.trim(),
      channelUrl: dto.channelUrl.trim(),
      followerCount: Number(dto.followerCount) || 0,
      channelProofUrl: dto.channelProofUrl || null,
      frontCardUrl: dto.frontCardUrl || null,
      backCardUrl: dto.backCardUrl || null,
      submittedAt: new Date().toISOString(),
    };

    // 1. Upsert CollaboratorProfile
    const profile = await this.prisma.collaboratorProfile.upsert({
      where: { userId },
      create: {
        userId,
        idCardNumber: dto.idCardNumber.trim(),
        taxCode: dto.taxCode?.trim() || null,
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
        bio: dto.bio?.trim() || null,
        socialLinksJson: proofData,
        totalFollowers: Number(dto.followerCount) || 0,
        kycStatus: KycStatus.UNVERIFIED,
      },
      update: {
        idCardNumber: dto.idCardNumber.trim(),
        taxCode: dto.taxCode?.trim() || null,
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
        bio: dto.bio?.trim() || null,
        socialLinksJson: proofData,
        totalFollowers: Number(dto.followerCount) || 0,
        kycStatus: KycStatus.UNVERIFIED,
      },
    });

    // 2. Tạo/cập nhật kênh mạng xã hội chính
    const existingChannel = await this.prisma.collaboratorSocialChannel.findFirst({
      where: { collaboratorId: userId, platformName: dto.platform },
    });

    if (existingChannel) {
      await this.prisma.collaboratorSocialChannel.update({
        where: { id: existingChannel.id },
        data: {
          channelName: dto.channelName.trim(),
          channelUrl: dto.channelUrl.trim(),
          followerCount: Number(dto.followerCount) || 0,
          isPrimary: true,
        },
      });
    } else {
      await this.prisma.collaboratorSocialChannel.create({
        data: {
          collaboratorId: userId,
          platformName: dto.platform,
          channelName: dto.channelName.trim(),
          channelUrl: dto.channelUrl.trim(),
          followerCount: Number(dto.followerCount) || 0,
          isPrimary: true,
        },
      });
    }

    return {
      success: true,
      message: 'Đơn đăng ký nâng cấp KOL đã được gửi thành công. Quản trị viên SCANMS sẽ xét duyệt trong vòng 24 giờ.',
      profile,
    };
  }

  /**
   * Khách Hàng nộp đơn nâng cấp mở Gian Hàng (Shop Manager)
   */
  async applyShopUpgrade(userId: string, dto: ApplyShopUpgradeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stores: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const baseSlug = slugify(dto.shopName) || 'shop';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const legalDocs = {
      businessType: dto.businessType,
      taxCode: dto.taxCode.trim(),
      businessLicenseUrl: dto.businessLicenseUrl || null,
      brandAuthorizationUrl: dto.brandAuthorizationUrl || null,
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail.trim(),
      submittedAt: new Date().toISOString(),
    };

    let store;
    if (user.stores && user.stores.length > 0) {
      // Update existing store
      store = await this.prisma.store.update({
        where: { id: user.stores[0].id },
        data: {
          name: dto.shopName.trim(),
          description: dto.description?.trim() || null,
          policyShipping: dto.warehouseAddress.trim(),
          policyReturn: JSON.stringify(legalDocs),
          isVerified: false,
        },
      });
    } else {
      // Create new store
      store = await this.prisma.store.create({
        data: {
          ownerId: userId,
          name: dto.shopName.trim(),
          slug: uniqueSlug,
          description: dto.description?.trim() || null,
          policyShipping: dto.warehouseAddress.trim(),
          policyReturn: JSON.stringify(legalDocs),
          isVerified: false,
          isActive: true,
        },
      });
    }

    return {
      success: true,
      message: 'Hồ sơ mở Gian Hàng đã được gửi thành công. Ban Quản Trị SCANMS sẽ thẩm định giấy phép kinh doanh & kho hàng theo Nghị định 85/2021/NĐ-CP.',
      store,
    };
  }

  /**
   * Khách hàng lấy trạng thái các đơn xin nâng cấp của mình
   */
  async getMyUpgradeStatus(userId: string) {
    const [kolProfile, userStores, user] = await Promise.all([
      this.prisma.collaboratorProfile.findUnique({
        where: { userId },
        include: {
          tier: true,
          user: {
            include: { socialChannels: true },
          },
        },
      }),
      this.prisma.store.findMany({
        where: { ownerId: userId, isDeleted: false },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true, fullName: true },
      }),
    ]);

    return {
      userRole: user?.role || 'CUSTOMER',
      kolApplication: kolProfile
        ? {
            id: kolProfile.id,
            status: kolProfile.kycStatus,
            tier: kolProfile.tier?.name,
            totalFollowers: kolProfile.totalFollowers,
            socialLinksJson: kolProfile.socialLinksJson,
            submittedAt: kolProfile.createdAt,
            updatedAt: kolProfile.updatedAt,
          }
        : null,
      shopApplication:
        userStores && userStores.length > 0
          ? {
              id: userStores[0].id,
              name: userStores[0].name,
              slug: userStores[0].slug,
              isVerified: userStores[0].isVerified,
              warehouseAddress: userStores[0].policyShipping,
              submittedAt: userStores[0].createdAt,
              updatedAt: userStores[0].updatedAt,
            }
          : null,
    };
  }

  /**
   * Lấy danh sách hồ sơ KYC chờ duyệt (Dành cho Admin / Shop)
   */
  async getPendingKycList() {
    return this.prisma.collaboratorProfile.findMany({
      where: {
        idCardNumber: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            createdAt: true,
            role: true,
            socialChannels: true,
          },
        },
        tier: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Lấy danh sách tổng hợp tất cả các đơn xin nâng cấp (KOL và Gian Hàng Shop)
   */
  async getUpgradeApplications() {
    const [kolApplications, shopApplications] = await Promise.all([
      this.prisma.collaboratorProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              role: true,
              socialChannels: true,
              createdAt: true,
            },
          },
          tier: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.store.findMany({
        where: { isDeleted: false },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      kolApplications,
      shopApplications,
    };
  }

  /**
   * Admin duyệt hồ sơ KOL
   */
  async reviewKolApplication(profileId: string, dto: ReviewUpgradeApplicationDto) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ đối tác');
    }

    const updatedProfile = await this.prisma.collaboratorProfile.update({
      where: { id: profileId },
      data: {
        kycStatus: dto.status === 'VERIFIED' ? KycStatus.VERIFIED : KycStatus.REJECTED,
      },
    });

    if (dto.status === 'VERIFIED') {
      // 1. Nâng quyền user nếu đang là CUSTOMER
      if (profile.user.role === UserRole.CUSTOMER) {
        await this.prisma.user.update({
          where: { id: profile.userId },
          data: { role: UserRole.COLLABORATOR },
        });
      }

      // 2. Đảm bảo ví hoa hồng đã tồn tại
      const existingWallet = await this.prisma.wallet.findUnique({
        where: { collaboratorId: profile.userId },
      });
      if (!existingWallet) {
        await this.prisma.wallet.create({
          data: {
            collaboratorId: profile.userId,
            availableBalance: 0,
            pendingBalance: 0,
          },
        });
      }

      // 3. Thông báo cho người dùng
      await this.prisma.notification.create({
        data: {
          userId: profile.userId,
          title: 'Chúc mừng! Bạn đã trở thành Đối tác KOL chính thức',
          message: 'Hồ sơ đối tác sáng tạo nội dung & liên kết tiếp thị của bạn đã được Admin SCANMS phê duyệt cấp Tích Xanh.',
          type: 'KOL_APPROVED',
        },
      });
    } else {
      await this.prisma.notification.create({
        data: {
          userId: profile.userId,
          title: 'Hồ sơ đối tác KOL cần cập nhật thêm',
          message: dto.note || 'Hồ sơ nâng cấp KOL chưa đáp ứng đủ tiêu chí xác thực kênh. Vui lòng nộp lại thông tin chính xác.',
          type: 'KOL_REJECTED',
        },
      });
    }

    return {
      success: true,
      message: `Đã ${dto.status === 'VERIFIED' ? 'phê duyệt' : 'từ chối'} hồ sơ KOL thành công`,
      profile: updatedProfile,
    };
  }

  /**
   * Admin duyệt hồ sơ Gian Hàng (Shop)
   */
  async reviewShopApplication(storeId: string, dto: ReviewUpgradeApplicationDto) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy gian hàng');
    }

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        isVerified: dto.status === 'VERIFIED',
      },
    });

    if (dto.status === 'VERIFIED') {
      // 1. Nâng quyền chủ shop nếu đang là CUSTOMER
      if (store.owner.role === UserRole.CUSTOMER) {
        await this.prisma.user.update({
          where: { id: store.ownerId },
          data: { role: UserRole.SHOP_MANAGER },
        });
      }

      // 2. Đảm bảo tạo ví chủ sở hữu & ví gian hàng
      let ownerWallet = await this.prisma.wallet.findUnique({
        where: { collaboratorId: store.ownerId },
      });
      if (!ownerWallet) {
        ownerWallet = await this.prisma.wallet.create({
          data: {
            collaboratorId: store.ownerId,
            availableBalance: 0,
            pendingBalance: 0,
          },
        });
      }

      const existingStoreWallet = await this.prisma.storeWallet.findUnique({
        where: {
          walletId_storeId: {
            walletId: ownerWallet.id,
            storeId: store.id,
          },
        },
      });
      if (!existingStoreWallet) {
        await this.prisma.storeWallet.create({
          data: {
            walletId: ownerWallet.id,
            storeId: store.id,
            availableBalance: 0,
            pendingBalance: 0,
          },
        });
      }

      // 3. Thông báo cho chủ shop
      await this.prisma.notification.create({
        data: {
          userId: store.ownerId,
          title: 'Gian Hàng của bạn đã được chứng thực!',
          message: `Gian hàng "${store.name}" đã được Ban Quản Trị SCANMS cấp Tích Xanh & kích hoạt giấy phép kinh doanh theo quy định.`,
          type: 'SHOP_APPROVED',
        },
      });
    } else {
      await this.prisma.notification.create({
        data: {
          userId: store.ownerId,
          title: 'Hồ sơ mở Gian Hàng cần bổ sung',
          message: dto.note || 'Giấy phép đăng ký kinh doanh hoặc địa chỉ kho hàng chưa đạt yêu cầu theo Nghị định 85/2021/NĐ-CP.',
          type: 'SHOP_REJECTED',
        },
      });
    }

    return {
      success: true,
      message: `Đã ${dto.status === 'VERIFIED' ? 'chứng thực Tích Xanh' : 'từ chối'} gian hàng thành công`,
      store: updatedStore,
    };
  }

  /**
   * Phê duyệt hoặc từ chối KYC cũ
   */
  async reviewKyc(profileId: string, dto: ReviewKycDto) {
    return this.reviewKolApplication(profileId, {
      status: dto.status === KycStatus.VERIFIED ? 'VERIFIED' : 'REJECTED',
    });
  }
}

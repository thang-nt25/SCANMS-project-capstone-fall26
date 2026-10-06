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
  ReviewShopApplicationDto,
} from './dto/apply-upgrade.dto';
import {
  KycStatus,
  UserRole,
  SocialPlatform,
  ShopOnboardingStatus,
} from '@prisma/client';

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
      ...(dto.channelProofUrl ? { channelProofUrl: dto.channelProofUrl } : {}),
      ...(dto.platform ? { platform: dto.platform } : {}),
      ...(dto.channelName ? { channelName: dto.channelName.trim() } : {}),
      ...(dto.channelUrl ? { channelUrl: dto.channelUrl.trim() } : {}),
      ...(dto.followerCount !== undefined
        ? { followerCount: Number(dto.followerCount) }
        : {}),
      submittedAt: new Date().toISOString(),
    };

    if (!profile) {
      profile = await this.prisma.collaboratorProfile.create({
        data: {
          userId,
          idCardNumber: dto.idCardNumber.trim(),
          taxCode: dto.taxCode?.trim() || null,
          bankName: dto.bankName?.trim() || '',
          bankAccountNumber: dto.bankAccountNumber?.trim() || '',
          bankAccountName: dto.bankAccountName?.trim().toUpperCase() || '',
          bio: dto.bio?.trim() || null,
          socialLinksJson: updatedMeta,
          totalFollowers:
            dto.followerCount !== undefined ? Number(dto.followerCount) : 0,
          kycStatus: KycStatus.UNVERIFIED,
        },
      });
    } else {
      const targetStatus =
        profile.kycStatus === KycStatus.VERIFIED
          ? KycStatus.VERIFIED
          : KycStatus.UNVERIFIED;
      profile = await this.prisma.collaboratorProfile.update({
        where: { userId },
        data: {
          idCardNumber: dto.idCardNumber.trim(),
          taxCode: dto.taxCode?.trim() || null,
          bankName:
            dto.bankName !== undefined ? dto.bankName.trim() : profile.bankName,
          bankAccountNumber:
            dto.bankAccountNumber !== undefined
              ? dto.bankAccountNumber.trim()
              : profile.bankAccountNumber,
          bankAccountName:
            dto.bankAccountName !== undefined
              ? dto.bankAccountName.trim().toUpperCase()
              : profile.bankAccountName,
          bio: dto.bio?.trim(),
          socialLinksJson: updatedMeta,
          ...(dto.followerCount !== undefined
            ? { totalFollowers: Number(dto.followerCount) }
            : {}),
          kycStatus: targetStatus,
        },
      });
    }

    // Tự động đồng bộ vào danh mục Kênh Mạng Xã Hội (FR-07)
    if (dto.platform && dto.channelUrl) {
      const platformEnum = dto.platform as SocialPlatform;
      const existingChannel =
        await this.prisma.collaboratorSocialChannel.findFirst({
          where: { collaboratorId: userId, platformName: platformEnum },
        });

      if (existingChannel) {
        await this.prisma.collaboratorSocialChannel.update({
          where: { id: existingChannel.id },
          data: {
            channelName: dto.channelName?.trim() || existingChannel.channelName,
            channelUrl: dto.channelUrl.trim(),
            followerCount:
              dto.followerCount !== undefined
                ? Number(dto.followerCount)
                : existingChannel.followerCount,
            isPrimary: true,
          },
        });
      } else {
        await this.prisma.collaboratorSocialChannel.create({
          data: {
            collaboratorId: userId,
            platformName: platformEnum,
            channelName: dto.channelName?.trim() || `${dto.platform} Creator`,
            channelUrl: dto.channelUrl.trim(),
            followerCount:
              dto.followerCount !== undefined ? Number(dto.followerCount) : 0,
            isPrimary: true,
          },
        });
      }
    }

    return {
      message:
        'Hồ sơ KYC đã được nộp thành công! Hệ thống sẽ xem xét và phê duyệt.',
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

    const incomingChannels =
      dto.channels && dto.channels.length > 0
        ? dto.channels
        : dto.platform && dto.channelUrl
          ? [
              {
                platform: dto.platform,
                channelName: dto.channelName || '',
                channelUrl: dto.channelUrl,
                followerCount: Number(dto.followerCount) || 0,
                channelProofUrl: dto.channelProofUrl || '',
                isPrimary: true,
              },
            ]
          : [];

    if (incomingChannels.length === 0) {
      throw new BadRequestException(
        'Vui lòng thêm ít nhất một kênh mạng xã hội',
      );
    }

    const totalFollowers = incomingChannels.reduce(
      (sum, ch) => sum + (Number(ch.followerCount) || 0),
      0,
    );
    const primaryChannel =
      incomingChannels.find((ch) => ch.isPrimary) || incomingChannels[0];

    const proofData = {
      platform: primaryChannel.platform,
      channelName: primaryChannel.channelName.trim(),
      channelUrl: primaryChannel.channelUrl.trim(),
      followerCount: Number(primaryChannel.followerCount) || 0,
      channelProofUrl: primaryChannel.channelProofUrl || null,
      channels: incomingChannels.map((ch) => ({
        platform: ch.platform,
        channelName: ch.channelName.trim(),
        channelUrl: ch.channelUrl.trim(),
        followerCount: Number(ch.followerCount) || 0,
        channelProofUrl: ch.channelProofUrl || null,
        isPrimary: Boolean(ch.isPrimary || ch === primaryChannel),
      })),
      specialtyCategories: dto.specialtyCategories || [],
      contentStyles: dto.contentStyles || [],
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
        totalFollowers,
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
        totalFollowers,
        kycStatus: KycStatus.UNVERIFIED,
      },
    });

    // 2. Tạo/cập nhật tất cả kênh mạng xã hội của KOL
    for (let i = 0; i < incomingChannels.length; i++) {
      const ch = incomingChannels[i];
      const isPrimary = Boolean(
        ch.isPrimary || (i === 0 && !incomingChannels.some((c) => c.isPrimary)),
      );
      const existingChannel =
        await this.prisma.collaboratorSocialChannel.findFirst({
          where: { collaboratorId: userId, platformName: ch.platform },
        });

      if (existingChannel) {
        await this.prisma.collaboratorSocialChannel.update({
          where: { id: existingChannel.id },
          data: {
            channelName: ch.channelName.trim(),
            channelUrl: ch.channelUrl.trim(),
            followerCount: Number(ch.followerCount) || 0,
            isPrimary,
          },
        });
      } else {
        await this.prisma.collaboratorSocialChannel.create({
          data: {
            collaboratorId: userId,
            platformName: ch.platform,
            channelName: ch.channelName.trim(),
            channelUrl: ch.channelUrl.trim(),
            followerCount: Number(ch.followerCount) || 0,
            isPrimary,
          },
        });
      }
    }

    return {
      success: true,
      message:
        'Đơn đăng ký nâng cấp KOL đã được gửi thành công. Quản trị viên SCANMS sẽ xét duyệt trong vòng 24 giờ.',
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

    if (
      !dto.idCardNumber?.trim() ||
      !dto.frontCardUrl?.trim() ||
      !dto.backCardUrl?.trim() ||
      !dto.businessLicenseUrl?.trim()
    ) {
      throw new BadRequestException(
        'Hồ sơ bắt buộc có số CCCD, ảnh hai mặt CCCD người đại diện và giấy phép đăng ký kinh doanh.',
      );
    }

    const existingStore = user.stores.find((item) => !item.isDeleted);
    if (
      existingStore &&
      !(<ShopOnboardingStatus[]>[
        ShopOnboardingStatus.DRAFT,
        ShopOnboardingStatus.NEEDS_INFO,
        ShopOnboardingStatus.REJECTED,
      ]).includes(existingStore.onboardingStatus)
    ) {
      throw new BadRequestException(
        existingStore.onboardingStatus === ShopOnboardingStatus.VERIFIED
          ? 'Gian hàng đã được xác minh.'
          : 'Hồ sơ đang chờ Ban Quản Trị xử lý, vui lòng chờ kết quả trước khi gửi lại.',
      );
    }

    const baseSlug = slugify(dto.shopName) || 'shop';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const submittedAt = new Date();

    const legalDocs = {
      representativeName:
        user.fullName?.trim() || dto.bankAccountName.trim().toUpperCase(),
      businessType: dto.businessType,
      taxCode: dto.taxCode.trim(),
      bankName: dto.bankName.trim(),
      bankAccountNumber: dto.bankAccountNumber.trim(),
      bankAccountName: dto.bankAccountName.trim().toUpperCase(),
      idCardNumber: dto.idCardNumber?.trim() || null,
      frontCardUrl: dto.frontCardUrl || null,
      backCardUrl: dto.backCardUrl || null,
      businessLicenseUrl: dto.businessLicenseUrl || null,
      brandAuthorizationUrl: dto.brandAuthorizationUrl || null,
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail.trim(),
      warehouseAddress: dto.warehouseAddress.trim(),
      submittedAt: submittedAt.toISOString(),
    };

    let store;
    if (existingStore) {
      store = await this.prisma.store.update({
        where: { id: existingStore.id },
        data: {
          name: dto.shopName.trim(),
          description: dto.description?.trim() || null,
          onboardingData: legalDocs,
          onboardingStatus: ShopOnboardingStatus.PENDING_APPROVAL,
          onboardingSubmittedAt: submittedAt,
          onboardingReviewedAt: null,
          onboardingReviewedById: null,
          onboardingReviewNote: null,
          isVerified: false,
          isActive: false,
        },
      });
    } else {
      store = await this.prisma.store.create({
        data: {
          ownerId: userId,
          name: dto.shopName.trim(),
          slug: uniqueSlug,
          description: dto.description?.trim() || null,
          onboardingData: legalDocs,
          onboardingStatus: ShopOnboardingStatus.PENDING_APPROVAL,
          onboardingSubmittedAt: submittedAt,
          isVerified: false,
          isActive: false,
        },
      });
    }

    return {
      success: true,
      message:
        'Hồ sơ mở Gian Hàng đã được gửi thành công. Ban Quản Trị SCANMS sẽ thẩm định giấy phép kinh doanh & kho hàng theo Nghị định 85/2021/NĐ-CP.',
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
            channels: kolProfile.user?.socialChannels || [],
            submittedAt: kolProfile.createdAt,
            updatedAt: kolProfile.updatedAt,
          }
        : null,
      shopApplication:
        userStores && userStores.length > 0
          ? {
              id: userStores[0].id,
              name: userStores[0].name,
              description: userStores[0].description,
              slug: userStores[0].slug,
              isVerified: userStores[0].isVerified,
              onboardingStatus: userStores[0].onboardingStatus,
              onboardingData: userStores[0].onboardingData,
              onboardingSubmittedAt: userStores[0].onboardingSubmittedAt,
              onboardingReviewedAt: userStores[0].onboardingReviewedAt,
              onboardingReviewNote: userStores[0].onboardingReviewNote,
              warehouseAddress:
                ((userStores[0].onboardingData as Record<string, any> | null)
                  ?.warehouseAddress as string | undefined) ||
                userStores[0].policyShipping,
              submittedAt:
                userStores[0].onboardingSubmittedAt || userStores[0].createdAt,
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
        where: {
          isDeleted: false,
          onboardingStatus: { not: ShopOnboardingStatus.DRAFT },
        },
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
          onboardingReviewer: {
            select: { id: true, fullName: true, email: true },
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
  async reviewKolApplication(
    profileId: string,
    dto: ReviewUpgradeApplicationDto,
  ) {
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
        kycStatus:
          dto.status === 'VERIFIED' ? KycStatus.VERIFIED : KycStatus.REJECTED,
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
          message:
            'Hồ sơ đối tác sáng tạo nội dung & liên kết tiếp thị của bạn đã được Admin SCANMS phê duyệt cấp Tích Xanh.',
          type: 'KOL_APPROVED',
        },
      });
    } else {
      await this.prisma.notification.create({
        data: {
          userId: profile.userId,
          title: 'Hồ sơ đối tác KOL cần cập nhật thêm',
          message:
            dto.note ||
            'Hồ sơ nâng cấp KOL chưa đáp ứng đủ tiêu chí xác thực kênh. Vui lòng nộp lại thông tin chính xác.',
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
  async reviewShopApplication(
    reviewerId: string,
    storeId: string,
    dto: ReviewShopApplicationDto,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy gian hàng');
    }

    if (
      !(<ShopOnboardingStatus[]>[
        ShopOnboardingStatus.PENDING_APPROVAL,
        ShopOnboardingStatus.NEEDS_INFO,
      ]).includes(store.onboardingStatus)
    ) {
      throw new BadRequestException(
        'Chỉ có thể xử lý hồ sơ đang chờ duyệt hoặc chờ bổ sung.',
      );
    }

    if (dto.status !== 'VERIFIED' && !dto.note?.trim()) {
      throw new BadRequestException(
        'Vui lòng ghi rõ lý do từ chối hoặc nội dung cần Shop bổ sung.',
      );
    }

    const updatedStore = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM stores WHERE id = ${storeId}::uuid FOR UPDATE`;
      const current = await tx.store.findUnique({
        where: { id: storeId },
        include: { owner: true },
      });
      if (!current) throw new NotFoundException('Không tìm thấy gian hàng');
      if (
        !(<ShopOnboardingStatus[]>[
          ShopOnboardingStatus.PENDING_APPROVAL,
          ShopOnboardingStatus.NEEDS_INFO,
        ]).includes(current.onboardingStatus)
      ) {
        throw new BadRequestException(
          'Hồ sơ đã được xử lý bởi một quản trị viên khác.',
        );
      }

      const reviewedAt = new Date();
      const updated = await tx.store.update({
        where: { id: storeId },
        data: {
          isVerified: dto.status === 'VERIFIED',
          isActive: dto.status === 'VERIFIED',
          onboardingStatus: dto.status,
          onboardingReviewedAt: reviewedAt,
          onboardingReviewedById: reviewerId,
          onboardingReviewNote: dto.note?.trim() || null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'SHOP_ONBOARDING_REVIEWED',
          details: {
            storeId,
            ownerId: current.ownerId,
            previousStatus: current.onboardingStatus,
            status: dto.status,
            note: dto.note?.trim() || null,
          },
        },
      });

      if (dto.status === 'VERIFIED') {
        if (current.owner.role === UserRole.CUSTOMER) {
          await tx.user.update({
            where: { id: current.ownerId },
            data: { role: UserRole.SHOP_MANAGER },
          });
        }
        let ownerWallet = await tx.wallet.findUnique({
          where: { collaboratorId: current.ownerId },
        });
        if (!ownerWallet) {
          ownerWallet = await tx.wallet.create({
            data: {
              collaboratorId: current.ownerId,
              availableBalance: 0,
              pendingBalance: 0,
            },
          });
        }
        const existingStoreWallet = await tx.storeWallet.findUnique({
          where: {
            walletId_storeId: { walletId: ownerWallet.id, storeId: current.id },
          },
        });
        if (!existingStoreWallet) {
          await tx.storeWallet.create({
            data: {
              walletId: ownerWallet.id,
              storeId: current.id,
              availableBalance: 0,
              pendingBalance: 0,
            },
          });
        }
        await tx.notification.create({
          data: {
            userId: current.ownerId,
            title: 'Gian hàng của bạn đã được chứng thực!',
            message: `Gian hàng "${current.name}" đã được Ban Quản Trị SCANMS xác minh và kích hoạt.`,
            type: 'SHOP_APPROVED',
          },
        });
      } else {
        await tx.notification.create({
          data: {
            userId: current.ownerId,
            title:
              dto.status === 'NEEDS_INFO'
                ? 'Hồ sơ gian hàng cần bổ sung'
                : 'Hồ sơ gian hàng chưa được duyệt',
            message: dto.note!.trim(),
            type:
              dto.status === 'NEEDS_INFO' ? 'SHOP_NEEDS_INFO' : 'SHOP_REJECTED',
          },
        });
      }
      return updated;
    });

    return {
      success: true,
      message:
        dto.status === 'VERIFIED'
          ? 'Gian hàng đã được xác minh và kích hoạt.'
          : dto.status === 'NEEDS_INFO'
            ? 'Đã yêu cầu Shop bổ sung hồ sơ.'
            : 'Đã từ chối hồ sơ gian hàng.',
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SampleRequestStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MediaService } from '../media/media.service';
import { GhnService } from '../shipping/ghn.service';
import { normalizeSamplePhone, SAMPLE_PHONE_PATTERN, SAMPLE_PHONE_ERROR } from './sample-phone';
import {
  CreateSampleRequestDto,
  UpdateSampleRequestDto,
  AdminResolveSampleRequestDto,
  ReportSampleDeliveryIssueDto,
  RejectSampleRequestDto,
  ShipSampleRequestDto,
  SubmitSampleVideoDto,
} from './dto/sample-request.dto';

const SAMPLE_COMMITMENT_DAYS = 14;
const ACTIVE_SAMPLE_STATUSES: SampleRequestStatus[] = [
  SampleRequestStatus.PENDING,
  SampleRequestStatus.APPROVED,
  SampleRequestStatus.SHIPPED,
  SampleRequestStatus.RECEIVED,
  SampleRequestStatus.VIDEO_SUBMITTED,
  SampleRequestStatus.REVISION_REQUIRED,
  SampleRequestStatus.OVERDUE,
  SampleRequestStatus.DELIVERY_ISSUE,
];

@Injectable()
export class SamplesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly ghnService: GhnService,
  ) {}

  async getMyEligibility(collaboratorId: string) {
    const [user, profile, channels] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: collaboratorId },
        select: { isActive: true },
      }),
      this.prisma.collaboratorProfile.findUnique({
        where: { userId: collaboratorId },
        select: {
          kycStatus: true,
          sampleRequestsBlockedAt: true,
          sampleRequestsBlockReason: true,
        },
      }),
      this.prisma.collaboratorSocialChannel.findMany({
        where: { collaboratorId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          platformName: true,
          channelName: true,
          channelUrl: true,
          followerCount: true,
          isPrimary: true,
        },
      }),
    ]);
    const overdueRequests = await this.prisma.sampleProductRequest.findMany({
      where: {
        collaboratorId,
        overdueAt: { not: null },
        status: SampleRequestStatus.OVERDUE,
      },
      select: {
        id: true,
        product: { select: { title: true } },
        deadlineAt: true,
      },
    });
    const blocked = Boolean(profile?.sampleRequestsBlockedAt);
    return {
      canRequest: Boolean(
        user?.isActive &&
        profile?.kycStatus === 'VERIFIED' &&
        channels.length > 0 &&
        !blocked,
      ),
      kycVerified: profile?.kycStatus === 'VERIFIED',
      hasSocialChannel: channels.length > 0,
      isBlocked: blocked,
      blockedAt: profile?.sampleRequestsBlockedAt ?? null,
      blockReason: blocked
        ? profile?.sampleRequestsBlockReason || 'Admin đã khóa quyền nhận mẫu.'
        : null,
      overdueRequests,
      channels,
      commitmentDays: SAMPLE_COMMITMENT_DAYS,
    };
  }

  private async validateRecipientAddress(dto: CreateSampleRequestDto | UpdateSampleRequestDto) {
    const recipientName = typeof dto.recipientName === 'string' ? dto.recipientName.trim() : '';
    const shippingAddress = typeof dto.shippingAddress === 'string' ? dto.shippingAddress.trim() : '';
    if (recipientName.length < 2 || recipientName.length > 150 || !/[\p{L}\p{N}]/u.test(recipientName)) {
      throw new BadRequestException('Vui lòng nhập họ tên người nhận hợp lệ.');
    }
    if (shippingAddress.length < 10 || shippingAddress.length > 500) {
      throw new BadRequestException('Vui lòng nhập đầy đủ địa chỉ nhận hàng mẫu.');
    }
    const districts = await this.ghnService.getDistricts(dto.ghnProvinceId);
    const district = districts.find(item => item.DistrictID === dto.ghnDistrictId && item.ProvinceID === dto.ghnProvinceId);
    if (!district) throw new BadRequestException('Quận/huyện không thuộc tỉnh/thành đã chọn trên GHN.');
    const wards = await this.ghnService.getWards(dto.ghnDistrictId);
    const ward = wards.find(item => item.WardCode === dto.ghnWardCode && item.DistrictID === dto.ghnDistrictId);
    if (!ward) throw new BadRequestException('Phường/xã không thuộc quận/huyện đã chọn trên GHN.');
    const provinces = await this.ghnService.getProvinces();
    const province = provinces.find(item => item.ProvinceID === dto.ghnProvinceId);
    if (!province || !district.DistrictName || !ward.WardName) {
      throw new BadRequestException('Chưa xác minh được địa chỉ GHN. Vui lòng chọn lại tỉnh/huyện/xã.');
    }
    const parts = shippingAddress.split(',').map(part => part.trim());
    const fold = (value: string) => value.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
    const labels = [ward.WardName, district.DistrictName, province.ProvinceName];
    if (parts.length < 4 || !labels.every((label, index) => fold(label) === fold(parts[parts.length - 3 + index]))) {
      throw new BadRequestException('Địa chỉ nhận phải gồm số nhà/tên đường và đúng phường/xã, quận/huyện, tỉnh/thành đã chọn trên GHN.');
    }
    const detail = parts.slice(0, -3).join(', ').trim();
    if (detail.length < 5 || !/[\p{L}\p{N}]/u.test(detail)) {
      throw new BadRequestException('Vui lòng nhập số nhà/tên đường chi tiết, ít nhất 5 ký tự.');
    }
    // Keep the submitted snapshot, including apartment/floor details and spelling.
    return { recipientName, shippingAddress };
  }

  async createRequest(collaboratorId: string, dto: CreateSampleRequestDto) {
    const recipientPhone = normalizeSamplePhone(dto.recipientPhone);
    if (typeof recipientPhone !== 'string' || !SAMPLE_PHONE_PATTERN.test(recipientPhone)) {
      throw new BadRequestException(SAMPLE_PHONE_ERROR);
    }
    const eligibility = await this.getMyEligibility(collaboratorId);
    if (!eligibility.canRequest) {
      if (eligibility.isBlocked) {
        throw new ForbiddenException(
          eligibility.blockReason || 'Quyền xin mẫu của bạn đang bị khóa.',
        );
      }
      throw new ForbiddenException(
        'Bạn cần hoàn tất KYC và liên kết ít nhất một kênh mạng xã hội trước khi xin mẫu.',
      );
    }

    const socialChannel = await this.prisma.collaboratorSocialChannel.findFirst(
      {
        where: { id: dto.socialChannelId, collaboratorId },
      },
    );
    if (!socialChannel) {
      throw new BadRequestException(
        'Kênh cam kết không thuộc hồ sơ mạng xã hội đã liên kết của bạn.',
      );
    }

    if (dto.recipientPhoneConfirmed !== true) {
      throw new BadRequestException('Bạn cần xác nhận số điện thoại của người nhận hàng mẫu.');
    }
    const recipient = await this.validateRecipientAddress(dto);

    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        isDeleted: false,
        isActive: true,
        moderationStatus: 'APPROVED',
        store: { isDeleted: false, isActive: true },
      },
      include: { store: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!product)
      throw new NotFoundException(
        'Sản phẩm không tồn tại hoặc Shop đang tạm ngừng.',
      );

    let variant: {
      id: string;
      sku: string;
      name: string;
      isActive: boolean;
      sampleEnabled: boolean | null;
      sampleQuota: number | null;
      sampleGrantedCount: number;
    } | null = null;
    if (dto.productVariantId) {
      variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.productVariantId, productId: product.id },
        select: {
          id: true,
          sku: true,
          name: true,
          isActive: true,
          sampleEnabled: true,
          sampleQuota: true,
          sampleGrantedCount: true,
        },
      });
      if (!variant || !variant.isActive)
        throw new BadRequestException(
          'Phân loại sản phẩm đã chọn không còn hoạt động.',
        );
    }
    const sampleEnabled = variant?.sampleEnabled ?? product.sampleEnabled;
    const sampleQuota = variant?.sampleQuota ?? product.sampleQuota;
    const sampleGrantedCount =
      variant?.sampleGrantedCount ?? product.sampleGrantedCount;
    if (!sampleEnabled || sampleQuota <= sampleGrantedCount) {
      throw new BadRequestException(
        'Sản phẩm hiện không nhận đăng ký mẫu hoặc đã hết hạn mức mẫu.',
      );
    }

    const existing = await this.prisma.sampleProductRequest.findFirst({
      where: {
        collaboratorId,
        productId: dto.productId,
        status: { in: ACTIVE_SAMPLE_STATUSES },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Bạn đã có yêu cầu xin mẫu cho sản phẩm này đang được xử lý.',
      );
    }

    const completedExisting = await this.prisma.sampleProductRequest.findFirst({
      where: {
        collaboratorId,
        productId: dto.productId,
        status: SampleRequestStatus.COMPLETED,
      },
    });
    if (completedExisting) {
      throw new ConflictException(
        'Bạn đã từng nhận sản phẩm mẫu này và hoàn tất đánh giá. Mỗi Creator chỉ được tài trợ 1 suất mẫu cho mỗi dòng sản phẩm.',
      );
    }

    const request = await this.prisma.$transaction(async (tx) => {
      return tx.sampleProductRequest.create({
        data: {
          collaboratorId,
          productId: dto.productId,
          productVariantId: dto.productVariantId || null,
          socialChannelId: socialChannel.id,
          recipientName: recipient.recipientName,
          recipientPhone,
          shippingAddress: recipient.shippingAddress,
          ghnProvinceId: dto.ghnProvinceId ?? null,
          ghnDistrictId: dto.ghnDistrictId ?? null,
          ghnWardCode: dto.ghnWardCode || null,
          socialPlatformSnapshot: socialChannel.platformName,
          socialChannelNameSnapshot: socialChannel.channelName,
          socialChannelUrlSnapshot: socialChannel.channelUrl,
          socialFollowerSnapshot: socialChannel.followerCount,
          contentType: dto.contentType.trim(),
          expectedVideoAt: null,
          acceptedTermsAt: new Date(),
        },
        include: this.includeRelations(),
      });
    });
    await this.notify({
      userId: product.store.ownerId,
      title: 'Có yêu cầu xin sản phẩm mẫu mới',
      message: `${request.collaborator.fullName} đăng ký nhận mẫu ${product.title}.`,
      type: 'SAMPLE_REQUEST_CREATED',
      requestId: request.id,
    });
    await this.audit(collaboratorId, 'SAMPLE_REQUEST_CREATED', request.id, {
      productId: product.id,
      productVariantId: variant?.id,
      socialChannelId: socialChannel.id,
      expectedVideoAt: null,
    });
    return request;
  }

  async updatePendingRequest(requestId: string, collaboratorId: string, dto: UpdateSampleRequestDto) {
    const recipientPhone = normalizeSamplePhone(dto.recipientPhone);
    if (typeof recipientPhone !== 'string' || !SAMPLE_PHONE_PATTERN.test(recipientPhone)) {
      throw new BadRequestException(SAMPLE_PHONE_ERROR);
    }
    const request = await this.getOwnedRequest(requestId, collaboratorId);
    if (request.status !== SampleRequestStatus.PENDING) {
      throw new ConflictException('Chỉ được sửa yêu cầu đang chờ Shop duyệt.');
    }
    if (dto.recipientPhoneConfirmed !== true || dto.termsAccepted !== true) {
      throw new BadRequestException('Bạn cần xác nhận số điện thoại và cam kết nhận mẫu.');
    }
    const channel = await this.prisma.collaboratorSocialChannel.findFirst({
      where: { id: dto.socialChannelId, collaboratorId },
    });
    if (!channel) throw new BadRequestException('Kênh cam kết không thuộc hồ sơ mạng xã hội của bạn.');
    const recipient = await this.validateRecipientAddress(dto);
    return this.prisma.$transaction(async (tx) => {
      // Conditional write serializes against approval/cancellation on this row.
      const changed = await tx.sampleProductRequest.updateMany({
        where: { id: requestId, collaboratorId, status: SampleRequestStatus.PENDING },
        data: {
          recipientName: recipient.recipientName, recipientPhone,
          shippingAddress: recipient.shippingAddress, ghnProvinceId: dto.ghnProvinceId,
          ghnDistrictId: dto.ghnDistrictId, ghnWardCode: dto.ghnWardCode,
          socialChannelId: channel.id, socialPlatformSnapshot: channel.platformName,
          socialChannelNameSnapshot: channel.channelName, socialChannelUrlSnapshot: channel.channelUrl,
          socialFollowerSnapshot: channel.followerCount, contentType: dto.contentType.trim(),
          acceptedTermsAt: new Date(),
        },
      });
      if (changed.count !== 1) throw new ConflictException('Shop đã xử lý yêu cầu trong lúc bạn sửa. Vui lòng tải lại.');
      await tx.sampleRequestEvent.create({ data: {
        sampleRequestId: requestId, action: 'SAMPLE_REQUEST_UPDATED',
        details: { collaboratorId, fields: ['recipientName', 'recipientPhone', 'shippingAddress', 'ghnProvinceId', 'ghnDistrictId', 'ghnWardCode', 'socialChannelId', 'contentType'] },
      } });
      await tx.notification.create({ data: {
        userId: request.product.store.ownerId, title: 'KOL đã cập nhật yêu cầu nhận mẫu',
        message: `${request.collaborator.fullName} đã sửa thông tin nhận mẫu ${request.product.title}. Vui lòng kiểm tra lại trước khi duyệt.`,
        type: 'SAMPLE_REQUEST_UPDATED', data: { sampleRequestId: requestId },
      } });
      return tx.sampleProductRequest.findUniqueOrThrow({ where: { id: requestId }, include: this.includeRelations() });
    });
  }

  async getMyRequests(collaboratorId: string, storeId?: string) {
    return this.prisma.sampleProductRequest.findMany({
      where: {
        collaboratorId,
        ...(storeId ? { product: { storeId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations(),
    });
  }

  async getRequestsForShop(shopOwnerId: string, status?: SampleRequestStatus) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: shopOwnerId, isDeleted: false },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng của bạn');
    return this.prisma.sampleProductRequest.findMany({
      where: { product: { storeId: store.id }, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations(),
    });
  }

  async getAdminRequests(status?: SampleRequestStatus) {
    return this.prisma.sampleProductRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: this.includeRelations(),
    });
  }

  async getBlockedCollaborators() {
    return this.prisma.collaboratorProfile.findMany({
      where: { sampleRequestsBlockedAt: { not: null } },
      orderBy: { sampleRequestsBlockedAt: 'desc' },
      select: {
        sampleRequestsBlockedAt: true,
        sampleRequestsBlockReason: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            sampleProductRequests: {
              where: { status: SampleRequestStatus.OVERDUE },
              orderBy: { deadlineAt: 'asc' },
              include: {
                product: {
                  select: { title: true, store: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });
  }

  async getRequestById(requestId: string, userId: string, userRole: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: this.includeRelations(),
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu');
    if (userRole === 'COLLABORATOR' && req.collaboratorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu này');
    }
    if (userRole === 'SHOP_MANAGER')
      await this.ensureShopOwns(requestId, userId);
    return req;
  }

  async approveRequest(requestId: string, shopOwnerId: string) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);
    if (req.status !== SampleRequestStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt yêu cầu đang ở trạng thái ${req.status}.`,
      );
    }
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const creatorProfile = await tx.collaboratorProfile.findUnique({
          where: { userId: req.collaboratorId },
          select: { sampleRequestsBlockedAt: true },
        });
        if (creatorProfile?.sampleRequestsBlockedAt) {
          throw new ConflictException('KOL đang bị Admin khóa quyền nhận mẫu.');
        }

        const product = await tx.product.findUnique({
          where: { id: req.productId },
          select: {
            id: true,
            isActive: true,
            moderationStatus: true,
            sampleEnabled: true,
            sampleQuota: true,
            sampleGrantedCount: true,
          },
        });
        if (!product?.isActive)
          throw new ConflictException(
            'Sản phẩm đã tạm ngừng nên không thể cấp mẫu.',
          );

        if (product.moderationStatus !== 'APPROVED') {
          throw new ConflictException(
            'Sản phẩm chưa được kiểm duyệt để cấp mẫu.',
          );
        }

        let useVariantAllowance = false;
        let variant: {
          id: string;
          isActive: boolean;
          sampleEnabled: boolean | null;
          sampleQuota: number | null;
          sampleGrantedCount: number;
        } | null = null;
        if (req.productVariantId) {
          variant = await tx.productVariant.findUnique({
            where: { id: req.productVariantId },
            select: {
              id: true,
              isActive: true,
              sampleEnabled: true,
              sampleQuota: true,
              sampleGrantedCount: true,
            },
          });
          if (!variant?.isActive)
            throw new ConflictException(
              'Phân loại sản phẩm đã tạm ngừng nên không thể cấp mẫu.',
            );
          useVariantAllowance =
            variant.sampleEnabled !== null || variant.sampleQuota !== null;
        }

        const enabled = variant?.sampleEnabled ?? product.sampleEnabled;
        const quota = variant?.sampleQuota ?? product.sampleQuota;
        const grantedCount =
          useVariantAllowance && variant
            ? variant.sampleGrantedCount
            : product.sampleGrantedCount;
        if (!enabled || quota <= grantedCount) {
          throw new ConflictException(
            'Hạn mức sản phẩm mẫu đã hết hoặc Shop đã tắt nhận đăng ký.',
          );
        }

        const allocation =
          useVariantAllowance && variant
            ? await tx.productVariant.updateMany({
                where: {
                  id: variant.id,
                  isActive: true,
                  sampleEnabled: variant.sampleEnabled,
                  sampleQuota: variant.sampleQuota,
                  sampleGrantedCount: variant.sampleGrantedCount,
                },
                data: { sampleGrantedCount: { increment: 1 } },
              })
            : await tx.product.updateMany({
                where: {
                  id: product.id,
                  isActive: true,
                  sampleEnabled: product.sampleEnabled,
                  sampleQuota: product.sampleQuota,
                  sampleGrantedCount: product.sampleGrantedCount,
                },
                data: { sampleGrantedCount: { increment: 1 } },
              });
        if (!allocation.count)
          throw new ConflictException(
            'Hạn mức mẫu vừa thay đổi. Tải lại yêu cầu trước khi duyệt.',
          );

        const changed = await tx.sampleProductRequest.updateMany({
          where: { id: requestId, status: SampleRequestStatus.PENDING },
          data: { status: SampleRequestStatus.APPROVED, grantedAt: new Date() },
        });
        if (!changed.count)
          throw new ConflictException(
            'Yêu cầu đã được xử lý ở một phiên khác.',
          );
        return tx.sampleProductRequest.findUniqueOrThrow({
          where: { id: requestId },
          include: this.includeRelations(),
        });
      },
      { isolationLevel: 'Serializable' },
    );
    await this.notify({
      userId: req.collaboratorId,
      title: 'Yêu cầu xin mẫu đã được duyệt',
      message: `Shop đã duyệt yêu cầu nhận mẫu ${req.product.title}.`,
      type: 'SAMPLE_REQUEST_APPROVED',
      requestId,
    });
    await this.audit(shopOwnerId, 'SAMPLE_REQUEST_APPROVED', requestId);
    return updated;
  }

  async rejectRequest(requestId: string, shopOwnerId: string, reason: string) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);
    if (req.status !== SampleRequestStatus.PENDING) {
      throw new BadRequestException(
        `Không thể từ chối yêu cầu đang ở trạng thái ${req.status}.`,
      );
    }
    const updated = await this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: {
        status: SampleRequestStatus.REJECTED,
        rejectedReason: reason.trim(),
      },
      include: this.includeRelations(),
    });
    await this.notify({
      userId: req.collaboratorId,
      title: 'Yêu cầu xin mẫu bị từ chối',
      message: `Shop từ chối yêu cầu nhận mẫu ${req.product.title}: ${reason.trim()}`,
      type: 'SAMPLE_REQUEST_REJECTED',
      requestId,
    });
    await this.audit(shopOwnerId, 'SAMPLE_REQUEST_REJECTED', requestId, {
      reason: reason.trim(),
    });
    return updated;
  }

  async cancelRequest(requestId: string, collaboratorId: string) {
    const req = await this.getOwnedRequest(requestId, collaboratorId);
    if (req.status !== SampleRequestStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể hủy yêu cầu khi Shop chưa duyệt.',
      );
    }
    const updated = await this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: { status: SampleRequestStatus.CANCELLED },
      include: this.includeRelations(),
    });
    await this.audit(collaboratorId, 'SAMPLE_REQUEST_CANCELLED', requestId);
    return updated;
  }

  async shipRequest(
    requestId: string,
    shopOwnerId: string,
    dto: ShipSampleRequestDto,
  ) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);
    if (dto.carrier?.toUpperCase().includes('GHN')) {
      throw new BadRequestException('Vui lòng tạo vận đơn GHN trực tiếp từ SCANMS để xác thực mã và trạng thái giao.');
    }
    if (
      req.status !== SampleRequestStatus.APPROVED &&
      req.status !== SampleRequestStatus.DELIVERY_ISSUE
    ) {
      throw new BadRequestException(
        'Chỉ yêu cầu đã duyệt hoặc gặp sự cố giao hàng mới được cập nhật vận đơn.',
      );
    }
    const updated = await this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: {
        status: SampleRequestStatus.SHIPPED,
        trackingNumber: dto.trackingNumber.trim(),
        carrier: dto.carrier?.trim() || null,
        rejectedReason: null,
        receivedAt: null,
        deadlineAt: null,
        expectedVideoAt: null,
      },
      include: this.includeRelations(),
    });
    await this.notify({
      userId: req.collaboratorId,
      title: 'Shop đã gửi hàng mẫu',
      message: `Mẫu ${req.product.title} đang được giao${dto.carrier ? ` qua ${dto.carrier}` : ''}. Mã vận đơn: ${dto.trackingNumber}.`,
      type: 'SAMPLE_REQUEST_SHIPPED',
      requestId,
    });
    await this.audit(shopOwnerId, 'SAMPLE_REQUEST_SHIPPED', requestId, {
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
    });
    return updated;
  }

  async confirmReceived(requestId: string, collaboratorId: string) {
    await this.getOwnedRequest(requestId, collaboratorId);
    throw new BadRequestException(
      'Hệ thống tự xác nhận nhận mẫu sau khi xác minh giao thành công. KOL không thể xác nhận thủ công.',
    );
  }

  async reportDeliveryIssue(
    requestId: string,
    collaboratorId: string,
    dto: ReportSampleDeliveryIssueDto,
  ) {
    const req = await this.getOwnedRequest(requestId, collaboratorId);
    if (req.status !== SampleRequestStatus.SHIPPED) {
      throw new BadRequestException(
        'Chỉ báo sự cố khi đơn hàng đang được giao.',
      );
    }
    const updated = await this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: {
        status: SampleRequestStatus.DELIVERY_ISSUE,
        rejectedReason: dto.reason.trim(),
      },
      include: this.includeRelations(),
    });
    await this.notify({
      userId: req.product.store.ownerId,
      title: 'KOL báo sự cố giao hàng mẫu',
      message: `${req.collaborator.fullName} báo sự cố với ${req.product.title}: ${dto.reason.trim()}`,
      type: 'SAMPLE_DELIVERY_ISSUE',
      requestId,
    });
    await this.audit(
      collaboratorId,
      'SAMPLE_DELIVERY_ISSUE_REPORTED',
      requestId,
      { reason: dto.reason.trim() },
    );
    return updated;
  }

  async submitVideo(
    requestId: string,
    collaboratorId: string,
    dto: SubmitSampleVideoDto,
  ) {
    const req = await this.getOwnedRequest(requestId, collaboratorId);
    if (
      req.status !== SampleRequestStatus.RECEIVED &&
      req.status !== SampleRequestStatus.OVERDUE &&
      req.status !== SampleRequestStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        'Bạn chỉ có thể nộp video sau khi đã nhận mẫu hoặc khi Shop yêu cầu sửa video.',
      );
    }
    if (!dto.videoUrl.trim().toLowerCase().startsWith('https://')) {
      throw new BadRequestException('Link video phải sử dụng HTTPS.');
    }
    this.mediaService.validateAllowedUrl(dto.videoUrl, 'Link video');
    const parsedUrl = new URL(dto.videoUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Link video phải sử dụng HTTPS.');
    }
    const host = parsedUrl.hostname.toLowerCase();
    const platformHosts: Record<string, string[]> = {
      TIKTOK: ['tiktok.com'],
      YOUTUBE: ['youtube.com', 'youtu.be'],
      FACEBOOK: ['facebook.com', 'fb.watch'],
      INSTAGRAM: ['instagram.com'],
    };
    const committedPlatform =
      req.socialPlatformSnapshot || req.socialChannel?.platformName;
    const expectedHosts = committedPlatform
      ? platformHosts[committedPlatform]
      : undefined;
    if (
      expectedHosts &&
      !expectedHosts.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      )
    ) {
      throw new BadRequestException(
        `Link video phải được đăng trên kênh ${committedPlatform} đã cam kết.`,
      );
    }
    const submittedAt = new Date();
    const effectiveDeadline = req.revisionDeadlineAt || req.deadlineAt;
    const late = Boolean(effectiveDeadline && submittedAt > effectiveDeadline);
    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          storeId: req.product.storeId,
          productId: req.productId,
          collaboratorId,
          sampleRequestId: req.id,
          title: dto.title.trim(),
          assetType: 'VIDEO',
          urlOrContent: dto.videoUrl.trim(),
          caption: dto.caption?.trim() || null,
          status: 'PENDING',
        },
      });
      const sample = await tx.sampleProductRequest.update({
        where: { id: requestId },
        data: {
          status: SampleRequestStatus.VIDEO_SUBMITTED,
          videoUrl: dto.videoUrl.trim(),
          videoTitle: dto.title.trim(),
          videoSubmittedAt: submittedAt,
          videoRejectionReason: null,
          revisionDeadlineAt: null,
          revisionReminderSentAt: null,
          revisionShopReminderSentAt: null,
        },
        include: this.includeRelations(),
      });
      return { sample, asset };
    });
    await this.notify({
      userId: req.product.store.ownerId,
      title: 'KOL đã nộp video review',
      message: `${req.collaborator.fullName} đã nộp video cho ${req.product.title}${late ? ' (nộp sau hạn)' : ''}.`,
      type: 'SAMPLE_VIDEO_SUBMITTED',
      requestId,
    });
    if (late) {
      await this.notify({
        userId: collaboratorId,
        title: 'Đã ghi nhận video nộp trễ',
        message: `Video cho ${req.product.title} được ghi nhận nộp trễ và đang chờ Shop nghiệm thu. Admin sẽ xem xét nếu có báo cáo vi phạm.`,
        type: 'SAMPLE_VIDEO_LATE',
        requestId,
      });
    }
    await this.audit(collaboratorId, 'SAMPLE_VIDEO_SUBMITTED', requestId, {
      mediaAssetId: updated.asset.id,
      late,
      submittedAt: submittedAt.toISOString(),
    });
    return {
      message: 'Đã nộp video và chuyển Shop kiểm duyệt.',
      request: updated.sample,
      asset: updated.asset,
      late,
    };
  }

  async getShopStats(shopOwnerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: shopOwnerId, isDeleted: false },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng của bạn');
    const [grouped, grantedSamples, sampleProducts] = await Promise.all([
      this.prisma.sampleProductRequest.groupBy({
        by: ['status'],
        where: { product: { storeId: store.id } },
        _count: { _all: true },
      }),
      this.prisma.sampleProductRequest.findMany({
        where: { product: { storeId: store.id }, grantedAt: { not: null } },
        select: {
          status: true,
          videoSubmittedAt: true,
          product: { select: { price: true } },
          productVariant: { select: { price: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { storeId: store.id, isDeleted: false },
        select: {
          sampleEnabled: true,
          sampleQuota: true,
          sampleGrantedCount: true,
          variants: {
            where: { isActive: true },
            select: {
              sampleEnabled: true,
              sampleQuota: true,
              sampleGrantedCount: true,
            },
          },
        },
      }),
    ]);
    const stats: Record<string, number> = {};
    for (const item of grouped) stats[item.status] = item._count._all;
    const grantedCount = grantedSamples.length;
    const videoSubmittedCount = grantedSamples.filter(
      (sample) => sample.videoSubmittedAt,
    ).length;
    const issuedValue = grantedSamples.reduce(
      (sum, sample) =>
        sum + Number(sample.productVariant?.price ?? sample.product.price),
      0,
    );
    return {
      pending: stats.PENDING || 0,
      approved: stats.APPROVED || 0,
      shipped: stats.SHIPPED || 0,
      received: stats.RECEIVED || 0,
      videoSubmitted: stats.VIDEO_SUBMITTED || 0,
      revisionRequired: stats.REVISION_REQUIRED || 0,
      completed: stats.COMPLETED || 0,
      overdue: stats.OVERDUE || 0,
      rejected: stats.REJECTED || 0,
      cancelled: stats.CANCELLED || 0,
      deliveryIssue: stats.DELIVERY_ISSUE || 0,
      total: grouped.reduce((total, item) => total + item._count._all, 0),
      grantedCount,
      issuedValue,
      videoSubmittedCount,
      videoSubmissionRate: grantedCount
        ? Math.round((videoSubmittedCount / grantedCount) * 100)
        : 0,
      completedRate: grantedCount
        ? Math.round(((stats.COMPLETED || 0) / grantedCount) * 100)
        : 0,
      remainingSampleQuota: sampleProducts.reduce((sum, product) => {
        const productRemaining = product.sampleEnabled
          ? Math.max(0, product.sampleQuota - product.sampleGrantedCount)
          : 0;
        const skuRemaining = product.variants.reduce((skuSum, variant) => {
          const hasOverride =
            variant.sampleEnabled !== null || variant.sampleQuota !== null;
          if (!hasOverride) return skuSum;
          const enabled = variant.sampleEnabled ?? product.sampleEnabled;
          const quota = variant.sampleQuota ?? product.sampleQuota;
          return (
            skuSum +
            (enabled ? Math.max(0, quota - variant.sampleGrantedCount) : 0)
          );
        }, 0);
        return sum + productRemaining + skuRemaining;
      }, 0),
    };
  }

  private pendingViolationReport(
    events: { action: string; details?: unknown }[],
  ) {
    const latest = events.find((event) =>
      [
        'SAMPLE_VIOLATION_REPORTED',
        'SAMPLE_REQUESTS_BLOCKED',
        'SAMPLE_VIOLATION_DISMISSED',
        'SAMPLE_ADMIN_DEADLINE_EXTENDED',
        'SAMPLE_ADMIN_OBLIGATION_CANCELLED',
      ].includes(event.action),
    );
    return latest?.action === 'SAMPLE_VIOLATION_REPORTED' ? latest : null;
  }

  private hasDeadlineViolation(req: {
    status: string;
    deadlineAt: Date | null;
    revisionDeadlineAt: Date | null;
    videoSubmittedAt: Date | null;
    events: { action: string; details: unknown }[];
  }) {
    if (req.status === 'OVERDUE') return true;
    const deadline = req.revisionDeadlineAt || req.deadlineAt;
    if (['RECEIVED', 'REVISION_REQUIRED'].includes(req.status)) {
      return Boolean(deadline && deadline <= new Date());
    }
    return (
      req.status === 'VIDEO_SUBMITTED' &&
      Boolean(
        (req.videoSubmittedAt && deadline && req.videoSubmittedAt > deadline) ||
        req.events.some(
          (event) =>
            event.action === 'SAMPLE_VIDEO_SUBMITTED' &&
            (event.details as { late?: boolean } | null)?.late,
        ),
      )
    );
  }

  async extendDeadlineByShop(
    requestId: string,
    shopOwnerId: string,
    dto: { deadlineAt: string; reason: string },
  ) {
    const reason = dto.reason?.trim();
    const deadlineAt = new Date(dto.deadlineAt);
    if (!reason || reason.length > 500)
      throw new BadRequestException('Cần ghi lý do gia hạn, tối đa 500 ký tự.');
    if (Number.isNaN(deadlineAt.getTime()) || deadlineAt <= new Date())
      throw new BadRequestException('Hạn mới phải là thời điểm trong tương lai.');
    await this.ensureShopOwns(requestId, shopOwnerId);
    const updated = await this.prisma.$transaction(async (tx) => {
      // Serialize against reporting and concurrent deadline changes on this sample.
      await tx.sampleProductRequest.update({ where: { id: requestId }, data: { updatedAt: new Date() } });
      const sample = await tx.sampleProductRequest.findUniqueOrThrow({
        where: { id: requestId }, include: this.includeRelations(),
      });
      if (sample.product.store.ownerId !== shopOwnerId)
        throw new ForbiddenException('Yêu cầu không thuộc gian hàng của bạn.');
      if (!['RECEIVED', 'REVISION_REQUIRED', 'OVERDUE'].includes(sample.status))
        throw new BadRequestException('Chỉ gia hạn mẫu đã nhận và đang chờ nộp hoặc sửa video.');
      if (this.pendingViolationReport(sample.events))
        throw new ConflictException('Báo cáo đang chờ Admin xử lý. Vui lòng đề nghị Admin gia hạn.');
      const revision = Boolean(sample.revisionDeadlineAt);
      const previousDeadline = sample.revisionDeadlineAt || sample.deadlineAt;
      if (!previousDeadline || deadlineAt <= previousDeadline)
        throw new BadRequestException('Hạn mới phải muộn hơn hạn hiện tại.');
      const changed = await tx.sampleProductRequest.updateMany({
        where: {
          id: requestId, status: sample.status,
          deadlineAt: sample.deadlineAt, revisionDeadlineAt: sample.revisionDeadlineAt,
          videoSubmittedAt: sample.videoSubmittedAt,
        },
        data: revision ? {
          status: SampleRequestStatus.REVISION_REQUIRED, revisionDeadlineAt: deadlineAt,
          revisionReminderSentAt: null, revisionShopReminderSentAt: null, overdueAt: null,
        } : {
          status: SampleRequestStatus.RECEIVED, deadlineAt,
          reminderSentAt: null, shopReminderSentAt: null, overdueAt: null,
        },
      });
      if (!changed.count)
        throw new ConflictException('Mẫu vừa được cập nhật. Vui lòng tải lại trước khi gia hạn.');
      const details = { reason, deadlineAt: deadlineAt.toISOString(), previousDeadlineAt: previousDeadline.toISOString(), revision };
      await tx.sampleRequestEvent.create({ data: { sampleRequestId: requestId, actorId: shopOwnerId, action: 'SAMPLE_SHOP_DEADLINE_EXTENDED', details } });
      await tx.auditLog.create({ data: { userId: shopOwnerId, action: 'SAMPLE_SHOP_DEADLINE_EXTENDED', details: { sampleRequestId: requestId, ...details } } });
      return tx.sampleProductRequest.findUniqueOrThrow({ where: { id: requestId }, include: this.includeRelations() });
    });
    await this.notify({
      userId: updated.collaboratorId, title: 'Shop đã gia hạn nộp video mẫu',
      message: `${updated.product.title}: hạn mới ${deadlineAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Lý do: ${reason}`,
      type: 'SAMPLE_SHOP_DEADLINE_EXTENDED', requestId,
    });
    return updated;
  }

  async reportViolation(
    requestId: string,
    shopOwnerId: string,
    reason: string,
  ) {
    if (!reason?.trim())
      throw new BadRequestException('Cần ghi lý do và bằng chứng báo cáo.');
    const normalizedReason = reason.trim();
    if (normalizedReason.length > 500)
      throw new BadRequestException('Lý do tối đa 500 ký tự.');
    await this.ensureShopOwns(requestId, shopOwnerId);
    const req = await this.prisma.$transaction(async (tx) => {
      // Lock the request before checking/reporting so repeated submissions cannot create duplicates.
      await tx.sampleProductRequest.update({
        where: { id: requestId },
        data: { updatedAt: new Date() },
      });
      const sample = await tx.sampleProductRequest.findUnique({
        where: { id: requestId },
        include: this.includeRelations(),
      });
      if (!sample || sample.product.store.ownerId !== shopOwnerId)
        throw new ForbiddenException('Yêu cầu không thuộc gian hàng của bạn.');
      if (!this.hasDeadlineViolation(sample))
        throw new BadRequestException(
          'Chỉ báo cáo yêu cầu đã quá hạn nộp hoặc sửa video.',
        );
      if (sample.collaborator.collaboratorProfile?.sampleRequestsBlockedAt)
        throw new ConflictException('KOL đã bị Admin khóa quyền nhận mẫu.');
      if (this.pendingViolationReport(sample.events))
        throw new ConflictException('Báo cáo này đang chờ Admin xử lý.');
      await tx.sampleRequestEvent.create({
        data: {
          sampleRequestId: requestId,
          actorId: shopOwnerId,
          action: 'SAMPLE_VIOLATION_REPORTED',
          details: { reason: normalizedReason },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: shopOwnerId,
          action: 'SAMPLE_VIOLATION_REPORTED',
          details: { sampleRequestId: requestId, reason: normalizedReason },
        },
      });
      return sample;
    });
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ['SYSTEM_ADMIN', 'SYSTEM_MANAGER'] },
        isActive: true,
      },
      select: { id: true },
    });
    for (const admin of admins)
      await this.notify({
        userId: admin.id,
        title: 'Shop đề nghị xử lý KOL quá hạn video',
        message: `${req.product.store.name}: ${req.collaborator.fullName} · ${req.product.title}. Lý do: ${normalizedReason}`,
        type: 'SAMPLE_VIOLATION_REPORTED',
        requestId,
      });
    await this.notify({
      userId: req.collaboratorId,
      title: 'Shop đã báo cáo quá hạn video mẫu',
      message: `Báo cáo cho ${req.product.title} đang chờ Admin xét duyệt. Lý do: ${normalizedReason}. Bạn có thể liên hệ Shop để giải trình.`,
      type: 'SAMPLE_VIOLATION_REPORTED',
      requestId,
    });
    return { success: true };
  }

  private async moderateViolation(
    requestId: string,
    adminId: string,
    action: 'BLOCK_SAMPLE_REQUESTS' | 'DISMISS_REPORT',
    reason: string,
  ) {
    const normalizedReason = reason.trim();
    if (normalizedReason.length > 500)
      throw new BadRequestException('Lý do tối đa 500 ký tự.');
    const req = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.sampleProductRequest.findUnique({
        where: { id: requestId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Không tìm thấy yêu cầu mẫu.');
      await tx.sampleProductRequest.update({
        where: { id: requestId },
        data: { updatedAt: new Date() },
      });
      const sample = await tx.sampleProductRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: this.includeRelations(),
      });
      const report = this.pendingViolationReport(sample.events);
      if (action === 'DISMISS_REPORT' && !report)
        throw new ConflictException('Không có báo cáo đang chờ xử lý.');
      if (action === 'BLOCK_SAMPLE_REQUESTS') {
        if (!this.hasDeadlineViolation(sample))
          throw new BadRequestException(
            'Yêu cầu chưa quá hạn hoặc đã hoàn tất nghĩa vụ.',
          );
        const updated = await tx.collaboratorProfile.updateMany({
          where: {
            userId: sample.collaboratorId,
            sampleRequestsBlockedAt: null,
          },
          data: {
            sampleRequestsBlockedAt: new Date(),
            sampleRequestsBlockReason: normalizedReason,
          },
        });
        if (!updated.count)
          throw new ConflictException(
            'KOL đã bị khóa hoặc không có hồ sơ KOL.',
          );
      }
      const eventAction =
        action === 'BLOCK_SAMPLE_REQUESTS'
          ? 'SAMPLE_REQUESTS_BLOCKED'
          : 'SAMPLE_VIOLATION_DISMISSED';
      const details = {
        reason: normalizedReason,
        collaboratorId: sample.collaboratorId,
        source: 'ADMIN_DECISION',
      };
      await tx.sampleRequestEvent.create({
        data: {
          sampleRequestId: requestId,
          actorId: adminId,
          action: eventAction,
          details,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: eventAction,
          details: { sampleRequestId: requestId, ...details },
        },
      });
      return sample;
    });
    const blocked = action === 'BLOCK_SAMPLE_REQUESTS';
    for (const userId of [req.collaboratorId, req.product.store.ownerId])
      await this.notify({
        userId,
        title: blocked
          ? 'Admin đã khóa quyền nhận mẫu của KOL'
          : 'Admin không chấp nhận đề nghị khóa KOL',
        message: `${req.product.title}. Lý do: ${normalizedReason}${blocked ? '. Quyền nhận mẫu mới bị khóa trên toàn sàn; KOL vẫn có thể nộp video để hoàn tất nghĩa vụ.' : ''}`,
        type: blocked
          ? 'SAMPLE_REQUESTS_BLOCKED'
          : 'SAMPLE_VIOLATION_DISMISSED',
        requestId,
      });
    return { success: true };
  }

  async resolveRequestAsAdmin(
    requestId: string,
    adminId: string,
    dto: AdminResolveSampleRequestDto,
  ) {
    if (!dto.reason?.trim())
      throw new BadRequestException('Cần ghi lý do xử lý.');
    if (
      dto.action === 'BLOCK_SAMPLE_REQUESTS' ||
      dto.action === 'DISMISS_REPORT'
    ) {
      return this.moderateViolation(requestId, adminId, dto.action, dto.reason);
    }
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: this.includeRelations(),
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu.');
    const reason = dto.reason.trim();
    if (dto.action === 'RESOLVE_DELIVERY_ISSUE') {
      if (req.status !== SampleRequestStatus.DELIVERY_ISSUE) {
        throw new BadRequestException(
          'Chỉ có thể xử lý tranh chấp giao hàng khi yêu cầu đang ở trạng thái sự cố.',
        );
      }
      const updated = await this.prisma.sampleProductRequest.update({
        where: { id: requestId },
        data: { status: SampleRequestStatus.APPROVED, rejectedReason: null },
        include: this.includeRelations(),
      });
      await this.notify({
        userId: req.product.store.ownerId,
        title: 'Admin đã xử lý sự cố giao hàng mẫu',
        message: `Yêu cầu ${req.product.title} đã được mở lại để Shop cập nhật vận đơn gửi bù. Lý do: ${reason}`,
        type: 'SAMPLE_ADMIN_DELIVERY_ISSUE_RESOLVED',
        requestId,
      });
      await this.notify({
        userId: req.collaboratorId,
        title: 'Sự cố giao hàng mẫu đã được xử lý',
        message: `Shop sẽ tiếp tục gửi mẫu ${req.product.title}. Lý do xử lý: ${reason}`,
        type: 'SAMPLE_ADMIN_DELIVERY_ISSUE_RESOLVED',
        requestId,
      });
      await this.audit(
        adminId,
        'SAMPLE_ADMIN_DELIVERY_ISSUE_RESOLVED',
        requestId,
        { reason },
      );
      return updated;
    }
    if (dto.action === 'CANCEL_OBLIGATION') {
      const cancellable: SampleRequestStatus[] = [
        SampleRequestStatus.APPROVED,
        SampleRequestStatus.SHIPPED,
        SampleRequestStatus.RECEIVED,
        SampleRequestStatus.REVISION_REQUIRED,
        SampleRequestStatus.OVERDUE,
        SampleRequestStatus.DELIVERY_ISSUE,
      ];
      if (!cancellable.includes(req.status)) {
        throw new BadRequestException(
          'Chỉ có thể miễn nghĩa vụ với yêu cầu đã được Shop duyệt cấp mẫu.',
        );
      }
      const updated = await this.prisma.sampleProductRequest.update({
        where: { id: requestId },
        data: { status: SampleRequestStatus.CANCELLED, rejectedReason: reason },
        include: this.includeRelations(),
      });
      await this.notify({
        userId: req.collaboratorId,
        title: 'Quản trị viên đã giải quyết nghĩa vụ mẫu',
        message: `Nghĩa vụ video cho ${req.product.title} đã được miễn. Lý do: ${reason}`,
        type: 'SAMPLE_ADMIN_OBLIGATION_CANCELLED',
        requestId,
      });
      await this.audit(
        adminId,
        'SAMPLE_ADMIN_OBLIGATION_CANCELLED',
        requestId,
        { reason },
      );
      return updated;
    }

    const deadlineAt = dto.deadlineAt ? new Date(dto.deadlineAt) : null;
    if (
      !deadlineAt ||
      Number.isNaN(deadlineAt.getTime()) ||
      deadlineAt <= new Date()
    ) {
      throw new BadRequestException(
        'Hạn mới phải là thời điểm trong tương lai.',
      );
    }
    if (
      ![
        SampleRequestStatus.RECEIVED,
        SampleRequestStatus.REVISION_REQUIRED,
        SampleRequestStatus.OVERDUE,
      ].some((status) => status === req.status)
    ) {
      throw new BadRequestException(
        'Chỉ có thể gia hạn yêu cầu đang chờ video hoặc đang quá hạn.',
      );
    }
    const isRevision = Boolean(req.revisionDeadlineAt);
    const updated = await this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: isRevision
        ? {
            status: SampleRequestStatus.REVISION_REQUIRED,
            revisionDeadlineAt: deadlineAt,
            revisionReminderSentAt: null,
            revisionShopReminderSentAt: null,
          }
        : {
            status: SampleRequestStatus.RECEIVED,
            deadlineAt,
            reminderSentAt: null,
          },
      include: this.includeRelations(),
    });
    await this.notify({
      userId: req.collaboratorId,
      title: 'Đã gia hạn thời hạn nộp video mẫu',
      message: `Hạn mới cho video ${req.product.title}: ${deadlineAt.toLocaleString('vi-VN')}. Lý do: ${reason}`,
      type: 'SAMPLE_ADMIN_DEADLINE_EXTENDED',
      requestId,
    });
    await this.notify({
      userId: req.product.store.ownerId,
      title: 'Quản trị viên đã điều chỉnh hạn yêu cầu mẫu',
      message: `Hạn video của ${req.collaborator.fullName} cho ${req.product.title} được đổi thành ${deadlineAt.toLocaleString('vi-VN')}.`,
      type: 'SAMPLE_ADMIN_DEADLINE_EXTENDED',
      requestId,
    });
    await this.audit(adminId, 'SAMPLE_ADMIN_DEADLINE_EXTENDED', requestId, {
      reason,
      deadlineAt: deadlineAt.toISOString(),
      revision: isRevision,
    });
    return updated;
  }

  async unblockCollaborator(
    collaboratorId: string,
    adminId: string,
    reason?: string,
  ) {
    if (typeof reason !== 'string' || !reason.trim()) {
      throw new BadRequestException('Cần ghi lý do mở khóa quyền xin mẫu.');
    }
    const normalizedReason = reason.trim();
    if (normalizedReason.length > 500)
      throw new BadRequestException('Lý do tối đa 500 ký tự.');
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId: collaboratorId },
    });
    if (!profile) throw new NotFoundException('Không tìm thấy hồ sơ KOL.');
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.collaboratorProfile.updateMany({
        where: {
          userId: collaboratorId,
          sampleRequestsBlockedAt: { not: null },
        },
        data: {
          sampleRequestsBlockedAt: null,
          sampleRequestsBlockReason: null,
        },
      });
      if (!updated.count)
        throw new ConflictException('KOL không bị khóa quyền nhận mẫu.');
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'SAMPLE_REQUESTS_UNBLOCKED',
          details: { collaboratorId, reason: normalizedReason },
        },
      });
    });
    await this.notify({
      userId: collaboratorId,
      title: 'Đã mở lại quyền xin sản phẩm mẫu',
      message: `Admin đã mở lại quyền xin mẫu của bạn. Lý do: ${normalizedReason}`,
      type: 'SAMPLE_REQUESTS_UNBLOCKED',
    });
    return { success: true };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processDeadlines() {
    const now = new Date();
    const remindBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const shopRemindBefore = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const dueForReminder = await this.prisma.sampleProductRequest.findMany({
      where: {
        status: SampleRequestStatus.RECEIVED,
        deadlineAt: { gt: now, lte: remindBefore },
        reminderSentAt: null,
      },
      select: {
        id: true,
        collaboratorId: true,
        product: { select: { title: true } },
        deadlineAt: true,
      },
    });
    for (const req of dueForReminder) {
      const marked = await this.prisma.sampleProductRequest.updateMany({
        where: {
          id: req.id,
          reminderSentAt: null,
          status: SampleRequestStatus.RECEIVED,
        },
        data: { reminderSentAt: now },
      });
      if (!marked.count) continue;
      await this.notify({
        userId: req.collaboratorId,
        title: 'Sắp đến hạn nộp video review',
        message: `Bạn còn dưới 24 giờ để nộp video cho ${req.product.title}. Hạn cuối: ${req.deadlineAt?.toLocaleString('vi-VN')}.`,
        type: 'SAMPLE_VIDEO_REMINDER',
        requestId: req.id,
      });
    }

    const revisionsDueForReminder =
      await this.prisma.sampleProductRequest.findMany({
        where: {
          status: SampleRequestStatus.REVISION_REQUIRED,
          revisionDeadlineAt: { gt: now, lte: remindBefore },
          revisionReminderSentAt: null,
        },
        select: {
          id: true,
          collaboratorId: true,
          product: {
            select: { title: true, store: { select: { ownerId: true } } },
          },
          revisionDeadlineAt: true,
        },
      });
    for (const req of revisionsDueForReminder) {
      const marked = await this.prisma.sampleProductRequest.updateMany({
        where: {
          id: req.id,
          status: SampleRequestStatus.REVISION_REQUIRED,
          revisionReminderSentAt: null,
        },
        data: { revisionReminderSentAt: now },
      });
      if (!marked.count) continue;
      await this.notify({
        userId: req.collaboratorId,
        title: 'Sắp hết hạn chỉnh sửa video mẫu',
        message: `Bạn còn dưới 24 giờ để sửa video ${req.product.title}. Hạn cuối: ${req.revisionDeadlineAt?.toLocaleString('vi-VN')}.`,
        type: 'SAMPLE_VIDEO_REVISION_REMINDER',
        requestId: req.id,
      });
    }

    const shopDueSoon = await this.prisma.sampleProductRequest.findMany({
      where: {
        status: SampleRequestStatus.RECEIVED,
        deadlineAt: { gt: now, lte: shopRemindBefore },
        shopReminderSentAt: null,
      },
      select: {
        id: true,
        collaborator: { select: { fullName: true } },
        product: {
          select: { title: true, store: { select: { ownerId: true } } },
        },
        deadlineAt: true,
      },
    });
    for (const req of shopDueSoon) {
      const marked = await this.prisma.sampleProductRequest.updateMany({
        where: {
          id: req.id,
          status: SampleRequestStatus.RECEIVED,
          shopReminderSentAt: null,
        },
        data: { shopReminderSentAt: now },
      });
      if (!marked.count) continue;
      await this.notify({
        userId: req.product.store.ownerId,
        title: 'Yêu cầu mẫu sắp đến hạn video',
        message: `${req.collaborator.fullName} còn dưới 48 giờ để nộp video cho ${req.product.title}.`,
        type: 'SAMPLE_SHOP_DEADLINE_REMINDER',
        requestId: req.id,
      });
    }

    const revisionShopDueSoon = await this.prisma.sampleProductRequest.findMany(
      {
        where: {
          status: SampleRequestStatus.REVISION_REQUIRED,
          revisionDeadlineAt: { gt: now, lte: shopRemindBefore },
          revisionShopReminderSentAt: null,
        },
        select: {
          id: true,
          collaborator: { select: { fullName: true } },
          product: {
            select: { title: true, store: { select: { ownerId: true } } },
          },
          revisionDeadlineAt: true,
        },
      },
    );
    for (const req of revisionShopDueSoon) {
      const marked = await this.prisma.sampleProductRequest.updateMany({
        where: {
          id: req.id,
          status: SampleRequestStatus.REVISION_REQUIRED,
          revisionShopReminderSentAt: null,
        },
        data: { revisionShopReminderSentAt: now },
      });
      if (!marked.count) continue;
      await this.notify({
        userId: req.product.store.ownerId,
        title: 'Yêu cầu chỉnh sửa video sắp đến hạn',
        message: `${req.collaborator.fullName} cần gửi lại video cho ${req.product.title} trước ${req.revisionDeadlineAt?.toLocaleString('vi-VN')}.`,
        type: 'SAMPLE_SHOP_REVISION_REMINDER',
        requestId: req.id,
      });
    }

    const overdue = await this.prisma.sampleProductRequest.findMany({
      where: {
        OR: [
          {
            status: SampleRequestStatus.RECEIVED,
            deadlineAt: { lte: now },
            videoSubmittedAt: null,
          },
          {
            status: SampleRequestStatus.REVISION_REQUIRED,
            revisionDeadlineAt: { lte: now },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        deadlineAt: true,
        revisionDeadlineAt: true,
        collaboratorId: true,
        product: {
          select: { title: true, store: { select: { ownerId: true } } },
        },
      },
    });
    for (const req of overdue) {
      const isRevision = req.status === SampleRequestStatus.REVISION_REQUIRED;
      const marked = await this.prisma.sampleProductRequest.updateMany({
        where: {
          id: req.id,
          status: req.status,
          ...(isRevision
            ? { revisionDeadlineAt: { lte: now } }
            : { deadlineAt: { lte: now }, videoSubmittedAt: null }),
        },
        data: { status: SampleRequestStatus.OVERDUE, overdueAt: now },
      });
      if (!marked.count) continue;
      await this.notify({
        userId: req.collaboratorId,
        title: 'Video mẫu đã quá hạn',
        message: isRevision
          ? `Bạn chưa nộp lại video cho ${req.product.title} trước hạn chỉnh sửa. Hãy gửi video hoặc liên hệ Shop để giải trình.`
          : `Bạn chưa nộp video cho ${req.product.title} trước hạn. Hãy nộp video hoặc liên hệ Shop để giải trình. Quá hạn được ghi nhận để Admin xem xét nếu có báo cáo.`,
        type: 'SAMPLE_REQUEST_OVERDUE',
        requestId: req.id,
      });
      await this.notify({
        userId: req.product.store.ownerId,
        title: isRevision
          ? 'Video chỉnh sửa mẫu đã quá hạn'
          : 'Yêu cầu mẫu đã quá hạn',
        message: isRevision
          ? `KOL chưa gửi lại video cho ${req.product.title} trước hạn chỉnh sửa. Bạn có thể gửi báo cáo để Admin xem xét.`
          : `KOL chưa nộp video cho ${req.product.title} trước hạn. Bạn có thể gửi báo cáo để Admin xem xét.`,
        type: 'SAMPLE_REQUEST_OVERDUE',
        requestId: req.id,
      });
      await this.audit(
        null,
        isRevision ? 'SAMPLE_REVISION_OVERDUE' : 'SAMPLE_REQUEST_OVERDUE',
        req.id,
        { collaboratorId: req.collaboratorId },
      );
    }
  }

  private includeRelations() {
    return {
      shippingCharges: { orderBy: { recordedAt: 'desc' as const } },
      collaborator: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          collaboratorProfile: {
            select: {
              kycStatus: true,
              sampleRequestsBlockedAt: true,
              sampleRequestsBlockReason: true,
              totalFollowers: true,
              totalOrdersReferred: true,
              tier: { select: { name: true } },
            },
          },
        },
      },
      socialChannel: {
        select: {
          id: true,
          platformName: true,
          channelName: true,
          channelUrl: true,
          followerCount: true,
        },
      },
      productVariant: {
        select: { id: true, sku: true, name: true, price: true },
      },
      events: {
        orderBy: { createdAt: 'desc' as const },
      },
      videoAssets: {
        orderBy: { createdAt: 'desc' as const },
        select: {
          id: true,
          title: true,
          urlOrContent: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          sku: true,
          imageUrl: true,
          price: true,
          customCommissionRate: true,
          storeId: true,
          sampleEnabled: true,
          sampleQuota: true,
          sampleGrantedCount: true,
          store: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              defaultCommissionRate: true,
            },
          },
        },
      },
    };
  }

  private async getOwnedRequest(requestId: string, collaboratorId: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: this.includeRelations(),
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu');
    if (req.collaboratorId !== collaboratorId) {
      throw new ForbiddenException(
        'Yêu cầu này không thuộc tài khoản của bạn.',
      );
    }
    return req;
  }

  private async ensureShopOwns(requestId: string, shopOwnerId: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: {
        product: {
          select: {
            storeId: true,
            title: true,
            store: { select: { ownerId: true } },
          },
        },
        collaborator: { select: { id: true, fullName: true } },
      },
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu');
    if (req.product.store.ownerId !== shopOwnerId) {
      throw new ForbiddenException('Yêu cầu này không thuộc cửa hàng của bạn');
    }
    return req;
  }

  private async getStoreOwnerForRequest(requestId: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      select: { product: { select: { store: { select: { ownerId: true } } } } },
    });
    return req?.product.store.ownerId || '';
  }

  private async notify(input: {
    userId: string;
    title: string;
    message: string;
    type: string;
    requestId?: string;
  }) {
    if (!input.userId) return;
    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          message: input.message,
          type: input.type,
          data: input.requestId
            ? { sampleRequestId: input.requestId }
            : undefined,
        },
      });
    } catch {
      // Notifications are best-effort; the sample state remains authoritative.
    }
  }

  private async audit(
    userId: string | null,
    action: string,
    requestId?: string,
    details: Record<string, unknown> = {},
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          details: {
            ...(requestId ? { sampleRequestId: requestId } : {}),
            ...details,
          },
        },
      });
      if (requestId) {
        await this.prisma.sampleRequestEvent.create({
          data: {
            sampleRequestId: requestId,
            actorId: userId,
            action,
            details: JSON.parse(JSON.stringify(details)),
          },
        });
      }
    } catch {
      // Audit failures should not undo an already completed user action.
    }
  }
}

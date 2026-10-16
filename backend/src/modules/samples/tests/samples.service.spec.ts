import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SamplesController } from '../samples.controller';
import { SampleRequestStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { MediaService } from '../../media/media.service';
import { SamplesService } from '../samples.service';

describe('SamplesService', () => {
  let service: SamplesService;
  let prisma: any;

  const channel = {
    id: 'channel-1',
    collaboratorId: 'kol-1',
    platformName: 'TIKTOK',
    channelName: 'kol-test',
  };
  const product = {
    id: 'product-1',
    title: 'Sản phẩm mẫu',
    sampleEnabled: true,
    sampleQuota: 10,
    sampleGrantedCount: 0,
    storeId: 'store-1',
    sampleEnabled: true,
    sampleQuota: 10,
    sampleGrantedCount: 0,
    store: { id: 'store-1', name: 'Shop đối tác', ownerId: 'shop-1' },
  };
  const request = {
    id: 'request-1',
    collaboratorId: 'kol-1',
    productId: product.id,
    status: SampleRequestStatus.SHIPPED,
    product,
    collaborator: { id: 'kol-1', fullName: 'KOL thử nghiệm' },
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ isActive: true }),
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
      },
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({
          kycStatus: 'VERIFIED',
          sampleRequestsBlockedAt: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      collaboratorSocialChannel: {
        findMany: jest.fn().mockResolvedValue([channel]),
        findFirst: jest.fn().mockResolvedValue(channel),
      },
      product: { findFirst: jest.fn().mockResolvedValue(product) },
      sampleProductRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(request),
        findUniqueOrThrow: jest
          .fn()
          .mockImplementation(() => prisma.sampleProductRequest.findUnique()),
        create: jest.fn().mockResolvedValue({
          ...request,
          status: SampleRequestStatus.PENDING,
        }),
        update: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ ...request, ...data }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      sampleRequestEvent: { create: jest.fn().mockResolvedValue({}) },
      mediaAsset: { create: jest.fn().mockResolvedValue({ id: 'asset-1' }) },
    };
    prisma.$transaction = jest.fn((callback: any) => callback(prisma));
    service = new SamplesService(
      prisma as PrismaService,
      {
        validateAllowedUrl: jest.fn(),
      } as unknown as MediaService,
      { getDistricts: jest.fn().mockResolvedValue([{ DistrictID: 2, ProvinceID: 1 }]), getWards: jest.fn().mockResolvedValue([{ WardCode: '0003', DistrictID: 2 }]) } as any,
    );
  });

  it('lưu kênh và cam kết, chỉ đặt ngày video sau khi giao mẫu', async () => {
    await service.createRequest('kol-1', {
      productId: product.id,
      socialChannelId: channel.id,
      recipientName: 'KOL thử nghiệm',
      recipientPhone: '0912345678',
      recipientPhoneConfirmed: true,
      shippingAddress: '123 Nguyễn Văn A, Quận 1, TP.HCM',
      ghnProvinceId: 1,
      ghnDistrictId: 2,
      ghnWardCode: '0003',
      contentType: 'Video review 60 giây',
      termsAccepted: true,
    });

    expect(prisma.sampleProductRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          socialChannelId: channel.id,
          contentType: 'Video review 60 giây',
          expectedVideoAt: null,
          acceptedTermsAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isDeleted: false }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'shop-1' }),
      }),
    );
  });

  it('từ chối địa chỉ GHN không đúng quan hệ tỉnh, huyện, xã', async () => {
    (service as any).ghnService.getDistricts.mockResolvedValue([{ DistrictID: 99, ProvinceID: 1 }]);
    await expect(service.createRequest('kol-1', {
      productId: product.id, socialChannelId: channel.id,
      recipientName: 'KOL thử nghiệm', recipientPhone: '0912345678', recipientPhoneConfirmed: true,
      shippingAddress: '123 Nguyễn Văn A, Quận 1, TP.HCM',
      ghnProvinceId: 1, ghnDistrictId: 2, ghnWardCode: '0003',
      contentType: 'Video review', expectedVideoAt: new Date(Date.now() + 7 * 86400000).toISOString(), termsAccepted: true,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.sampleProductRequest.create).not.toHaveBeenCalled();
  });

  it('chặn xin mẫu khi KOL bị khóa', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      kycStatus: 'VERIFIED',
      sampleRequestsBlockedAt: new Date(),
      sampleRequestsBlockReason: 'Quá hạn nộp video',
    });

    await expect(
      service.createRequest('kol-1', {
        productId: product.id,
        socialChannelId: channel.id,
        recipientName: 'KOL thử nghiệm',
        recipientPhone: '0912345678',
        shippingAddress: '123 Nguyễn Văn A, Quận 1, TP.HCM',
        contentType: 'Video review 60 giây',
        expectedVideoAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        termsAccepted: true,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.sampleProductRequest.create).not.toHaveBeenCalled();
  });

  it('bắt đầu hạn đúng 14 ngày khi KOL xác nhận nhận mẫu', async () => {
    await service.confirmReceived(request.id, 'kol-1');

    const update = prisma.sampleProductRequest.update.mock.calls[0][0];
    expect(update.data.status).toBe(SampleRequestStatus.RECEIVED);
    expect(
      update.data.deadlineAt.getTime() - update.data.receivedAt.getTime(),
    ).toBe(14 * 86400000);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('đánh dấu quá hạn và cảnh báo, không tự khóa quyền nhận mẫu', async () => {
    prisma.sampleProductRequest.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.OR?.some(
          (condition: any) =>
            condition.status === SampleRequestStatus.RECEIVED &&
            condition.deadlineAt?.lte,
        )
          ? [
              {
                id: request.id,
                status: SampleRequestStatus.RECEIVED,
                deadlineAt: new Date(Date.now() - 86400000),
                collaboratorId: 'kol-1',
                product,
              },
            ]
          : [],
      ),
    );
    prisma.sampleProductRequest.findUnique.mockResolvedValue(request);

    await service.processDeadlines();

    expect(prisma.sampleProductRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SampleRequestStatus.OVERDUE }),
      }),
    );
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(
      prisma.notification.create.mock.calls.some(
        ([args]: any[]) => args.data.type === 'SAMPLE_REQUESTS_BLOCKED',
      ),
    ).toBe(false);
  });

  function overdueRequest(overrides: Record<string, unknown> = {}) {
    return {
      ...request,
      status: 'OVERDUE',
      deadlineAt: new Date(Date.now() - 86400000),
      revisionDeadlineAt: null,
      videoSubmittedAt: null,
      events: [],
      collaborator: {
        ...request.collaborator,
        collaboratorProfile: { sampleRequestsBlockedAt: null },
      },
      ...overrides,
    };
  }

  it('Shop gửi báo cáo, ghi nhật ký và thông báo Admin, không khóa KOL', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(overdueRequest());
    await service.reportViolation(
      request.id,
      'shop-1',
      'Đã nhắc KOL nhưng chưa nộp video',
    );
    expect(prisma.sampleRequestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'shop-1',
          action: 'SAMPLE_VIOLATION_REPORTED',
        }),
      }),
    );
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'admin-1' }),
      }),
    );
  });

  it('Shop khác không được báo cáo yêu cầu không thuộc gian hàng', async () => {
    await expect(
      service.reportViolation(request.id, 'other-shop', 'Vi phạm'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.sampleRequestEvent.create).not.toHaveBeenCalled();
  });

  it('chặn báo cáo và khóa khi yêu cầu chưa quá hạn', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(
      overdueRequest({
        status: 'RECEIVED',
        deadlineAt: new Date(Date.now() + 86400000),
      }),
    );
    await expect(
      service.reportViolation(request.id, 'shop-1', 'Vi phạm'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.resolveRequestAsAdmin(request.id, 'admin-1', {
        action: 'BLOCK_SAMPLE_REQUESTS',
        reason: 'Vi phạm',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
  });

  it('không tạo báo cáo trùng khi đang chờ Admin xét duyệt', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(
      overdueRequest({
        events: [
          {
            action: 'SAMPLE_VIOLATION_REPORTED',
            details: { reason: 'Báo cáo cũ' },
          },
        ],
      }),
    );
    await expect(
      service.reportViolation(request.id, 'shop-1', 'Báo cáo mới'),
    ).rejects.toThrow(ConflictException);
    expect(prisma.sampleRequestEvent.create).not.toHaveBeenCalled();
  });

  it('Admin khóa quyền nhận mẫu, ghi người quyết định và thông báo hai bên', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(overdueRequest());
    await service.resolveRequestAsAdmin(request.id, 'admin-1', {
      action: 'BLOCK_SAMPLE_REQUESTS',
      reason: 'Không nộp video đúng hạn sau khi xác minh',
    });
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'kol-1', sampleRequestsBlockedAt: null },
        data: expect.objectContaining({
          sampleRequestsBlockedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.sampleRequestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'SAMPLE_REQUESTS_BLOCKED',
          details: expect.objectContaining({ source: 'ADMIN_DECISION' }),
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('Admin từ chối báo cáo mà không thay đổi quyền nhận mẫu', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(
      overdueRequest({
        events: [
          {
            action: 'SAMPLE_VIOLATION_REPORTED',
            details: { reason: 'Quá hạn' },
          },
        ],
      }),
    );
    await service.resolveRequestAsAdmin(request.id, 'admin-1', {
      action: 'DISMISS_REPORT',
      reason: 'Hai bên đã thỏa thuận',
    });
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.sampleRequestEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SAMPLE_VIOLATION_DISMISSED' }),
      }),
    );
  });

  it('không khóa khi video đã nghiệm thu và không chấp nhận lý do rỗng', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(
      overdueRequest({ status: 'COMPLETED' }),
    );
    await expect(
      service.resolveRequestAsAdmin(request.id, 'admin-1', {
        action: 'BLOCK_SAMPLE_REQUESTS',
        reason: 'Đã quá hạn',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.resolveRequestAsAdmin(request.id, 'admin-1', {
        action: 'BLOCK_SAMPLE_REQUESTS',
        reason: '   ',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
  });

  it('KOL nộp video trễ vẫn được ghi nhận, không tự khóa hoặc tự mở khóa', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(overdueRequest());
    await service.submitVideo(request.id, 'kol-1', {
      title: 'Video mẫu',
      videoUrl: 'https://www.tiktok.com/@kol/video/123',
    });
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.sampleProductRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VIDEO_SUBMITTED' }),
      }),
    );
  });

  it('gia hạn không tự mở khóa quyết định trước đó của Admin', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(overdueRequest());
    await service.resolveRequestAsAdmin(request.id, 'admin-1', {
      action: 'EXTEND_DEADLINE',
      reason: 'Thỏa thuận gia hạn',
      deadlineAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(prisma.collaboratorProfile.updateMany).not.toHaveBeenCalled();
  });

  it('Admin mở khóa có lưu người quyết định và lý do', async () => {
    await service.unblockCollaborator(
      'kol-1',
      'admin-1',
      'Đã giải quyết nghĩa vụ',
    );
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          sampleRequestsBlockedAt: null,
          sampleRequestsBlockReason: null,
        },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'admin-1',
          action: 'SAMPLE_REQUESTS_UNBLOCKED',
        }),
      }),
    );
    await expect(
      service.unblockCollaborator('kol-1', 'admin-1', '   '),
    ).rejects.toThrow(BadRequestException);
  });

  it('không ghi đè quyết định khi KOL đã bị khóa', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(overdueRequest());
    prisma.collaboratorProfile.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.resolveRequestAsAdmin(request.id, 'admin-1', {
        action: 'BLOCK_SAMPLE_REQUESTS',
        reason: 'Vi phạm',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.sampleRequestEvent.create).not.toHaveBeenCalled();
  });

  it('Shop vẫn được xét duyệt mẫu mới khi có quá hạn nhưng Admin chưa khóa', async () => {
    prisma.sampleProductRequest.findUnique.mockResolvedValue(
      overdueRequest({ status: 'PENDING' }),
    );
    prisma.product.findUnique = jest
      .fn()
      .mockResolvedValue({
        ...product,
        isActive: true,
        moderationStatus: 'APPROVED',
      });
    prisma.product.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.sampleProductRequest.count = jest.fn().mockResolvedValue(1);
    await service.approveRequest(request.id, 'shop-1');
    expect(prisma.sampleProductRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
    expect(prisma.sampleProductRequest.count).not.toHaveBeenCalled();
  });

  it('phân quyền API: Shop được báo cáo, chỉ Admin được khóa/mở khóa', () => {
    const guard = new RolesGuard(new Reflector());
    const context = (handler: any, role: string) =>
      ({
        getHandler: () => handler,
        getClass: () => SamplesController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      }) as any;
    expect(
      guard.canActivate(
        context(SamplesController.prototype.reportViolation, 'SHOP_MANAGER'),
      ),
    ).toBe(true);
    for (const handler of [
      SamplesController.prototype.resolveRequestAsAdmin,
      SamplesController.prototype.unblockCollaborator,
    ]) {
      expect(() => guard.canActivate(context(handler, 'SHOP_MANAGER'))).toThrow(
        ForbiddenException,
      );
      expect(() => guard.canActivate(context(handler, 'COLLABORATOR'))).toThrow(
        ForbiddenException,
      );
      expect(guard.canActivate(context(handler, 'SYSTEM_ADMIN'))).toBe(true);
      expect(guard.canActivate(context(handler, 'SYSTEM_MANAGER'))).toBe(true);
    }
  });
});

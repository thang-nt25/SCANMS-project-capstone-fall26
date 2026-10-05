import { ForbiddenException } from '@nestjs/common';
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
    storeId: 'store-1',
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
      user: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({ kycStatus: 'VERIFIED', sampleRequestsBlockedAt: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
        create: jest.fn().mockResolvedValue({ ...request, status: SampleRequestStatus.PENDING }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...request, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new SamplesService(prisma as PrismaService, {
      validateAllowedUrl: jest.fn(),
    } as unknown as MediaService);
  });

  it('lưu kênh, ngày dự kiến và thời điểm chấp nhận cam kết khi xin mẫu', async () => {
    const expectedVideoAt = new Date(Date.now() + 7 * 86400000).toISOString();

    await service.createRequest('kol-1', {
      productId: product.id,
      socialChannelId: channel.id,
      shippingAddress: '123 Nguyễn Văn A, Quận 1, TP.HCM',
      contentType: 'Video review 60 giây',
      expectedVideoAt,
      termsAccepted: true,
    });

    expect(prisma.sampleProductRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          socialChannelId: channel.id,
          contentType: 'Video review 60 giây',
          expectedVideoAt: new Date(expectedVideoAt),
          acceptedTermsAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true, isDeleted: false }) }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'shop-1' }) }),
    );
  });

  it('chặn xin mẫu khi KOL bị khóa', async () => {
    prisma.collaboratorProfile.findUnique.mockResolvedValue({
      kycStatus: 'VERIFIED',
      sampleRequestsBlockedAt: new Date(),
      sampleRequestsBlockReason: 'Quá hạn nộp video',
    });

    await expect(service.createRequest('kol-1', {
      productId: product.id,
      socialChannelId: channel.id,
      shippingAddress: '123 Nguyễn Văn A, Quận 1, TP.HCM',
      contentType: 'Video review 60 giây',
      expectedVideoAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      termsAccepted: true,
    })).rejects.toThrow(ForbiddenException);
    expect(prisma.sampleProductRequest.create).not.toHaveBeenCalled();
  });

  it('bắt đầu hạn đúng 14 ngày khi KOL xác nhận nhận mẫu', async () => {
    await service.confirmReceived(request.id, 'kol-1');

    const update = prisma.sampleProductRequest.update.mock.calls[0][0];
    expect(update.data.status).toBe(SampleRequestStatus.RECEIVED);
    expect(update.data.deadlineAt.getTime() - update.data.receivedAt.getTime()).toBe(14 * 86400000);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('đánh dấu quá hạn và khóa quyền xin mẫu khi chưa nộp video', async () => {
    prisma.sampleProductRequest.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: request.id, collaboratorId: 'kol-1', product: { title: product.title } }]);
    prisma.sampleProductRequest.findUnique.mockResolvedValue(request);

    await service.processDeadlines();

    expect(prisma.sampleProductRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: SampleRequestStatus.OVERDUE }) }),
    );
    expect(prisma.collaboratorProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'kol-1' },
        data: expect.objectContaining({ sampleRequestsBlockedAt: expect.any(Date) }),
      }),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, ReferralLinkStatus } from '@prisma/client';
import { ReferralLinksService } from '../referral-links.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../core/cache/cache.service';
import { ClickQueueService } from '../click-queue.service';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

describe('FR-11 — Dynamic QR Code Generation (Tạo Mã QR Code Động)', () => {
  jest.setTimeout(30000);

  let service: ReferralLinksService;
  let prisma: any;
  let cacheService: any;
  let clickQueue: any;

  const mockPublicAppUrl = 'https://scanms.vn';
  const mockCollaboratorId = 'collab-uuid-1111';
  const mockOtherCollaboratorId = 'collab-uuid-2222';
  const mockStoreOwnerId = 'shop-owner-3333';
  const mockOtherStoreOwnerId = 'shop-owner-4444';
  const mockAdminId = 'admin-uuid-9999';

  const mockLink = {
    id: 'link-uuid-1234',
    collaboratorId: mockCollaboratorId,
    storeId: 'store-uuid-5555',
    productId: 'product-uuid-6666',
    shortCode: 'a7kp2m9q',
    status: ReferralLinkStatus.ACTIVE,
    deletedAt: null,
    product: {
      id: 'product-uuid-6666',
      title: 'Tai nghe Bluetooth Pro',
      storeId: 'store-uuid-5555',
    },
    store: {
      id: 'store-uuid-5555',
      ownerId: mockStoreOwnerId,
      name: 'Thế Giới Phụ Kiện',
    },
    collaborator: {
      id: mockCollaboratorId,
      fullName: 'KOL Thắng Tech',
    },
  };

  beforeEach(async () => {
    prisma = {
      referralLink: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.deletedAt !== null) return Promise.resolve(null);
          if (where.OR) {
            const matchesId = where.OR.some((cond: any) => cond.id === mockLink.id);
            const matchesCode = where.OR.some((cond: any) => cond.shortCode === mockLink.shortCode);
            if (matchesId || matchesCode) return Promise.resolve(mockLink);
          }
          if (where.id === mockLink.id || where.shortCode === mockLink.shortCode) {
            return Promise.resolve(mockLink);
          }
          return Promise.resolve(null);
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      },
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getRedis: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(1),
      }),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 59, resetTime: Date.now() + 60000 }),
    };

    clickQueue = {
      enqueue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralLinksService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'PUBLIC_APP_URL') return mockPublicAppUrl;
              return null;
            }),
          },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: ClickQueueService, useValue: clickQueue },
      ],
    }).compile();

    service = module.get<ReferralLinksService>(ReferralLinksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 1. Kiểm tra mã hóa chính xác short URL HTTPS và giải mã (decode) bằng jsqr
  it('1. QR mã hóa đúng short URL https://scanms.vn/r/{shortCode}?via=qr và decode thành công', async () => {
    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'png', size: 1024 },
    );

    expect(result.contentType).toBe('image/png');
    expect(result.filename).toBe('SCANMS-QR-a7kp2m9q.png');
    expect(result.shortCode).toBe('a7kp2m9q');
    expect(result.shortUrl).toBe('https://scanms.vn/r/a7kp2m9q?via=qr');
    expect(Buffer.isBuffer(result.buffer)).toBe(true);

    // Giải mã ảnh PNG bằng pngjs + jsqr
    const png = PNG.sync.read(result.buffer as Buffer);
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

    expect(code).not.toBeNull();
    expect(code?.data).toBe('https://scanms.vn/r/a7kp2m9q?via=qr');
  });

  // 2. Kiểm tra định dạng SVG hợp lệ và đã sanitize
  it('2. SVG có Content-Type đúng và được sanitize (loại bỏ script)', async () => {
    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'svg', size: 512 },
    );

    expect(result.contentType).toBe('image/svg+xml; charset=utf-8');
    expect(result.filename).toBe('SCANMS-QR-a7kp2m9q.svg');
    expect(typeof result.buffer).toBe('string');
    expect(result.buffer).toContain('<svg');
    expect(result.buffer).not.toContain('<script');
    expect(result.buffer).not.toContain('onload');
    expect(result.buffer).not.toContain('javascript:');
  });

  // 3. Validate format hợp lệ (png / svg)
  it('3. Từ chối định dạng format không hợp lệ (ví dụ: pdf/jpg) với lỗi 400 Bad Request', async () => {
    await expect(
      service.generateQrCode(
        mockLink.id,
        { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
        { format: 'pdf' as any },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // 4. Validate kích thước (chỉ cho phép 512, 1024, 2048)
  it('4. Từ chối kích thước size không nằm trong danh mục (512, 1024, 2048)', async () => {
    await expect(
      service.generateQrCode(
        mockLink.id,
        { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
        { format: 'png', size: 300 },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // 5. Kiểm tra phân quyền: KOL chỉ xem/tải link của chính mình
  it('5. KOL xem và tải QR của link mình sở hữu thành công', async () => {
    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'png' },
    );
    expect(result).toBeDefined();
    expect(result.filename).toBe('SCANMS-QR-a7kp2m9q.png');
  });

  it('6. KOL A không xem/tải được QR của KOL B (403 Forbidden)', async () => {
    await expect(
      service.generateQrCode(
        mockLink.id,
        { id: mockOtherCollaboratorId, role: UserRole.COLLABORATOR },
        { format: 'png' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. Kiểm tra phân quyền: Shop chỉ xem/tải link thuộc Shop của mình
  it('7. Chủ Shop xem được QR của link tiếp thị sản phẩm thuộc Shop', async () => {
    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockStoreOwnerId, role: UserRole.SHOP_MANAGER },
      { format: 'png', download: true },
    );
    expect(result).toBeDefined();
    // Ghi audit log khi Shop xem/tải thay KOL
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockStoreOwnerId,
          action: 'QR_DOWNLOAD_AUDIT',
        }),
      }),
    );
  });

  it('8. Chủ Shop không xem được QR của link thuộc Shop khác (403 Forbidden)', async () => {
    await expect(
      service.generateQrCode(
        mockLink.id,
        { id: mockOtherStoreOwnerId, role: UserRole.SHOP_MANAGER },
        { format: 'png' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 9. Kiểm tra phân quyền: System Admin tra cứu/tải được toàn hệ thống và ghi audit
  it('9. SYSTEM_ADMIN xem/tải được QR phục vụ điều tra và ghi audit log', async () => {
    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockAdminId, role: UserRole.SYSTEM_ADMIN },
      { format: 'png', download: true },
      '192.168.1.50',
    );
    expect(result).toBeDefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockAdminId,
          action: 'QR_DOWNLOAD_AUDIT',
          ipAddress: '192.168.1.50',
        }),
      }),
    );
  });

  // 10. Link không tồn tại hoặc đã xóa mềm trả về 404
  it('10. Link không tồn tại hoặc đã xóa mềm trả về 404 NotFoundException', async () => {
    await expect(
      service.generateQrCode(
        'non-existent-id',
        { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
        { format: 'png' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  // 11. Idempotency: Gọi nhiều lần không sinh thêm link hay bản ghi dư thừa
  it('11. Cùng một link tạo QR nhiều lần trả về kết quả nhất quán, không tạo thêm link mới', async () => {
    const res1 = await service.generateQrCode(
      mockLink.id,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'png', size: 1024 },
    );
    const res2 = await service.generateQrCode(
      mockLink.shortCode,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'png', size: 1024 },
    );

    expect(res1.filename).toEqual(res2.filename);
    expect(res1.shortUrl).toEqual(res2.shortUrl);
  });

  // 12. Cache tối ưu render
  it('12. Cache hit trả về ngay kết quả đã render trong 24h', async () => {
    cacheService.get.mockResolvedValueOnce({
      bufferBase64: Buffer.from('cached-qr-png').toString('base64'),
      contentType: 'image/png',
    });

    const result = await service.generateQrCode(
      mockLink.id,
      { id: mockCollaboratorId, role: UserRole.COLLABORATOR },
      { format: 'png', size: 1024 },
    );

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.toString()).toBe('cached-qr-png');
  });
});

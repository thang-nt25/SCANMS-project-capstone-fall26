import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SampleRequestStatus } from '@prisma/client';
import {
  CreateSampleRequestDto,
  ShipSampleRequestDto,
} from './dto/sample-request.dto';

@Injectable()
export class SamplesService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // KOL: Tạo yêu cầu xin mẫu (giới hạn 1 lần / sản phẩm / KOL)
  // ------------------------------------------------------------------
  async createRequest(collaboratorId: string, dto: CreateSampleRequestDto) {
    // Kiểm tra sản phẩm tồn tại
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false },
      include: { store: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    // Kiểm tra đã xin mẫu sản phẩm này chưa (còn active)
    const existing = await this.prisma.sampleProductRequest.findFirst({
      where: {
        collaboratorId,
        productId: dto.productId,
        status: {
          in: [
            SampleRequestStatus.PENDING,
            SampleRequestStatus.APPROVED,
            SampleRequestStatus.SHIPPED,
          ],
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Bạn đã có yêu cầu xin mẫu sản phẩm này đang được xử lý. Mỗi sản phẩm chỉ được xin mẫu 1 lần.',
      );
    }

    const request = await this.prisma.sampleProductRequest.create({
      data: {
        collaboratorId,
        productId: dto.productId,
        shippingAddress: dto.shippingAddress,
        status: SampleRequestStatus.PENDING,
      },
      include: this.includeRelations(),
    });

    return request;
  }

  // ------------------------------------------------------------------
  // KOL: Lấy danh sách yêu cầu của chính mình
  // ------------------------------------------------------------------
  async getMyRequests(collaboratorId: string) {
    return this.prisma.sampleProductRequest.findMany({
      where: { collaboratorId },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations(),
    });
  }

  // ------------------------------------------------------------------
  // Shop: Lấy tất cả yêu cầu cho cửa hàng của mình
  // ------------------------------------------------------------------
  async getRequestsForShop(shopOwnerId: string, status?: SampleRequestStatus) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: shopOwnerId, isDeleted: false },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng của bạn');

    return this.prisma.sampleProductRequest.findMany({
      where: {
        product: { storeId: store.id },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations(),
    });
  }

  // ------------------------------------------------------------------
  // Chi tiết yêu cầu (KOL chỉ xem của mình, Shop chỉ xem của shop mình)
  // ------------------------------------------------------------------
  async getRequestById(requestId: string, userId: string, userRole: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: this.includeRelations(),
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu');

    if (userRole === 'COLLABORATOR' && req.collaboratorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem yêu cầu này');
    }
    if (userRole === 'SHOP_MANAGER') {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: userId, isDeleted: false },
        select: { id: true },
      });
      if (!store || req.product.storeId !== store.id) {
        throw new ForbiddenException(
          'Yêu cầu này không thuộc cửa hàng của bạn',
        );
      }
    }

    return req;
  }

  // ------------------------------------------------------------------
  // Shop: Duyệt yêu cầu
  // ------------------------------------------------------------------
  async approveRequest(requestId: string, shopOwnerId: string) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);

    if (req.status !== SampleRequestStatus.PENDING) {
      throw new BadRequestException(
        `Yêu cầu đang ở trạng thái "${req.status}", không thể duyệt`,
      );
    }

    return this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: { status: SampleRequestStatus.APPROVED },
      include: this.includeRelations(),
    });
  }

  // ------------------------------------------------------------------
  // Shop: Từ chối yêu cầu
  // ------------------------------------------------------------------
  async rejectRequest(requestId: string, shopOwnerId: string) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);

    if (req.status !== SampleRequestStatus.PENDING) {
      throw new BadRequestException(
        `Yêu cầu đang ở trạng thái "${req.status}", không thể từ chối`,
      );
    }

    return this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: { status: SampleRequestStatus.REJECTED },
      include: this.includeRelations(),
    });
  }

  // ------------------------------------------------------------------
  // Shop: Nhập mã vận đơn & chuyển trạng thái SHIPPED
  // ------------------------------------------------------------------
  async shipRequest(
    requestId: string,
    shopOwnerId: string,
    dto: ShipSampleRequestDto,
  ) {
    const req = await this.ensureShopOwns(requestId, shopOwnerId);

    if (req.status !== SampleRequestStatus.APPROVED) {
      throw new BadRequestException(
        `Chỉ có thể nhập mã vận đơn khi yêu cầu đã được duyệt (hiện tại: "${req.status}")`,
      );
    }

    return this.prisma.sampleProductRequest.update({
      where: { id: requestId },
      data: {
        status: SampleRequestStatus.SHIPPED,
        trackingNumber: dto.trackingNumber,
      },
      include: this.includeRelations(),
    });
  }

  // ------------------------------------------------------------------
  // Thống kê nhanh cho Shop
  // ------------------------------------------------------------------
  async getShopStats(shopOwnerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: shopOwnerId, isDeleted: false },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng của bạn');

    const [pending, approved, shipped, rejected] = await Promise.all([
      this.prisma.sampleProductRequest.count({
        where: {
          product: { storeId: store.id },
          status: SampleRequestStatus.PENDING,
        },
      }),
      this.prisma.sampleProductRequest.count({
        where: {
          product: { storeId: store.id },
          status: SampleRequestStatus.APPROVED,
        },
      }),
      this.prisma.sampleProductRequest.count({
        where: {
          product: { storeId: store.id },
          status: SampleRequestStatus.SHIPPED,
        },
      }),
      this.prisma.sampleProductRequest.count({
        where: {
          product: { storeId: store.id },
          status: SampleRequestStatus.REJECTED,
        },
      }),
    ]);

    return {
      pending,
      approved,
      shipped,
      rejected,
      total: pending + approved + shipped + rejected,
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------
  private includeRelations() {
    return {
      collaborator: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          sku: true,
          imageUrl: true,
          price: true,
          storeId: true,
          store: { select: { id: true, name: true } },
        },
      },
    };
  }

  private async ensureShopOwns(requestId: string, shopOwnerId: string) {
    const req = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: {
        product: {
          select: { storeId: true, store: { select: { ownerId: true } } },
        },
      },
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu xin mẫu');
    if (req.product.store.ownerId !== shopOwnerId) {
      throw new ForbiddenException('Yêu cầu này không thuộc cửa hàng của bạn');
    }
    return req;
  }
}

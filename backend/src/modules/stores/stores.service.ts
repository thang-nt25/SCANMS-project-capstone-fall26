import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy thông tin cấu hình cửa hàng của Chủ Shop (Store Owner)
   */
  async getMyStore(ownerId: string) {
    let store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false },
      include: {
        _count: {
          select: {
            products: { where: { isDeleted: false } },
            orders: true,
            campaigns: true,
          },
        },
      },
    });

    // Nếu chưa có store (chủ shop vừa đăng ký), tự tạo mới
    if (!store) {
      const user = await this.prisma.user.findUnique({
        where: { id: ownerId },
      });
      const storeName = user ? `${user.fullName} Store` : 'Cửa Hàng Chính Hãng';
      const slug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

      store = await this.prisma.store.create({
        data: {
          ownerId,
          name: storeName,
          slug,
          defaultCommissionRate: 10.0,
          attributionWindowDays: 30,
          minPayoutAmount: 200000.0,
        },
        include: {
          _count: {
            select: {
              products: { where: { isDeleted: false } },
              orders: true,
              campaigns: true,
            },
          },
        },
      });
    }

    return store;
  }

  /**
   * Cập nhật cấu hình cửa hàng (Store Settings)
   */
  async updateMyStore(ownerId: string, dto: UpdateStoreDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng của bạn');
    }

    if (dto.logoUrl !== undefined && !dto.logoUrl?.trim()) {
      throw new BadRequestException('Logo gian hàng không được để trống');
    }

    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() }),
        ...(dto.websiteUrl !== undefined && {
          websiteUrl: dto.websiteUrl?.trim(),
        }),
        ...(dto.defaultCommissionRate !== undefined && {
          defaultCommissionRate: dto.defaultCommissionRate,
        }),
        ...(dto.attributionWindowDays !== undefined && {
          attributionWindowDays: dto.attributionWindowDays,
        }),
        ...(dto.minPayoutAmount !== undefined && {
          minPayoutAmount: dto.minPayoutAmount,
        }),
      },
    });

    return {
      message: 'Cập nhật cấu hình cửa hàng thành công!',
      store: updated,
    };
  }

  /**
   * Xem thông tin public của Store theo Slug
   */
  async getStoreBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug, isDeleted: false },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        websiteUrl: true,
        defaultCommissionRate: true,
      },
    });

    if (!store) {
      throw new NotFoundException(
        'Cửa hàng không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    return store;
  }

  /**
   * Lấy toàn bộ gian hàng đang hoạt động trên sàn để KOL khám phá và kết nối
   */
  async getMarketplaceStores() {
    const stores = await this.prisma.store.findMany({
      where: { isDeleted: false, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        websiteUrl: true,
        defaultCommissionRate: true,
        isVerified: true,
        policyShipping: true,
        policyReturn: true,
        createdAt: true,
        _count: {
          select: {
            products: { where: { isDeleted: false, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stores.map((st) => ({
      ...st,
      totalProducts: st._count.products,
      category: st.name.toLowerCase().includes('tech')
        ? 'Công nghệ & Phụ kiện'
        : st.name.toLowerCase().includes('green')
        ? 'Thực phẩm & Sức khỏe'
        : 'Mỹ phẩm & Chăm sóc da',
      commissionRange: `${Number(st.defaultCommissionRate)}% - ${Math.min(
        35,
        Number(st.defaultCommissionRate) + 5,
      )}%`,
      rating: 4.9,
      location: 'TP.HCM & Hà Nội',
    }));
  }
}

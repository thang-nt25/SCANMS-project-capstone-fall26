import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tài nguyên truyền thông (Hỗ trợ lọc theo loại IMAGE/VIDEO/COPYWRITE_TEXT)
   */
  async findAll(query: QueryMediaDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.assetType) {
      where.assetType = query.assetType;
    }

    const [total, items] = await Promise.all([
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: { select: { id: true, name: true, slug: true } },
          product: {
            select: { id: true, title: true, sku: true, price: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tạo tài nguyên Media mới (Chủ Shop tải lên banner/video hoặc kịch bản SEO)
   */
  async create(ownerId: string, dto: CreateMediaDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false },
    });

    if (!store) {
      throw new ForbiddenException('Bạn chưa sở hữu cửa hàng nào');
    }

    // Nếu gán với 1 sản phẩm, kiểm tra sản phẩm đó có thuộc store không
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, storeId: store.id, isDeleted: false },
      });
      if (!product) {
        throw new NotFoundException('Sản phẩm được gán không tồn tại');
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storeId: store.id,
        productId: dto.productId || null,
        title: dto.title.trim(),
        assetType: dto.assetType,
        urlOrContent: dto.urlOrContent.trim(),
      },
      include: {
        product: { select: { id: true, title: true, sku: true } },
      },
    });

    return {
      message: 'Tải lên tài nguyên truyền thông thành công!',
      asset,
    };
  }

  /**
   * Xóa mềm tài nguyên media
   */
  async softDelete(ownerId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Tài nguyên không tồn tại');
    }

    if (asset.store.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa tài nguyên của cửa hàng khác',
      );
    }

    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: 'Đã xóa tài nguyên tiếp thị thành công' };
  }
}

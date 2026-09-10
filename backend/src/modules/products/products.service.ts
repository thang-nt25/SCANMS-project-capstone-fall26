import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách sản phẩm (Hỗ trợ phân trang, tìm kiếm, lọc danh mục)
   * Luôn tuân thủ nguyên tắc: chỉ lấy sản phẩm CHƯA XÓA (isDeleted: false)
   */
  async findAll(query: QueryProductsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.category) {
      where.categoryName = {
        contains: query.category,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              defaultCommissionRate: true,
            },
          },
          _count: {
            select: { mediaAssets: { where: { isDeleted: false } } },
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
   * Xem chi tiết một sản phẩm kèm kho Media của sản phẩm đó
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultCommissionRate: true,
            attributionWindowDays: true,
          },
        },
        mediaAssets: {
          where: { isDeleted: false },
        },
        productReviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    return product;
  }

  /**
   * Tạo sản phẩm mới (Dành cho Chủ Shop)
   */
  async create(ownerId: string, dto: CreateProductDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false },
    });

    if (!store) {
      throw new ForbiddenException(
        'Bạn chưa thiết lập cửa hàng. Vui lòng cập nhật thông tin cửa hàng trước.',
      );
    }

    // Kiểm tra trùng SKU trong cùng cửa hàng
    const existingSku = await this.prisma.product.findFirst({
      where: {
        storeId: store.id,
        sku: dto.sku.trim(),
        isDeleted: false,
      },
    });

    if (existingSku) {
      throw new ConflictException(
        `Mã SKU "${dto.sku}" đã tồn tại trong cửa hàng của bạn`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        storeId: store.id,
        sku: dto.sku.trim().toUpperCase(),
        title: dto.title.trim(),
        categoryName: dto.categoryName?.trim() || null,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        price: dto.price,
        originalPrice: dto.originalPrice || null,
        customCommissionRate: dto.customCommissionRate || null,
        stockQuantity: dto.stockQuantity || 0,
      },
    });

    return {
      message: 'Tạo sản phẩm thành công!',
      product,
    };
  }

  /**
   * Cập nhật thông tin & % hoa hồng sản phẩm
   */
  async update(ownerId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa sản phẩm của cửa hàng khác',
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.sku && { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.categoryName !== undefined && {
          categoryName: dto.categoryName?.trim() || null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl?.trim() || null,
        }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.originalPrice !== undefined && {
          originalPrice: dto.originalPrice,
        }),
        ...(dto.customCommissionRate !== undefined && {
          customCommissionRate: dto.customCommissionRate,
        }),
        ...(dto.stockQuantity !== undefined && {
          stockQuantity: dto.stockQuantity,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      message: 'Cập nhật sản phẩm thành công!',
      product: updated,
    };
  }

  /**
   * XÓA MỀM SẢN PHẨM (Soft Delete Invariant)
   * Tuyệt đối không gọi .delete() để bảo toàn toàn vẹn lịch sử đơn hàng và hoa hồng
   */
  async softDelete(ownerId: string, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa sản phẩm của cửa hàng khác',
      );
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      message:
        'Sản phẩm đã được ẩn (xóa mềm) an toàn. Lịch sử đơn hàng vẫn được bảo toàn nguyên vẹn!',
    };
  }

  /**
   * Cài đặt tỷ lệ hoa hồng hàng loạt cho nhiều sản phẩm
   */
  async bulkUpdateCommission(
    ownerId: string,
    productIds: string[],
    commissionRate: number,
  ) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false },
    });
    if (!store) {
      throw new ForbiddenException('Không tìm thấy cửa hàng của bạn');
    }

    const result = await this.prisma.product.updateMany({
      where: {
        id: { in: productIds },
        storeId: store.id,
        isDeleted: false,
      },
      data: {
        customCommissionRate: commissionRate,
      },
    });

    return {
      message: `Đã cập nhật mức hoa hồng ${commissionRate}% cho ${result.count} sản phẩm`,
      updatedCount: result.count,
    };
  }
}

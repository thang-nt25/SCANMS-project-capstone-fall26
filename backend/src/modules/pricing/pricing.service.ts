import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import { ProductsService } from '../products/products.service';
import {
  CreatePricePromotionDto,
  ReviewPricePromotionDto,
  SetFloorPriceDto,
} from './dto/pricing.dto';
import {
  assertFloor,
  lockPricingProducts,
  reconcileProductPrice,
} from './pricing-policy';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  private reviewer(role: UserRole) {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;
  }
  private async access(
    db: Prisma.TransactionClient | PrismaService,
    actorId: string,
    role: UserRole,
    productId: string,
  ) {
    if (!this.reviewer(role) && role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException('Không có quyền quản trị giá.');
    const product = await db.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        deletedAt: null,
        ...(!this.reviewer(role) ? { store: managedStoreWhere(actorId) } : {}),
      },
      include: {
        variants: { where: { isActive: true } },
        store: { select: { ownerId: true } },
      },
    });
    if (!product)
      throw new NotFoundException(
        'Không tìm thấy sản phẩm trong phạm vi quản lý.',
      );
    return product;
  }

  catalog(actorId: string, role: UserRole) {
    if (!this.reviewer(role) && role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException();
    return this.prisma.product.findMany({
      where: {
        isDeleted: false,
        deletedAt: null,
        ...(!this.reviewer(role) ? { store: managedStoreWhere(actorId) } : {}),
      },
      include: {
        variants: { where: { isActive: true } },
        store: { select: { id: true, name: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  list(actorId: string, role: UserRole) {
    if (!this.reviewer(role) && role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException();
    return this.prisma.productPricePromotion.findMany({
      where: this.reviewer(role) ? {} : { store: managedStoreWhere(actorId) },
      include: {
        product: { select: { title: true, floorPrice: true, listPrice: true } },
        variant: { select: { name: true } },
        store: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setFloor(
    actorId: string,
    role: UserRole,
    productId: string,
    dto: SetFloorPriceDto,
  ) {
    if (!this.reviewer(role))
      throw new ForbiddenException(
        'Chỉ chuyên viên vận hành hoặc Admin được cấu hình MAP.',
      );
    const result = await this.prisma.$transaction(async (tx) => {
      await lockPricingProducts(tx, [productId]);
      const product = await this.access(tx, actorId, role, productId);
      const base = product.listPrice ?? product.price;
      assertFloor(base, dto.floorPrice, 'Giá niêm yết');
      const variants = new Map(
        (dto.variants || []).map((item) => [item.variantId, item.floorPrice]),
      );
      if (!product.variants.length)
        assertFloor(product.price, dto.floorPrice, 'Giá bán hiện tại');
      for (const variant of product.variants)
        assertFloor(
          variant.price ?? product.price,
          variants.get(variant.id) ?? variant.floorPrice ?? dto.floorPrice,
          `Giá bán SKU ${variant.sku}`,
        );
      if (
        variants.size !== (dto.variants || []).length ||
        [...variants.keys()].some(
          (id) => !product.variants.some((variant) => variant.id === id),
        )
      )
        throw new BadRequestException(
          'Danh sách giá sàn phân loại không hợp lệ.',
        );
      for (const variant of product.variants)
        assertFloor(
          variant.listPrice ?? variant.price ?? base,
          variants.get(variant.id) ?? variant.floorPrice ?? dto.floorPrice,
          `SKU ${variant.sku}`,
        );
      const planned = await tx.productPricePromotion.findMany({
        where: { productId, status: { in: ['APPROVED', 'ACTIVE'] } },
      });
      for (const promotion of planned) {
        const targets = promotion.variantId
          ? product.variants.filter(
              (variant) => variant.id === promotion.variantId,
            )
          : product.variants;
        if (!targets.length)
          assertFloor(promotion.proposedPrice, dto.floorPrice);
        for (const variant of targets)
          assertFloor(
            promotion.proposedPrice,
            variants.get(variant.id) ?? variant.floorPrice ?? dto.floorPrice,
            `Khuyến mãi SKU ${variant.sku}`,
          );
      }
      const updated = await tx.product.update({
        where: { id: productId },
        data: { floorPrice: dto.floorPrice, listPrice: base },
      });
      for (const [id, floorPrice] of variants) {
        const variant = product.variants.find((item) => item.id === id)!;
        await tx.productVariant.update({
          where: { id },
          data: {
            floorPrice,
            listPrice: variant.listPrice ?? variant.price ?? base,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'PRODUCT_MAP_CONFIGURED',
          details: {
            productId,
            previousFloor: product.floorPrice?.toString() ?? null,
            floorPrice: dto.floorPrice,
            variants: (dto.variants || []).map((item) => ({
              variantId: item.variantId,
              floorPrice: item.floorPrice,
            })),
            reason: dto.reason,
          },
        },
      });
      return updated;
    });
    await this.products.invalidateLandingCache(productId);
    return result;
  }

  private validatePrice(
    product: Awaited<ReturnType<PricingService['access']>>,
    dto: { variantId?: string | null; proposedPrice: Prisma.Decimal | number },
  ) {
    const targets = dto.variantId
      ? product.variants.filter((variant) => variant.id === dto.variantId)
      : product.variants;
    if (dto.variantId && !targets.length)
      throw new BadRequestException(
        'Phân loại không thuộc sản phẩm hoặc đã ngừng bán.',
      );
    if (!targets.length) {
      if (product.floorPrice == null)
        throw new BadRequestException(
          'Sản phẩm chưa có giá sàn được phê duyệt.',
        );
      assertFloor(dto.proposedPrice, product.floorPrice);
      if (
        new Prisma.Decimal(dto.proposedPrice).gte(
          product.listPrice ?? product.price,
        )
      )
        throw new BadRequestException(
          'Giá khuyến mãi phải thấp hơn giá niêm yết.',
        );
    }
    for (const variant of targets) {
      const floor = variant.floorPrice ?? product.floorPrice;
      if (floor == null)
        throw new BadRequestException(`SKU ${variant.sku} chưa có giá sàn.`);
      assertFloor(dto.proposedPrice, floor, `SKU ${variant.sku}`);
      if (
        new Prisma.Decimal(dto.proposedPrice).gte(
          variant.listPrice ??
            variant.price ??
            product.listPrice ??
            product.price,
        )
      )
        throw new BadRequestException(
          `Giá khuyến mãi SKU ${variant.sku} phải thấp hơn giá niêm yết.`,
        );
    }
  }

  async create(actorId: string, role: UserRole, dto: CreatePricePromotionDto) {
    if (role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException(
        'Shop Manager gửi yêu cầu, bộ phận vận hành phê duyệt.',
      );
    const now = new Date();
    if (
      dto.endsAt <= dto.startsAt ||
      dto.endsAt <= now ||
      dto.startsAt.getTime() < now.getTime() - 60000 ||
      dto.endsAt.getTime() - dto.startsAt.getTime() > 366 * 86400000
    )
      throw new BadRequestException(
        'Thời gian khuyến mãi không hợp lệ hoặc quá 366 ngày.',
      );
    return this.prisma.$transaction(async (tx) => {
      await lockPricingProducts(tx, [dto.productId]);
      const product = await this.access(tx, actorId, role, dto.productId);
      if (product.moderationStatus !== 'APPROVED' || !product.isActive)
        throw new BadRequestException(
          'Chỉ gửi khuyến mãi cho sản phẩm đang bán đã kiểm duyệt.',
        );
      this.validatePrice(product, dto);
      const promotion = await tx.productPricePromotion.create({
        data: {
          storeId: product.storeId,
          productId: product.id,
          variantId: dto.variantId,
          requestedById: actorId,
          proposedPrice: dto.proposedPrice,
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          budgetTotal: dto.budgetTotal,
          reason: dto.reason.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'PRICE_PROMOTION_REQUESTED',
          details: { promotionId: promotion.id, productId: product.id },
        },
      });
      const reviewers = await tx.user.findMany({
        where: {
          role: { in: ['SYSTEM_ADMIN', 'SYSTEM_MANAGER'] },
          isActive: true,
          isDeleted: false,
        },
        select: { id: true },
      });
      if (reviewers.length)
        await tx.notification.createMany({
          data: reviewers.map((user) => ({
            userId: user.id,
            type: 'PRICE_PROMOTION_PENDING',
            title: 'Yêu cầu khuyến mãi cần duyệt',
            message: `Shop đề nghị giảm giá ${product.title}.`,
            data: { promotionId: promotion.id, link: '/admin/pricing' },
          })),
        });
      return promotion;
    });
  }

  async review(
    actorId: string,
    role: UserRole,
    id: string,
    dto: ReviewPricePromotionDto,
  ) {
    if (!this.reviewer(role))
      throw new ForbiddenException(
        'Chỉ bộ phận vận hành được phê duyệt khuyến mãi.',
      );
    const initial = await this.prisma.productPricePromotion.findUnique({
      where: { id },
    });
    if (!initial) throw new NotFoundException();
    const result = await this.prisma.$transaction(async (tx) => {
      await lockPricingProducts(tx, [initial.productId]);
      const promotion = await tx.productPricePromotion.findUniqueOrThrow({
        where: { id },
      });
      if (promotion.requestedById === actorId)
        throw new ForbiddenException('Người gửi không được tự duyệt yêu cầu.');
      if (promotion.status !== 'PENDING')
        throw new ConflictException('Yêu cầu đã được xử lý.');
      const product = await this.access(tx, actorId, role, promotion.productId);
      if (dto.approve) {
        if (promotion.endsAt <= new Date())
          throw new BadRequestException(
            'Khoảng thời gian đề xuất đã kết thúc.',
          );
        this.validatePrice(product, promotion);
        const overlap = await tx.productPricePromotion.count({
          where: {
            productId: promotion.productId,
            status: { in: ['APPROVED', 'ACTIVE'] },
            startsAt: { lt: promotion.endsAt },
            endsAt: { gt: promotion.startsAt },
            ...(promotion.variantId
              ? {
                  OR: [{ variantId: null }, { variantId: promotion.variantId }],
                }
              : {}),
          },
        });
        if (overlap)
          throw new ConflictException(
            'Có khuyến mãi đã duyệt trùng thời gian và sản phẩm/phân loại.',
          );
      }
      await tx.productPricePromotion.update({
        where: { id },
        data: {
          status: dto.approve ? 'APPROVED' : 'REJECTED',
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: dto.note.trim(),
        },
      });
      if (dto.approve) await reconcileProductPrice(tx, promotion.productId);
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: dto.approve
            ? 'PRICE_PROMOTION_APPROVED'
            : 'PRICE_PROMOTION_REJECTED',
          details: { promotionId: id, note: dto.note },
        },
      });
      await tx.notification.create({
        data: {
          userId: promotion.requestedById,
          type: 'PRICE_PROMOTION_REVIEWED',
          title: dto.approve
            ? 'Khuyến mãi đã được duyệt'
            : 'Khuyến mãi bị từ chối',
          message: dto.note,
          data: { promotionId: id, link: '/merchant/pricing' },
        },
      });
      return tx.productPricePromotion.findUniqueOrThrow({ where: { id } });
    });
    await this.products.invalidateLandingCache(initial.productId);
    return result;
  }

  async cancel(actorId: string, role: UserRole, id: string) {
    const initial = await this.prisma.productPricePromotion.findUnique({
      where: { id },
    });
    if (!initial) throw new NotFoundException();
    const result = await this.prisma.$transaction(async (tx) => {
      await lockPricingProducts(tx, [initial.productId]);
      await this.access(tx, actorId, role, initial.productId);
      const promotion = await tx.productPricePromotion.findUniqueOrThrow({
        where: { id },
      });
      if (!['PENDING', 'APPROVED', 'ACTIVE'].includes(promotion.status))
        throw new ConflictException('Khuyến mãi đã kết thúc.');
      const updated = await tx.productPricePromotion.update({
        where: { id },
        data: { status: 'CANCELLED', finishedAt: new Date() },
      });
      await reconcileProductPrice(tx, initial.productId);
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'PRICE_PROMOTION_CANCELLED',
          details: { promotionId: id },
        },
      });
      return updated;
    });
    await this.products.invalidateLandingCache(initial.productId);
    return result;
  }

  @Cron('*/30 * * * * *')
  async reconcileDue() {
    const ids = await this.prisma.productPricePromotion.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      distinct: ['productId'],
      select: { productId: true },
    });
    for (const { productId } of ids) {
      try {
        await this.prisma.$transaction(
          (tx) => reconcileProductPrice(tx, productId),
          { timeout: 15000 },
        );
        await this.products.invalidateLandingCache(productId);
      } catch {
        this.logger.warn(
          `Could not reconcile price for product ${productId}; transaction rolled back.`,
        );
      }
    }
  }
}

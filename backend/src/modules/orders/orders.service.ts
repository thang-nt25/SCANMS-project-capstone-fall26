import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { CancelOrderDto, GuestCancelOrderDto } from './dto/cancel-order.dto';
import {
  OrderStatus,
  AttributionMethod,
  CommissionStatus,
  CouponStatus,
  TransactionType,
  CouponRedemptionStatus,
  UserRole,
  Prisma,
} from '@prisma/client';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Tạo đơn hàng mới (Dành cho Guest Storefront hoặc giỏ hàng)
   */
  async createOrder(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // 0. Kiểm tra Idempotency chống đặt đơn trùng lặp (Issue 3 & 4)
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException('Thiếu idempotencyKey cho phiên đặt hàng.');
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  imageUrl: true,
                  categoryName: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          attributedCollaborator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (existingOrder) {
        return {
          message: 'Đơn hàng đã được ghi nhận thành công (Idempotent replay)',
          order: existingOrder,
        };
      }

    // 1. Xác định Store
    let store: any = null;
    if (dto.storeId) {
      store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
    } else if (dto.storeSlug) {
      store = await this.prisma.store.findUnique({
        where: { slug: dto.storeSlug },
      });
    } else {
      store = await this.prisma.store.findFirst({
        where: { isDeleted: false },
      });
    }

    if (!store) {
      throw new NotFoundException('Không tìm thấy gian hàng tương ứng');
    }

    // 2. Nhận diện KOL Attribution ban đầu từ Referral Link (Cookie / Last-Click)
    let attributedCollaboratorId: string | null = null;
    let attributionMethod: AttributionMethod | null = null;
    let matchedLink: any = null;

    if (dto.cookieRefCode?.trim()) {
      const cleanRef = dto.cookieRefCode.trim();
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          cleanRef,
        );
      matchedLink = await this.prisma.referralLink.findFirst({
        where: {
          OR: [
            { shortCode: cleanRef },
            ...(isUuid ? [{ id: cleanRef }] : []),
          ],
          deletedAt: null,
        },
        include: { collaborator: true },
      });

      if (matchedLink) {
        attributedCollaboratorId = matchedLink.collaboratorId;
        attributionMethod = AttributionMethod.COOKIE;
      }
    }

    const referralLinkId = matchedLink?.id || null;

    // 3. Lấy danh sách sản phẩm từ DB và xác thực tính hợp lệ (Issue 5: Tuyệt đối không chấp nhận giá giả mạo từ client)
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: store.id,
        isDeleted: false,
        isActive: true,
      },
    });

    if (dbProducts.length !== dto.items.length) {
      throw new BadRequestException(
        'Một hoặc nhiều sản phẩm trong giỏ hàng không tồn tại, đã ngừng kinh doanh hoặc không thuộc gian hàng này.',
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let rawSubtotalAmount = 0;
    let anyProductHasDirectDiscount = false;
    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new BadRequestException(`Sản phẩm ${item.productId} không hợp lệ.`);
      }
      const unitPrice = Number(prod.price);
      rawSubtotalAmount += unitPrice * item.quantity;

      // Kiểm tra nếu sản phẩm có giá ưu đãi trực tiếp hoặc client truyền cờ
      if (prod.originalPrice && Number(prod.originalPrice) > unitPrice) {
        anyProductHasDirectDiscount = true;
      }
    }

    // 4. Xử lý Coupon Attribution, Chiết khấu & Kiểm tra chính sách cộng dồn (Issue 6 & FR-12)
    let couponValidationResult: any = null;
    let overrideReason: string | null = null;
    let originalAttributionMethod: AttributionMethod | null = null;
    let originalCollaboratorId: string | null = null;

    if (dto.couponCode?.trim()) {
      couponValidationResult = await this.couponsService.validateCoupon(
        {
          code: dto.couponCode.trim(),
          storeId: store.id,
          customerPhone: dto.customerPhone,
          items: dto.items,
          hasProductDiscount: dto.hasProductDiscount || anyProductHasDirectDiscount,
          hasShopVoucher: dto.hasShopVoucher,
          hasPlatformVoucher: dto.hasPlatformVoucher,
        },
        undefined,
        undefined,
        undefined,
      );

      // Section 23: Coupon hợp lệ ưu tiên hơn attribution cookie/link của KOL khác
      if (
        attributedCollaboratorId &&
        attributedCollaboratorId !== couponValidationResult.collaboratorId
      ) {
        originalCollaboratorId = attributedCollaboratorId;
        originalAttributionMethod = attributionMethod;
        overrideReason = 'COUPON_OVERRIDE_COOKIE';
      }

      // Gán attribution đơn hàng cho KOL sở hữu coupon (Section 22 & 24)
      attributedCollaboratorId = couponValidationResult.collaboratorId;
      attributionMethod = AttributionMethod.COUPON;
    }

    // 5. Lấy thông tin cấp bậc Tier của KOL để tính thêm % thưởng (nếu có)
    let extraTierRate = 0;
    if (attributedCollaboratorId) {
      const collabProfile = await this.prisma.collaboratorProfile.findUnique({
        where: { userId: attributedCollaboratorId },
        include: { tier: true },
      });
      if (collabProfile?.tier?.extraBonusPercentage) {
        extraTierRate = Number(collabProfile.tier.extraBonusPercentage);
      }
    }

    // Số tiền giảm giá thực tế tính từ Coupon (Section 14, 15, 20)
    const discountAmount = couponValidationResult?.discountAmount || 0;
    const subtotalAmount = rawSubtotalAmount;
    const finalAmount = Math.max(0, subtotalAmount - discountAmount);

    // Tỷ lệ sau giảm giá để tính hoa hồng chính xác (Section 31: hoa hồng tính trên doanh thu sau giảm giá)
    const discountRatio =
      subtotalAmount > 0 ? (subtotalAmount - discountAmount) / subtotalAmount : 1;

    let totalCommissionAmount = 0;
    const orderItemsToCreate: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      appliedCommissionRate: number;
      calculatedCommissionAmount: number;
    }> = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.productId)!;
      const unitPrice = Number(prod.price); // 100% lấy giá thật từ DB
      const quantity = item.quantity;
      const baseCommissionRate = prod.customCommissionRate
        ? Number(prod.customCommissionRate)
        : Number(store.defaultCommissionRate || 10);

      const finalCommissionRate = baseCommissionRate + extraTierRate;
      const itemSubtotal = unitPrice * quantity;
      const netItemSubtotal = itemSubtotal * discountRatio;
      const itemCommission = netItemSubtotal * (finalCommissionRate / 100);

      totalCommissionAmount += itemCommission;

      orderItemsToCreate.push({
        productId: prod.id,
        quantity,
        unitPrice,
        appliedCommissionRate: finalCommissionRate,
        calculatedCommissionAmount: itemCommission,
      });
    }

    // Sinh mã đơn hàng chuẩn định danh
    const externalOrderSn = `DH-${new Date().getFullYear()}-${Math.floor(
      10000 + Math.random() * 90000,
    )}`;

    // 6. Thực thi Lưu đơn hàng, Khóa hàng chống Race Condition Coupon và Phân bổ Hoa hồng trong Transaction (Issue 2 & 3)
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let shopFundedAmount = 0;
      let platformFundedAmount = 0;
      let appliedDiscountAmount = discountAmount;
      let finalCommissionAmountToUse = totalCommissionAmount;
      let finalOrderItemsToSave = orderItemsToCreate;

      // 6.1 Khóa hàng và kiểm tra toàn diện quy tắc Coupon trong Transaction (Issue 2 & 3)
      if (couponValidationResult) {
        // Khóa độc quyền hàng Coupon trên cơ sở dữ liệu
        await tx.$queryRaw`
          SELECT id FROM coupons
          WHERE id = ${couponValidationResult.couponId}::uuid
          FOR UPDATE
        `;

        const lockedCoupon = await tx.coupon.findUnique({
          where: { id: couponValidationResult.couponId },
          include: {
            couponProducts: true,
            couponCategories: true,
          },
        });

        if (!lockedCoupon) {
          throw new ConflictException('Mã giảm giá không tồn tại');
        }

        if (lockedCoupon.status !== CouponStatus.ACTIVE) {
          throw new ConflictException('Mã giảm giá không còn ở trạng thái hiệu lực');
        }

        // Kiểm tra thời hạn hiệu lực trong transaction (Issue 3)
        const now = new Date();
        if (lockedCoupon.startsAt && now < lockedCoupon.startsAt) {
          throw new ConflictException('Mã giảm giá chưa đến thời điểm áp dụng');
        }
        if (lockedCoupon.expiresAt && now > lockedCoupon.expiresAt) {
          throw new ConflictException('Mã giảm giá đã hết hạn sử dụng');
        }

        // Kiểm tra chính sách cộng dồn trong transaction (Issue 3)
        if (
          !lockedCoupon.stackableWithProductDiscount &&
          (dto.hasProductDiscount || anyProductHasDirectDiscount)
        ) {
          throw new ConflictException(
            'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang giảm giá trực tiếp',
          );
        }
        if (!lockedCoupon.stackableWithShopVoucher && dto.hasShopVoucher) {
          throw new ConflictException(
            'Mã giảm giá này không được cộng dồn với voucher khác của Shop',
          );
        }
        if (!lockedCoupon.stackableWithPlatformVoucher && dto.hasPlatformVoucher) {
          throw new ConflictException(
            'Mã giảm giá này không được cộng dồn với voucher toàn sàn SCANMS',
          );
        }

        // Kiểm tra phạm vi áp dụng sản phẩm/danh mục/chiến dịch trong transaction (Issue 3)
        let campaignProductIds = new Set<string>();
        if (lockedCoupon.scopeType === 'CAMPAIGN' && lockedCoupon.campaignId) {
          const campProds = await tx.campaignProduct.findMany({
            where: { campaignId: lockedCoupon.campaignId },
            select: { productId: true },
          });
          campaignProductIds = new Set(campProds.map((cp) => cp.productId));
        }

        let eligibleSubtotalInTx = 0;
        for (const item of dto.items) {
          const prod = productMap.get(item.productId)!;
          const unitPrice = Number(prod.price);
          let isItemEligible = false;

          if (lockedCoupon.scopeType === 'STORE_WIDE') {
            isItemEligible = true;
          } else if (lockedCoupon.scopeType === 'PRODUCTS') {
            isItemEligible = lockedCoupon.couponProducts.some(
              (cp) => cp.productId === prod.id,
            );
          } else if (lockedCoupon.scopeType === 'CATEGORIES') {
            const prodCategory = (prod.categoryName || '').toLowerCase();
            isItemEligible = lockedCoupon.couponCategories.some(
              (cc) => cc.categoryName.toLowerCase() === prodCategory,
            );
          } else if (lockedCoupon.scopeType === 'CAMPAIGN') {
            isItemEligible =
              campaignProductIds.size > 0
                ? campaignProductIds.has(prod.id)
                : true;
          }

          if (isItemEligible) {
            eligibleSubtotalInTx += unitPrice * item.quantity;
          }
        }

        if (eligibleSubtotalInTx <= 0) {
          throw new ConflictException(
            'Không có sản phẩm nào trong giỏ hàng đủ điều kiện áp dụng mã giảm giá này',
          );
        }

        // Kiểm tra đơn tối thiểu trong transaction (Issue 3)
        if (
          lockedCoupon.minimumOrderAmount &&
          eligibleSubtotalInTx < Number(lockedCoupon.minimumOrderAmount)
        ) {
          throw new ConflictException(
            `Đơn hàng chưa đạt giá trị tối thiểu ${Number(
              lockedCoupon.minimumOrderAmount,
            ).toLocaleString('vi-VN')} ₫ để áp dụng mã này`,
          );
        }

        // Tính toán lại giá trị giảm giá chính xác theo cấu hình mới nhất trong transaction (Issue 3)
        let txDiscount = 0;
        if (lockedCoupon.discountType === 'PERCENTAGE') {
          txDiscount = Math.round(
            eligibleSubtotalInTx * (Number(lockedCoupon.discountValue) / 100),
          );
          if (lockedCoupon.maximumDiscountAmount) {
            txDiscount = Math.min(
              txDiscount,
              Number(lockedCoupon.maximumDiscountAmount),
            );
          }
        } else {
          txDiscount = Math.min(
            eligibleSubtotalInTx,
            Number(lockedCoupon.discountValue),
          );
        }
        txDiscount = Math.max(0, txDiscount);

        // Kiểm tra quota tổng trong transaction
        if (
          lockedCoupon.usageLimitTotal !== null &&
          lockedCoupon.usageCount >= lockedCoupon.usageLimitTotal
        ) {
          throw new ConflictException('Mã giảm giá đã đạt giới hạn lượt sử dụng');
        }

        // Kiểm tra ngân sách tổng trong transaction
        if (lockedCoupon.budgetTotal !== null) {
          const currentBudgetUsed = Number(lockedCoupon.budgetUsed);
          const totalBudget = Number(lockedCoupon.budgetTotal);
          if (currentBudgetUsed + txDiscount > totalBudget) {
            throw new ConflictException(
              'Mã giảm giá đã vượt quá ngân sách cho phép',
            );
          }
        }

        // Kiểm tra quota trên từng khách hàng trong transaction
        if (dto.customerPhone?.trim()) {
          const customerPhone = dto.customerPhone.trim();
          const customerRedemptionCount = await tx.couponRedemption.count({
            where: {
              couponId: lockedCoupon.id,
              customerPhone,
              status: {
                in: [
                  CouponRedemptionStatus.USED,
                  CouponRedemptionStatus.RESERVED,
                ],
              },
            },
          });
          if (customerRedemptionCount >= lockedCoupon.usageLimitPerCustomer) {
            throw new ConflictException(
              `Khách hàng đã sử dụng tối đa ${lockedCoupon.usageLimitPerCustomer} lượt cho mã này.`,
            );
          }
        }

        // Cập nhật tăng atomic quota và ngân sách theo giá trị giảm giá đã xác minh trong tx
        await tx.coupon.update({
          where: { id: lockedCoupon.id },
          data: {
            usageCount: { increment: 1 },
            budgetUsed: { increment: txDiscount },
          },
        });

        // Tính phân bổ tỷ lệ đồng tài trợ
        const shopRate = Number(lockedCoupon.shopFundingRate || 100) / 100;
        const platformRate = Number(lockedCoupon.platformFundingRate || 0) / 100;
        shopFundedAmount = Math.round(txDiscount * shopRate);
        platformFundedAmount = txDiscount - shopFundedAmount;

        appliedDiscountAmount = txDiscount;

        // Cập nhật lại hoa hồng theo discount thực tế trong transaction
        const txDiscountRatio =
          subtotalAmount > 0
            ? (subtotalAmount - appliedDiscountAmount) / subtotalAmount
            : 1;

        finalCommissionAmountToUse = 0;
        finalOrderItemsToSave = orderItemsToCreate.map((item) => {
          const itemSubtotal = item.unitPrice * item.quantity;
          const netItemSubtotal = itemSubtotal * txDiscountRatio;
          const recalculatedCommission =
            netItemSubtotal * (item.appliedCommissionRate / 100);
          finalCommissionAmountToUse += recalculatedCommission;

          return {
            ...item,
            calculatedCommissionAmount: recalculatedCommission,
          };
        });
      }

      const orderFinalAmount = Math.max(0, subtotalAmount - appliedDiscountAmount);
      const cancellationToken = randomUUID();

      // 6.2 Lưu đơn hàng kèm đầy đủ snapshot coupon & attribution & idempotencyKey (Issue 3 & 4)
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          externalOrderSn,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
          cancellationToken,
          attributedCollaboratorId,
          attributionMethod,
          referralLinkId,
          couponId: couponValidationResult?.couponId || null,
          couponCodeSnapshot: couponValidationResult?.code || null,
          couponDiscountAmount: appliedDiscountAmount,
          overrideReason,
          originalAttributionMethod,
          originalCollaboratorId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          subtotalAmount,
          discountAmount: appliedDiscountAmount,
          finalAmount: orderFinalAmount,
          status: OrderStatus.PENDING,
          orderItems: {
            create: finalOrderItemsToSave.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              appliedCommissionRate: item.appliedCommissionRate,
              calculatedCommissionAmount: item.calculatedCommissionAmount,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  imageUrl: true,
                  categoryName: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          attributedCollaborator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      // 6.3 Ghi nhận bản ghi Coupon Redemption (Issue 7: Phân bổ tài trợ rõ ràng)
      if (couponValidationResult) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponValidationResult.couponId,
            orderId: order.id,
            collaboratorId: couponValidationResult.collaboratorId,
            storeId: couponValidationResult.storeId,
            customerPhone: dto.customerPhone || null,
            status: CouponRedemptionStatus.USED,
            discountAmount: new Prisma.Decimal(appliedDiscountAmount),
            shopFundedAmount: new Prisma.Decimal(shopFundedAmount),
            platformFundedAmount: new Prisma.Decimal(platformFundedAmount),
            eligibleSubtotal: new Prisma.Decimal(
              couponValidationResult.eligibleSubtotal,
            ),
            couponCodeSnapshot: couponValidationResult.code,
            discountTypeSnapshot: couponValidationResult.discountType,
            discountValueSnapshot: new Prisma.Decimal(
              couponValidationResult.discountValue,
            ),
          },
        });
      }

      // 6.4 Nếu có KOL được hưởng hoa hồng -> Tạo bản ghi hoa hồng và cộng vào ví chờ
      if (attributedCollaboratorId && finalCommissionAmountToUse > 0) {
        await tx.commission.create({
          data: {
            collaboratorId: attributedCollaboratorId,
            orderId: order.id,
            commissionAmount: new Prisma.Decimal(finalCommissionAmountToUse),
            status: CommissionStatus.PENDING,
          },
        });

        // Tăng pendingBalance của ví KOL
        await tx.wallet.upsert({
          where: { collaboratorId: attributedCollaboratorId },
          create: {
            collaboratorId: attributedCollaboratorId,
            pendingBalance: new Prisma.Decimal(finalCommissionAmountToUse),
            availableBalance: new Prisma.Decimal(0),
          },
          update: {
            pendingBalance: { increment: finalCommissionAmountToUse },
          },
        });

        // Tăng bộ đếm đơn hàng cho link tiếp thị (nếu có)
        if (referralLinkId) {
          await tx.referralLink.update({
            where: { id: referralLinkId },
            data: {
              totalOrders: { increment: 1 },
            },
          });
        }
      }

      return order;
    });

    return {
      message: 'Đặt hàng thành công!',
      order: createdOrder,
      cancellationToken: (createdOrder as any).cancellationToken || undefined,
    };
  }

  /**
   * Hủy đơn hàng an toàn cho người dùng đã xác thực (Admin, Chủ Shop, Người mua sở hữu đơn) (Issue 2 & 4)
   */
  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Phân quyền hủy đơn (Issue 2)
    const isAdmin =
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      currentUser.role === UserRole.SYSTEM_MANAGER;

    if (!isAdmin) {
      if (currentUser.role === UserRole.SHOP_MANAGER) {
        if (order.store.ownerId !== currentUser.id) {
          throw new ForbiddenException(
            'Bạn không phải chủ sở hữu gian hàng chứa đơn hàng này',
          );
        }
      } else {
        throw new ForbiddenException(
          'Chỉ Quản trị viên hoặc Chủ gian hàng mới có quyền hủy đơn tại cổng này. Khách hàng vui lòng dùng chức năng hủy đơn bằng số điện thoại.',
        );
      }
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${order.status}`,
      );
    }

    return this.executeOrderCancellation(
      orderId,
      dto.reason || 'Người dùng yêu cầu hủy đơn',
      currentUser.id,
    );
  }

  /**
   * Khách mua hàng vãng lai yêu cầu hủy đơn (Xác thực bằng Cancellation Token + Số điện thoại + Rate Limit) (Issue 2)
   */
  async guestCancelOrder(
    orderId: string,
    dto: GuestCancelOrderDto,
    clientIp?: string,
  ) {
    // 1. Rate limit chống Brute-Force: Tối đa 5 lần thử trong 15 phút
    const rateLimitKey = `guest_cancel_${orderId}_${clientIp || 'unknown'}`;
    const isAllowed = await this.cacheService.checkRateLimit(
      rateLimitKey,
      5,
      900,
    );
    if (!isAllowed) {
      throw new HttpException(
        'Bạn đã thử hủy đơn quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // 2. Xác thực bằng Cancellation Token được cấp bảo mật lúc tạo đơn
    if (
      !dto.cancellationToken ||
      !order.cancellationToken ||
      dto.cancellationToken.trim() !== order.cancellationToken.trim()
    ) {
      throw new ForbiddenException(
        'Mã xác thực hủy đơn (Cancellation Token) không chính xác',
      );
    }

    // 3. Xác thực kép cùng số điện thoại đặt hàng
    if (
      !dto.customerPhone ||
      !order.customerPhone ||
      dto.customerPhone.trim() !== order.customerPhone.trim()
    ) {
      throw new ForbiddenException(
        'Số điện thoại xác minh không khớp với số điện thoại đặt hàng',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${order.status}`,
      );
    }

    return this.executeOrderCancellation(
      orderId,
      dto.reason || 'Khách vãng lai yêu cầu hủy đơn',
    );
  }

  /**
   * Thực hiện hủy đơn, hoàn lại Coupon và thu hồi hoa hồng trong Transaction
   */
  private async executeOrderCancellation(
    orderId: string,
    reason?: string,
    actorId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          commissions: true,
          referralLink: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể hủy đơn hàng đang ở trạng thái ${order.status}`,
        );
      }

      // 1. Chuyển trạng thái đơn hàng sang CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // 2. Xử lý hoàn trả Coupon (Issue 4)
      const redemption = await tx.couponRedemption.findUnique({
        where: { orderId },
      });

      if (redemption && redemption.status === CouponRedemptionStatus.USED) {
        // Chuyển redemption status sang CANCELLED
        await tx.couponRedemption.update({
          where: { id: redemption.id },
          data: { status: CouponRedemptionStatus.CANCELLED },
        });

        // Hoàn lại usageCount và budgetUsed
        await tx.coupon.update({
          where: { id: redemption.couponId },
          data: {
            usageCount: { decrement: 1 },
            budgetUsed: { decrement: redemption.discountAmount },
          },
        });
      }

      // 3. Thu hồi hoa hồng (Clawback) của KOL
      if (order.attributedCollaboratorId) {
        for (const comm of order.commissions) {
          if (comm.status === CommissionStatus.PENDING) {
            await tx.commission.update({
              where: { id: comm.id },
              data: { status: CommissionStatus.REVERSED },
            });

            // Trừ lại số dư ví chờ của KOL
            await tx.wallet.update({
              where: { collaboratorId: order.attributedCollaboratorId },
              data: {
                pendingBalance: { decrement: comm.commissionAmount },
              },
            });
          }
        }

        // Giảm totalOrders trên ReferralLink nếu có
        if (order.referralLinkId) {
          await tx.referralLink.update({
            where: { id: order.referralLinkId },
            data: { totalOrders: { decrement: 1 } },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'ORDER_CANCELLED',
          details: {
            orderId,
            orderSn: order.externalOrderSn,
            reason: reason || 'Khách hủy hoặc Shop hủy',
            couponRedemptionReversed: !!redemption,
          },
        },
      });

      return {
        message: 'Đã hủy đơn hàng và hoàn trả ưu đãi thành công',
        order: updatedOrder,
      };
    });
  }

  /**
   * FR-17: Tra cứu tiến độ đơn hàng công khai bằng SĐT hoặc Mã đơn hàng
   */
  async trackOrderByPhoneOrSn(query: TrackOrderQueryDto) {
    const { phone, orderSn } = query;

    if (!phone?.trim() && !orderSn?.trim()) {
      throw new BadRequestException(
        'Vui lòng nhập số điện thoại hoặc mã đơn hàng để tra cứu tiến trình đơn hàng.',
      );
    }

    const whereConditions: any = {};
    if (phone?.trim()) {
      whereConditions.customerPhone = {
        contains: phone.trim(),
      };
    }
    if (orderSn?.trim()) {
      whereConditions.externalOrderSn = {
        contains: orderSn.trim(),
        mode: 'insensitive',
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                imageUrl: true,
                categoryName: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        attributedCollaborator: {
          select: {
            id: true,
            fullName: true,
          },
        },
        productReviews: true,
      },
    });

    // Thêm metadata Timeline cho từng đơn hàng
    const formattedOrders = orders.map((order) => {
      let timelineStep = 1;
      let statusLabel = 'Đã tiếp nhận đơn';
      let statusColor = '#B88E4F'; // Sand Gold

      switch (order.status) {
        case OrderStatus.PENDING:
          timelineStep = 1;
          statusLabel = 'Đã tiếp nhận • Đang chuẩn bị hàng';
          statusColor = '#B88E4F';
          break;
        case OrderStatus.SHIPPING:
          timelineStep = 2;
          statusLabel = 'Đang giao hàng (Đơn vị GHN / GHTK)';
          statusColor = '#2563EB';
          break;
        case OrderStatus.DELIVERED:
          timelineStep = 3;
          statusLabel = 'Giao hàng thành công • Khách đã nhận';
          statusColor = '#16A34A';
          break;
        case OrderStatus.COMPLETED:
          timelineStep = 4;
          statusLabel = 'Đơn hàng hoàn tất';
          statusColor = '#16A34A';
          break;
        case OrderStatus.CANCELLED:
          timelineStep = 0;
          statusLabel = 'Đơn hàng đã bị hủy';
          statusColor = '#DC2626';
          break;
        case OrderStatus.RETURNED:
          timelineStep = -1;
          statusLabel = 'Đơn hàng đã hoàn trả (Return & Refund)';
          statusColor = '#9333EA';
          break;
      }

      return {
        id: order.id,
        externalOrderSn: order.externalOrderSn,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        subtotalAmount: Number(order.subtotalAmount),
        discountAmount: Number(order.discountAmount),
        finalAmount: Number(order.finalAmount),
        status: order.status,
        statusLabel,
        statusColor,
        timelineStep,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        store: order.store,
        attributedCollaborator: order.attributedCollaborator,
        items: order.orderItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productTitle: item.product.title,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * item.quantity,
        })),
        reviews: order.productReviews,
      };
    });

    return {
      totalFound: formattedOrders.length,
      orders: formattedOrders,
    };
  }

  /**
   * FR-18: Gửi đánh giá 1-5 sao và nhận xét sau khi nhận hàng thành công
   */
  async addOrderReview(orderId: string, dto: CreateOrderReviewDto) {
    // 1. Kiểm tra đơn hàng tồn tại
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng yêu cầu');
    }

    // 2. Nghiệp vụ FR-18: Đơn hàng phải ở trạng thái DELIVERED hoặc COMPLETED mới được review
    if (
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Chỉ có thể gửi đánh giá khi đơn hàng đã được giao nhận thành công (Trạng thái DELIVERED hoặc COMPLETED).',
      );
    }

    // 3. Kiểm tra sản phẩm có thuộc đơn hàng này không
    const itemInOrder = order.orderItems.find(
      (item) => item.productId === dto.productId,
    );
    if (!itemInOrder) {
      throw new BadRequestException(
        'Sản phẩm này không nằm trong danh mục sản phẩm của đơn hàng.',
      );
    }

    // 4. Chống gửi review trùng lặp cho cùng 1 sản phẩm trong 1 đơn hàng
    const existingReview = await this.prisma.productReview.findFirst({
      where: {
        orderId: order.id,
        productId: dto.productId,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng rồi.',
      );
    }

    // 5. Lưu đánh giá vào bảng product_reviews
    const review = await this.prisma.productReview.create({
      data: {
        orderId: order.id,
        productId: dto.productId,
        customerName:
          dto.customerName || order.customerName || 'Khách mua hàng',
        rating: dto.rating,
        comment: dto.comment,
        reviewImageUrl: dto.reviewImageUrl || null,
        isApproved: true,
      },
    });

    return {
      message: 'Cảm ơn bạn đã gửi đánh giá sản phẩm thành công!',
      review,
    };
  }
}

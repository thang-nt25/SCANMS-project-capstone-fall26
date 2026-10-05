import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CommissionStatus,
  CouponScope,
  CouponRedemptionStatus,
  CouponStatus,
  LiveSessionInviteStatus,
  LiveSessionStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { PayosPaymentService } from '../orders/payos-payment.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  ClaimLiveSessionDto,
  CreateLiveSessionDto,
  GenerateLiveLinkCodeDto,
  RespondLiveSessionDto,
  UpdateLiveSessionStateDto,
} from './dto/create-live-session.dto';

const sessionInclude = {
  creator: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      collaboratorProfile: { select: { totalFollowers: true, kycStatus: true } },
      socialChannels: {
        select: { platformName: true, channelName: true, channelUrl: true, followerCount: true },
      },
    },
  },
  store: { select: { id: true, name: true, slug: true, logoUrl: true } },
  coupon: {
    select: {
      id: true,
      displayCode: true,
      status: true,
      discountType: true,
      discountValue: true,
      minimumOrderAmount: true,
      maximumDiscountAmount: true,
      usageLimitTotal: true,
      usageLimitPerCustomer: true,
      usageCount: true,
    },
  },
  products: {
    include: {
      product: { select: { id: true, title: true, imageUrl: true, price: true } },
      variant: { select: { id: true, name: true, sku: true, price: true } },
    },
  },
  _count: { select: { claims: true } },
} satisfies Prisma.LiveShoppingSessionInclude;

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payosPaymentService: PayosPaymentService,
    private readonly walletsService: WalletsService,
  ) {}

  async getShopCatalog(userId: string, storeId: string) {
    await this.assertStoreOwner(userId, storeId);
    const [products, collaborators, store] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          storeId,
          isActive: true,
          isDeleted: false,
          moderationStatus: 'APPROVED',
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          price: true,
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, sku: true, price: true },
          },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.storeCollaborator.findMany({
        where: { storeId, status: 'APPROVED', collaborator: { isActive: true, isDeleted: false } },
        select: {
          collaborator: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              collaboratorProfile: { select: { totalFollowers: true, kycStatus: true } },
              socialChannels: {
                select: { platformName: true, channelName: true, channelUrl: true, followerCount: true },
              },
            },
          },
        },
        orderBy: { approvedAt: 'desc' },
      }),
      this.prisma.store.findUnique({ where: { id: storeId }, select: { defaultCommissionRate: true } }),
    ]);
    return {
      products,
      creators: collaborators.map((item) => item.collaborator),
      defaultCommissionRate: Number(store?.defaultCommissionRate ?? 10),
      serverTime: new Date().toISOString(),
    };
  }

  async generateLinkCode(userId: string, dto: GenerateLiveLinkCodeDto) {
    await this.assertStoreOwner(userId, dto.storeId);
    const approved = await this.prisma.storeCollaborator.findFirst({
      where: { storeId: dto.storeId, collaboratorId: dto.creatorId, status: 'APPROVED', collaborator: { isActive: true, isDeleted: false } },
      select: { collaboratorId: true },
    });
    if (!approved) throw new BadRequestException('KOL chưa được Shop duyệt hợp tác.');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(9).toString('base64url');
      const existing = await this.prisma.liveShoppingSession.findFirst({
        where: { platform: 'SCANMS', liveUrl: { endsWith: `/live/${code}` } },
        select: { id: true },
      });
      if (!existing) return { code };
    }
    throw new BadRequestException('Chưa tạo được mã phiên, vui lòng thử lại.');
  }

  async create(userId: string, dto: CreateLiveSessionDto) {
    const store = await this.assertStoreOwner(userId, dto.storeId);
    const creator = await this.prisma.storeCollaborator.findFirst({
      where: {
        storeId: dto.storeId,
        collaboratorId: dto.creatorId,
        status: 'APPROVED',
        collaborator: { isActive: true, isDeleted: false },
      },
      include: {
        collaborator: {
          select: { fullName: true },
        },
      },
    });
    if (!creator) throw new BadRequestException('KOL chưa được Shop duyệt hợp tác.');

    const externalChannels = dto.externalChannels || [];
    if (dto.platform !== 'SCANMS' && externalChannels.length === 0) {
      throw new BadRequestException('Cần nhập ít nhất một kênh và số người theo dõi khi live ngoài sàn.');
    }
    if (new Set(externalChannels.map((channel) => channel.channelUrl.trim().toLowerCase())).size !== externalChannels.length) {
      throw new BadRequestException('Không được thêm cùng một đường dẫn kênh nhiều lần.');
    }
    const liveUrl = dto.platform === 'SCANMS' ? dto.liveUrl.trim() : externalChannels[0].channelUrl.trim();
    if (dto.platform === 'SCANMS') {
      let parsedUrl: URL;
      try { parsedUrl = new URL(liveUrl); } catch {
        throw new BadRequestException('Link SCANMS Live không hợp lệ.');
      }
      const pathname = parsedUrl.pathname;
      if (!/^\/live\/[A-Za-z0-9_-]{12}$/.test(pathname)) {
        throw new BadRequestException('Link SCANMS Live cần mã phiên riêng do hệ thống tạo.');
      }
      const allowedOrigins = [process.env.PUBLIC_APP_URL, process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
        .filter(Boolean)
        .flatMap((value) => value!.split(','))
        .map((value) => value.trim().replace(/\/$/, ''));
      const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(parsedUrl.origin);
      if (!allowedOrigins.includes(parsedUrl.origin) && !localDevOrigin) {
        throw new BadRequestException('Link phiên phải thuộc trang SCANMS.');
      }
      const existing = await this.prisma.liveShoppingSession.findFirst({
        where: { platform: 'SCANMS', liveUrl: { endsWith: pathname } },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('Mã phiên đã được sử dụng. Vui lòng tạo link mới.');
      }
    }

    let startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const now = new Date();
    if (!Number.isFinite(startsAt.getTime()) || startsAt < new Date(now.getTime() - 2 * 60 * 60 * 1000)) {
      throw new BadRequestException('Thời gian bắt đầu không được trong quá khứ quá 2 giờ.');
    }
    if (startsAt < now) {
      startsAt = now;
    }
    if (!Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
    }
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) {
      throw new BadRequestException('Mức giảm theo phần trăm không được vượt quá 100%.');
    }
    const productIds = [...new Set(dto.productIds)];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: dto.storeId,
        isActive: true,
        isDeleted: false,
        moderationStatus: 'APPROVED',
      },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Danh sách có sản phẩm không thuộc Shop hoặc đang ngừng bán.');
    }
    const variantIds = [...new Set(dto.variantIds || [])];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds }, isActive: true, productId: { in: productIds } },
          select: { id: true, productId: true },
        })
      : [];
    if (variants.length !== variantIds.length) {
      throw new BadRequestException('Có SKU không hoạt động hoặc không thuộc các sản phẩm đã chọn.');
    }
    const sessionProductRows = productIds.flatMap((productId) => {
      const selectedVariants = variants.filter((variant) => variant.productId === productId);
      return selectedVariants.length
        ? selectedVariants.map((variant) => ({ productId, variantId: variant.id }))
        : [{ productId }];
    });

    const sessionId = randomUUID();
    const couponCode = `LIVE${randomBytes(5).toString('hex').toUpperCase()}`;
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.liveShoppingSession.create({
        data: {
          id: sessionId,
          storeId: dto.storeId,
          creatorId: dto.creatorId,
          createdBy: userId,
          title: dto.title.trim(),
          coverImageUrl: dto.coverImageUrl?.trim() || null,
          description: dto.description?.trim() || null,
          platform: dto.platform,
          liveUrl,
          externalChannels: dto.platform === 'SCANMS' ? [] : externalChannels.map((channel) => ({
            channelUrl: channel.channelUrl.trim(), followerCount: channel.followerCount,
          })),
          startsAt,
          endsAt,
          status: LiveSessionStatus.PENDING_CREATOR,
          inviteStatus: LiveSessionInviteStatus.PENDING,
          commissionRate: new Prisma.Decimal(dto.commissionRate),
          products: { create: sessionProductRows },
        },
      });
      await tx.coupon.create({
        data: {
          codeNormalized: couponCode,
          displayCode: couponCode,
          collaboratorId: dto.creatorId,
          storeId: dto.storeId,
          liveSessionId: sessionId,
          status: CouponStatus.ACTIVE,
          discountType: dto.discountType,
          discountValue: new Prisma.Decimal(dto.discountValue),
          minimumOrderAmount: dto.minimumOrderAmount === undefined ? null : new Prisma.Decimal(dto.minimumOrderAmount),
          maximumDiscountAmount: dto.maximumDiscountAmount === undefined ? null : new Prisma.Decimal(dto.maximumDiscountAmount),
          usageLimitTotal: dto.usageLimitTotal ?? null,
          usageLimitPerCustomer: dto.usageLimitPerCustomer ?? 1,
          startsAt,
          expiresAt: endsAt,
          scopeType: CouponScope.PRODUCTS,
          stackableWithProductDiscount: false,
          stackableWithShopVoucher: false,
          stackableWithPlatformVoucher: false,
          couponProducts: { create: productIds.map((productId) => ({ productId })) },
        },
      });
      await tx.notification.create({
        data: {
          userId: dto.creatorId,
          title: 'Lời mời phiên livestream mới',
          message: `${store.name} mời bạn tham gia phiên “${dto.title.trim()}”.`,
          type: 'LIVE_SESSION_INVITATION',
          data: { sessionId, storeId: dto.storeId },
        },
      });

      // Thông báo tới icon chuông của tất cả user khi Chủ Shop tạo phiên live
      try {
        const allUsers = await tx.user.findMany({
          where: { isActive: true, isDeleted: false },
          select: { id: true },
        });
        if (allUsers.length > 0) {
          const kolName = creator.collaborator?.fullName || 'KOL';
          const discountInfo = dto.discountValue
            ? `${dto.discountValue}${dto.discountType === 'PERCENTAGE' ? '%' : '₫'}`
            : 'ưu đãi độc quyền';
          await tx.notification.createMany({
            data: allUsers.map((u) => ({
              userId: u.id,
              title: `🔴 Phiên livestream mới: ${dto.title.trim()}`,
              message: `${store.name} cùng ${kolName} vừa tạo phiên livestream "${dto.title.trim()}" săn deal ${discountInfo}!`,
              type: 'LIVE_SESSION_BROADCAST',
              data: {
                sessionId,
                storeId: dto.storeId,
                liveUrl,
                endsAt: endsAt.toISOString(),
              },
            })),
          });
        }
      } catch (broadcastNotifErr) {
        this.logger.error('Lỗi gửi thông báo livestream tới tất cả user:', broadcastNotifErr);
      }
      return created;
    });
    return this.prisma.liveShoppingSession.findUnique({ where: { id: session.id }, include: sessionInclude });
  }

  async getShopSessions(userId: string, storeId: string) {
    await this.assertStoreOwner(userId, storeId);
    const sessions = await this.prisma.liveShoppingSession.findMany({
      where: { storeId },
      include: sessionInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });
    return Promise.all(sessions.map(async (session) => ({
      ...session,
      report: { ...await this.getReportData(session.id), ...await this.getViewerStats(session.id, session.platform) },
    })));
  }

  async getAdminSessions() {
    const sessions = await this.prisma.liveShoppingSession.findMany({
      include: sessionInclude,
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });
    return Promise.all(sessions.map(async (session) => ({
      ...session,
      report: { ...await this.getReportData(session.id), ...await this.getViewerStats(session.id, session.platform) },
    })));
  }

  async getMySessions(creatorId: string) {
    const sessions = await this.prisma.liveShoppingSession.findMany({
      where: { creatorId },
      include: sessionInclude,
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });
    return Promise.all(sessions.map(async (session) => ({
      ...session,
      serverTime: new Date().toISOString(),
      report: await this.getReportData(session.id),
    })));
  }

  async respond(creatorId: string, sessionId: string, dto: RespondLiveSessionDto) {
    const session = await this.prisma.liveShoppingSession.findFirst({ where: { id: sessionId, creatorId } });
    if (!session) throw new NotFoundException('Không tìm thấy lời mời livestream.');
    if (session.inviteStatus !== LiveSessionInviteStatus.PENDING) {
      throw new BadRequestException('Lời mời này đã được phản hồi.');
    }
    const now = new Date();
    if (session.endsAt <= now) {
      throw new BadRequestException('Đã quá thời gian của phiên livestream này.');
    }
    const inviteStatus = dto.accepted ? LiveSessionInviteStatus.ACCEPTED : LiveSessionInviteStatus.REJECTED;
    const status = dto.accepted
      ? session.endsAt <= now ? LiveSessionStatus.ENDED : session.startsAt <= now ? LiveSessionStatus.LIVE : LiveSessionStatus.SCHEDULED
      : LiveSessionStatus.CANCELLED;
    await this.prisma.$transaction([
      this.prisma.liveShoppingSession.update({
        where: { id: sessionId },
        data: { inviteStatus, status, respondedAt: now },
      }),
      this.prisma.coupon.updateMany({
        where: { liveSessionId: sessionId },
        data: { status: dto.accepted && status !== LiveSessionStatus.ENDED ? CouponStatus.ACTIVE : dto.accepted ? CouponStatus.EXPIRED : CouponStatus.PAUSED },
      }),
      this.prisma.notification.create({
        data: {
          userId: session.createdBy,
          title: dto.accepted ? 'KOL đã nhận lời livestream' : 'KOL từ chối lời mời livestream',
          message: `Lời mời phiên livestream ${session.title} đã được phản hồi.`,
          type: 'LIVE_SESSION_RESPONSE',
          data: { sessionId },
        },
      }),
    ]);
    return this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
  }

  async updateState(userId: string, sessionId: string, dto: UpdateLiveSessionStateDto) {
    const session = await this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên livestream.');
    await this.assertStoreOwner(userId, session.storeId);
    if (session.status === LiveSessionStatus.ENDED || session.status === LiveSessionStatus.CANCELLED) {
      throw new BadRequestException('Phiên livestream đã kết thúc hoặc bị hủy.');
    }
    const now = new Date();

    if (dto.action === 'START_NOW') {
      if (session.inviteStatus !== LiveSessionInviteStatus.ACCEPTED) {
        throw new BadRequestException('KOL chưa chấp nhận lời mời tham gia phiên live này. Vui lòng chờ KOL đồng ý trước khi phát sóng.');
      }
      await this.prisma.$transaction([
        this.prisma.liveShoppingSession.update({
          where: { id: sessionId },
          data: {
            status: LiveSessionStatus.LIVE,
            startsAt: session.startsAt > now ? now : session.startsAt,
          },
        }),
        this.prisma.coupon.updateMany({
          where: { liveSessionId: sessionId },
          data: { status: CouponStatus.ACTIVE },
        }),
      ]);

      // Broadcast live stream notification to all accounts (all 5 roles)
      try {
        const fullSession = await this.prisma.liveShoppingSession.findUnique({
          where: { id: sessionId },
          include: {
            store: { select: { name: true } },
            creator: { select: { fullName: true } },
            coupon: { select: { discountValue: true, discountType: true } },
          },
        });
        const allUsers = await this.prisma.user.findMany({
          where: { isActive: true, isDeleted: false },
          select: { id: true, role: true },
        });
        if (allUsers.length > 0 && fullSession) {
          const storeName = fullSession.store?.name || 'Gian Hàng';
          const kolName = fullSession.creator?.fullName || 'KOL';
          const discountInfo = fullSession.coupon?.discountValue
            ? `${fullSession.coupon.discountValue}${fullSession.coupon.discountType === 'PERCENTAGE' ? '%' : '₫'}`
            : 'đến 40%';
          await this.prisma.notification.createMany({
            data: allUsers.map((u) => ({
              userId: u.id,
              title: `🔴 Đang phát sóng trực tiếp: ${fullSession.title}`,
              message: `${storeName} cùng ${kolName} đang livestream săn deal độc quyền giảm ${discountInfo}! Bấm để vào xem ngay.`,
              type: 'LIVE_SESSION_BROADCAST',
              data: {
                sessionId: fullSession.id,
                storeId: fullSession.storeId,
                liveUrl: `/live/${fullSession.id}`,
                endsAt: fullSession.endsAt.toISOString(),
              },
            })),
          });
        }
      } catch (notifErr) {
        this.logger.error('Failed to broadcast live notification', notifErr);
      }

      return this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
    }

    if (session.inviteStatus !== LiveSessionInviteStatus.ACCEPTED) {
      throw new BadRequestException('Chỉ có thể điều khiển phiên sau khi KOL chấp nhận hoặc chọn Mở phiên phát sóng ngay.');
    }
    let status: LiveSessionStatus;
    if (dto.action === 'CANCELLED') status = LiveSessionStatus.CANCELLED;
    else if (dto.action === 'PAUSED') status = LiveSessionStatus.PAUSED;
    else status = session.endsAt <= now ? LiveSessionStatus.ENDED : session.startsAt <= now ? LiveSessionStatus.LIVE : LiveSessionStatus.SCHEDULED;
    await this.prisma.$transaction([
      this.prisma.liveShoppingSession.update({ where: { id: sessionId }, data: { status } }),
      this.prisma.coupon.updateMany({
        where: { liveSessionId: sessionId },
        data: { status: status === LiveSessionStatus.CANCELLED || status === LiveSessionStatus.ENDED ? CouponStatus.EXPIRED : status === LiveSessionStatus.PAUSED ? CouponStatus.PAUSED : CouponStatus.ACTIVE },
      }),
    ]);
    if (status === LiveSessionStatus.CANCELLED) {
      try {
        await this.prisma.notification.deleteMany({
          where: {
            type: 'LIVE_SESSION_BROADCAST',
            data: {
              path: ['sessionId'],
              equals: sessionId,
            },
          },
        });
      } catch (delErr) {
        this.logger.error('Failed to cleanup live broadcast notifications on cancel', delErr);
      }
      await this.repriceUnpaidOrders(sessionId);
    }
    if (status === LiveSessionStatus.ENDED) {
      try {
        await this.prisma.notification.deleteMany({
          where: {
            type: 'LIVE_SESSION_BROADCAST',
            data: {
              path: ['sessionId'],
              equals: sessionId,
            },
          },
        });
      } catch (delErr) {
        this.logger.error('Failed to cleanup live broadcast notifications on end', delErr);
      }
      await this.repriceUnpaidOrders(sessionId);
      const report = await this.getReportData(sessionId);
      await this.prisma.notification.createMany({ data: [session.creatorId, session.createdBy].map((recipientId) => ({
        userId: recipientId,
        title: 'Phiên livestream đã kết thúc',
        message: `Phiên “${session.title}” đã kết thúc. Doanh số ${Number(report.grossSales).toLocaleString('vi-VN')} đ, hoa hồng KOL ${Number(report.commission).toLocaleString('vi-VN')} đ.`,
        type: 'LIVE_SESSION_ENDED',
        data: { sessionId, report },
      })) });
    }
    return this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId }, include: sessionInclude });
  }

  async getPublicSessionForProduct(productId: string) {
    const now = new Date();
    const session = await this.prisma.liveShoppingSession.findFirst({
      where: {
        status: { in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] },
        inviteStatus: LiveSessionInviteStatus.ACCEPTED,
        endsAt: { gt: now },
        products: { some: { productId } },
        coupon: { status: CouponStatus.ACTIVE },
      },
      include: {
        store: { select: { name: true, slug: true, logoUrl: true } },
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        coupon: { select: { displayCode: true, discountType: true, discountValue: true, usageLimitTotal: true, usageCount: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    if (!session) return { session: null, serverTime: now.toISOString() };
    return {
      session: {
        ...session,
        remainingUses: session.coupon?.usageLimitTotal === null ? null : Math.max(0, (session.coupon?.usageLimitTotal ?? 0) - (session.coupon?.usageCount ?? 0)),
      },
      serverTime: now.toISOString(),
    };
  }

  async getPublicSessionsForProducts(productIdsCsv?: string) {
    const productIds = [...new Set((productIdsCsv || '').split(',').map((id) => id.trim()).filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
    ))].slice(0, 100);
    const now = new Date();
    if (!productIds.length) return { sessionsByProductId: {}, serverTime: now.toISOString() };

    const sessions = await this.prisma.liveShoppingSession.findMany({
      where: {
        status: { in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] },
        inviteStatus: LiveSessionInviteStatus.ACCEPTED,
        endsAt: { gt: now },
        products: { some: { productId: { in: productIds } } },
        coupon: { status: CouponStatus.ACTIVE },
      },
      include: {
        products: { select: { productId: true } },
        store: { select: { name: true } },
        creator: { select: { fullName: true } },
        coupon: {
          select: {
            displayCode: true,
            discountType: true,
            discountValue: true,
            usageLimitTotal: true,
            usageCount: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const sessionsByProductId: Record<string, Record<string, unknown>> = {};
    for (const session of sessions) {
      if (!session.coupon) continue;
      const deal = {
        id: session.id,
        title: session.title,
        platform: session.platform,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        store: session.store,
        creator: session.creator,
        coupon: {
          displayCode: session.coupon.displayCode,
          discountType: session.coupon.discountType,
          discountValue: session.coupon.discountValue,
          remainingUses: session.coupon.usageLimitTotal === null
            ? null
            : Math.max(0, session.coupon.usageLimitTotal - session.coupon.usageCount),
        },
      };
      for (const product of session.products) {
        if (productIds.includes(product.productId) && !sessionsByProductId[product.productId]) {
          sessionsByProductId[product.productId] = deal;
        }
      }
    }
    return { sessionsByProductId, serverTime: now.toISOString() };
  }

  async claim(sessionId: string, dto: ClaimLiveSessionDto, userId?: string) {
    const now = new Date();
    const session = await this.prisma.liveShoppingSession.findFirst({
      where: { id: sessionId, status: { in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] }, inviteStatus: LiveSessionInviteStatus.ACCEPTED, startsAt: { lte: now }, endsAt: { gt: now } },
      include: { coupon: true },
    });
    if (!session?.coupon || session.coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Voucher phiên livestream chưa mở hoặc đã kết thúc.');
    }
    const claimKey = dto.claimKey.trim();
    if (claimKey.length < 16) throw new BadRequestException('Định danh nhận voucher không hợp lệ.');
    if (session.coupon.usageLimitTotal !== null && session.coupon.usageCount >= session.coupon.usageLimitTotal) {
      throw new BadRequestException('Voucher phiên live đã hết lượt sử dụng.');
    }
    try {
      await this.prisma.liveSessionClaim.create({ data: { sessionId, claimKey, userId: userId || null } });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
    }
    return {
      couponCode: session.coupon.displayCode,
      claimed: true,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      serverTime: now.toISOString(),
    };
  }

  async getPublicSessionByIdentifier(identifier: string) {
    const cleanId = (identifier || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);
    const session = isUuid
      ? await this.prisma.liveShoppingSession.findUnique({
          where: { id: cleanId, platform: 'SCANMS' },
          include: sessionInclude,
        })
      : await this.prisma.liveShoppingSession.findFirst({
          where: { platform: 'SCANMS', liveUrl: { endsWith: `/live/${cleanId}` } },
          include: sessionInclude,
        });

    if (session) {
      const stats = await this.getSessionStats(session.id);
      return {
        ...session,
        liveStats: stats,
      };
    }

    return session;
  }

  private sessionStatsMap = new Map<
    string,
    { likes: number }
  >();
  private identifierToSessionId = new Map<string, string>();

  private getCleanSessionKey(identifier: string): string {
    return (identifier || 'demo').trim();
  }

  private async resolveSessionKey(identifier: string): Promise<string | null> {
    const key = this.getCleanSessionKey(identifier);
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(key)) return null;
    const cached = this.identifierToSessionId.get(key);
    if (cached) return cached;
    const session = await this.prisma.liveShoppingSession.findFirst({
      where: { platform: 'SCANMS', ...(key.length === 36 && /^[0-9a-f-]+$/i.test(key) ? { id: key.toLowerCase() } : { liveUrl: { endsWith: `/live/${key}` } }) },
      select: { id: true },
    });
    if (session) this.identifierToSessionId.set(key, session.id);
    return session?.id || null;
  }

  private async getViewerStats(sessionId: string, platform: string) {
    if (platform !== 'SCANMS') return { currentViewers: null, totalViewers: null };
    const [currentViewers, totalViewers] = await Promise.all([
      this.prisma.liveSessionViewer.count({ where: { sessionId, leftAt: null, lastSeenAt: { gte: new Date(Date.now() - 30_000) } } }),
      this.prisma.liveSessionViewer.count({ where: { sessionId } }),
    ]);
    return { currentViewers, totalViewers };
  }

  async getSessionStats(identifier: string) {
    const key = await this.resolveSessionKey(identifier);
    const viewers = key ? (await this.getViewerStats(key, 'SCANMS')).currentViewers : 0;

    return {
      identifier: key,
      viewers,
      likes: key ? (this.sessionStatsMap.get(key)?.likes || 0) : 0,
      serverTime: new Date().toISOString(),
    };
  }

  async recordInteraction(
    identifier: string,
    body: { action: 'HEARTBEAT' | 'LIKE' | 'LEAVE'; clientId: string; count?: number },
  ) {
    const key = await this.resolveSessionKey(identifier);
    if (!key) throw new NotFoundException('Không tìm thấy phiên SCANMS Live.');
    if (!body || !['HEARTBEAT', 'LIKE', 'LEAVE'].includes(body.action) || typeof body.clientId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.clientId)) {
      throw new BadRequestException('Tương tác phiên live không hợp lệ.');
    }
    const likeCount = Number(body.count ?? 1);
    if (body.action === 'LIKE' && !Number.isFinite(likeCount)) {
      throw new BadRequestException('Số lượt thích không hợp lệ.');
    }
    const now = new Date();
    if (body.action === 'LEAVE') {
      await this.prisma.liveSessionViewer.updateMany({ where: { sessionId: key, clientId: body.clientId }, data: { leftAt: now } });
    } else {
      await this.prisma.liveSessionViewer.upsert({
        where: { sessionId_clientId: { sessionId: key, clientId: body.clientId } },
        create: { sessionId: key, clientId: body.clientId, lastSeenAt: now },
        update: { lastSeenAt: now, leftAt: null },
      });
    }
    if (body.action === 'LIKE') {
      const entry = this.sessionStatsMap.get(key) || { likes: 0 };
      entry.likes += Math.max(1, Math.min(100, Math.floor(likeCount)));
      this.sessionStatsMap.set(key, entry);
    }
    const viewers = (await this.getViewerStats(key, 'SCANMS')).currentViewers;

    return {
      identifier: key,
      viewers,
      likes: this.sessionStatsMap.get(key)?.likes || 0,
      actionApplied: body.action,
      serverTime: new Date().toISOString(),
    };
  }

  async getPublicLiveList() {
    const now = new Date();
    return this.prisma.liveShoppingSession.findMany({
      where: {
        status: { in: [LiveSessionStatus.LIVE, LiveSessionStatus.SCHEDULED, LiveSessionStatus.PENDING_CREATOR, LiveSessionStatus.PAUSED] },
        endsAt: { gt: now },
      },
      include: sessionInclude,
      orderBy: [{ status: 'asc' }, { startsAt: 'asc' }],
      take: 20,
    });
  }

  async getReport(userId: string, sessionId: string) {
    const session = await this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId }, select: { id: true, storeId: true } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên livestream.');
    await this.assertStoreOwner(userId, session.storeId);
    return this.getReportData(sessionId);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async synchronizeLifecycle() {
    const now = new Date();
    const dueToGoLive = await this.prisma.liveShoppingSession.findMany({
      where: { status: LiveSessionStatus.SCHEDULED, inviteStatus: LiveSessionInviteStatus.ACCEPTED, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { id: true, title: true, creatorId: true, createdBy: true },
    });
    for (const session of dueToGoLive) {
      const updated = await this.prisma.liveShoppingSession.updateMany({ where: { id: session.id, status: LiveSessionStatus.SCHEDULED }, data: { status: LiveSessionStatus.LIVE } });
      if (updated.count) {
        await this.prisma.notification.createMany({ data: [session.creatorId, session.createdBy].map((userId) => ({
          userId,
          title: 'Phiên livestream đang diễn ra',
          message: `Phiên “${session.title}” đã bắt đầu; voucher đang mở.`,
          type: 'LIVE_SESSION_STARTED',
          data: { sessionId: session.id },
        })) });
      }
    }

    const dueToEnd = await this.prisma.liveShoppingSession.findMany({
      where: { status: { in: [LiveSessionStatus.PENDING_CREATOR, LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE, LiveSessionStatus.PAUSED] }, endsAt: { lte: now } },
      select: { id: true, title: true, creatorId: true, createdBy: true },
    });
    for (const session of dueToEnd) {
      const updated = await this.prisma.liveShoppingSession.updateMany({
        where: { id: session.id, status: { in: [LiveSessionStatus.PENDING_CREATOR, LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE, LiveSessionStatus.PAUSED] } },
        data: { status: LiveSessionStatus.ENDED },
      });
      if (updated.count) {
        try {
          await this.prisma.notification.deleteMany({
            where: {
              type: 'LIVE_SESSION_BROADCAST',
              data: {
                path: ['sessionId'],
                equals: session.id,
              },
            },
          });
        } catch (delErr) {
          this.logger.error('Failed to cleanup live broadcast notifications on auto-end', delErr);
        }
        const report = await this.getReportData(session.id);
        await this.prisma.$transaction([
          this.prisma.coupon.updateMany({ where: { liveSessionId: session.id }, data: { status: CouponStatus.EXPIRED } }),
          this.prisma.notification.createMany({ data: [session.creatorId, session.createdBy].map((userId) => ({
            userId,
            title: 'Phiên livestream đã kết thúc',
            message: `Phiên “${session.title}” và voucher của phiên đã tự động hết hạn.`,
            type: 'LIVE_SESSION_ENDED',
            data: { sessionId: session.id, report },
          })) }),
        ]);
      }
      await this.repriceUnpaidOrders(session.id);
    }

    // Retry gateway cancellations and any repricing interrupted by a transient failure.
    const endedSessionsWithDiscountedOrders = await this.prisma.liveShoppingSession.findMany({
      where: {
        status: { in: [LiveSessionStatus.ENDED, LiveSessionStatus.CANCELLED] },
        coupon: { is: { orders: { some: {
          couponDiscountAmount: { gt: 0 },
          status: { not: 'CANCELLED' },
          rawPayload: { path: ['paymentStatus'], not: 'PAID' },
        } } } },
      },
      select: { id: true },
    });
    for (const session of endedSessionsWithDiscountedOrders) {
      await this.repriceUnpaidOrders(session.id);
    }
  }

  private async repriceUnpaidOrders(sessionId: string) {
    const session = await this.prisma.liveShoppingSession.findUnique({
      where: { id: sessionId },
      select: { id: true, title: true, status: true, commissionRate: true, coupon: { select: { id: true } } },
    });
    if (
      !session ||
      (session.status !== LiveSessionStatus.ENDED && session.status !== LiveSessionStatus.CANCELLED) ||
      !session.coupon
    ) return;

    const candidates = await this.prisma.order.findMany({
      where: {
        couponId: session.coupon.id,
        status: { not: 'CANCELLED' },
        couponDiscountAmount: { gt: 0 },
        rawPayload: { path: ['paymentStatus'], not: 'PAID' },
      },
      select: { id: true, rawPayload: true },
    });

    for (const candidate of candidates) {
      const raw = (candidate.rawPayload || {}) as Record<string, any>;
      if (raw.paymentStatus === 'PAID') continue;
      const gatewayCancelled = raw.paymentMethod !== 'PAYOS' ||
        await this.payosPaymentService.cancelPendingLinkForLivePriceReset(candidate.id);
      if (!gatewayCancelled) continue;

      const repriced = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${candidate.id}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${session.coupon!.id}::uuid FOR UPDATE`;
        const order = await tx.order.findUnique({
          where: { id: candidate.id },
          include: {
            couponRedemption: true,
            orderItems: { include: { product: { select: { customCommissionRate: true } } } },
            commissions: true,
            attributedCollaborator: {
              select: { collaboratorProfile: { select: { tier: { select: { extraBonusPercentage: true } } } } },
            },
            store: { select: { defaultCommissionRate: true } },
          },
        });
        if (!order || order.status === 'CANCELLED' || Number(order.couponDiscountAmount || 0) <= 0) return false;
        const currentRaw = (order.rawPayload || {}) as Record<string, any>;
        if (currentRaw.paymentStatus === 'PAID') return false;

        const redemption = order.couponRedemption;
        if (redemption?.status === CouponRedemptionStatus.USED) {
          await tx.couponRedemption.update({
            where: { id: redemption.id },
            data: { status: CouponRedemptionStatus.CANCELLED },
          });
          await tx.coupon.update({
            where: { id: redemption.couponId },
            data: {
              usageCount: { decrement: 1 },
              budgetUsed: { decrement: redemption.discountAmount },
            },
          });
        }

        const tierBonus = Number(order.attributedCollaborator?.collaboratorProfile?.tier?.extraBonusPercentage || 0);
        const regularItemAmounts: Prisma.Decimal[] = [];
        for (const item of order.orderItems) {
          const savedRate = item.regularCommissionRate;
          const rate = savedRate !== null && savedRate !== undefined
            ? Number(savedRate)
            : Number(item.appliedCommissionRate) === Number(session.commissionRate)
              ? Math.min(100, Number(item.product.customCommissionRate || order.store.defaultCommissionRate || 10) + tierBonus)
              : Number(item.appliedCommissionRate);
          const amount = item.regularCommissionAmount !== null && item.regularCommissionAmount !== undefined
            ? new Prisma.Decimal(item.regularCommissionAmount)
            : new Prisma.Decimal(Number(item.unitPrice) * item.quantity * rate / 100).toDecimalPlaces(2);
          regularItemAmounts.push(amount);
          await tx.orderItem.update({
            where: { id: item.id },
            data: { appliedCommissionRate: new Prisma.Decimal(rate), calculatedCommissionAmount: amount },
          });
        }

        const regularCommission = regularItemAmounts.reduce((total, amount) => total.plus(amount), new Prisma.Decimal(0));
        for (const commission of order.commissions) {
          if (commission.status === CommissionStatus.REVERSED) continue;
          const delta = regularCommission.minus(commission.commissionAmount);
          if (delta.greaterThan(0)) {
            if (commission.status === CommissionStatus.PENDING) {
              await this.walletsService.creditPendingBalance(tx, commission.collaboratorId, delta, { id: commission.id, type: 'COMMISSION' }, commission.storeWalletTracked ? order.storeId : undefined);
            } else {
              await this.walletsService.creditAvailableBalance(tx, commission.collaboratorId, delta, { id: commission.id, type: 'COMMISSION' }, commission.storeWalletTracked ? order.storeId : undefined);
            }
          } else if (delta.lessThan(0)) {
            const reduction = delta.abs();
            if (commission.status === CommissionStatus.PENDING) {
              await this.walletsService.reversePendingBalance(tx, commission.collaboratorId, reduction, { id: commission.id, type: 'COMMISSION' }, commission.storeWalletTracked ? order.storeId : undefined);
            } else {
              await this.walletsService.reverseAvailableBalance(tx, commission.collaboratorId, reduction, { id: commission.id, type: 'COMMISSION' }, commission.storeWalletTracked ? order.storeId : undefined);
            }
          }
          await tx.commission.update({ where: { id: commission.id }, data: { commissionAmount: regularCommission } });
        }

        const finalAmount = new Prisma.Decimal(order.subtotalAmount).plus(order.shippingFee);
        const newRaw = {
          ...currentRaw,
          liveSessionPriceReset: {
            sessionId,
            sessionTitle: session.title,
            repricedAt: new Date().toISOString(),
            previousFinalAmount: Number(order.finalAmount),
            finalAmount: Number(finalAmount),
          },
        } as Record<string, any>;
        if (currentRaw.paymentMethod === 'PAYOS') {
          const retiredLinks = Array.isArray(currentRaw.retiredPaymentLinks) ? currentRaw.retiredPaymentLinks : [];
          const retired = currentRaw.payos ? [...retiredLinks, {
            orderCode: currentRaw.payos.orderCode,
            paymentLinkId: currentRaw.payos.paymentLinkId || null,
            retiredAt: new Date().toISOString(),
          }] : retiredLinks;
          newRaw.retiredPaymentLinks = retired;
          newRaw.payos = { orderCode: this.payosPaymentService.newPaymentOrderCode(), amount: Number(finalAmount) };
        }
        if (currentRaw.vietqr) {
          const qr = currentRaw.vietqr;
          const qrUrl = `https://img.vietqr.io/image/${qr.bankCode}-${qr.accountNumber}-compact2.png?amount=${Number(finalAmount)}&addInfo=${encodeURIComponent(qr.memo || order.externalOrderSn)}&accountName=${encodeURIComponent(qr.accountName || '')}`;
          newRaw.vietqr = { ...qr, amount: Number(finalAmount), qrUrl };
        }
        await tx.order.update({
          where: { id: order.id },
          data: {
            finalAmount,
            discountAmount: new Prisma.Decimal(0),
            couponDiscountAmount: new Prisma.Decimal(0),
            rawPayload: newRaw,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'LIVE_ORDER_REPRICED',
            details: {
              sessionId,
              orderId: order.id,
              externalOrderSn: order.externalOrderSn,
              previousFinalAmount: Number(order.finalAmount),
              finalAmount: Number(finalAmount),
              restoredCommission: Number(regularCommission),
            },
          },
        });
        if (order.customerId) {
          await tx.notification.create({
            data: {
              userId: order.customerId,
              title: 'Giá đơn hàng đã được cập nhật',
              message: `Phiên livestream “${session.title}” ${session.status === LiveSessionStatus.CANCELLED ? 'đã bị hủy' : 'đã kết thúc'}. Đơn ${order.externalOrderSn} được cập nhật về giá gốc ${Number(finalAmount).toLocaleString('vi-VN')} đ; vui lòng tạo lại thanh toán nếu bạn đã mở liên kết cũ.`,
              type: 'LIVE_ORDER_REPRICED',
              data: { orderId: order.id, sessionId, finalAmount: Number(finalAmount) },
            },
          });
        }
        return true;
      });
      if (repriced) this.logger.log(`Repriced unpaid livestream order ${candidate.id} for session ${sessionId}`);
    }
  }

  private async assertStoreOwner(userId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({ where: { id: storeId, ownerId: userId, isDeleted: false } });
    if (!store) throw new ForbiddenException('Bạn không có quyền quản lý gian hàng này.');
    return store;
  }

  private async getReportData(sessionId: string) {
    const session = await this.prisma.liveShoppingSession.findUnique({ where: { id: sessionId }, select: { creatorId: true, coupon: { select: { id: true, usageLimitTotal: true, usageCount: true } }, _count: { select: { claims: true } } } });
    if (!session?.coupon) return { claims: session?._count.claims ?? 0, orders: 0, pendingOrders: 0, cancelledOrders: 0, grossSales: 0, voucherDiscount: 0, commission: 0, usedUses: 0, remainingUses: 0 };
    const orders = await this.prisma.order.findMany({
      where: { couponId: session.coupon.id },
      select: { id: true, status: true, finalAmount: true, couponDiscountAmount: true, rawPayload: true, couponRedemption: { select: { status: true } } },
    });
    const activeOrders = orders.filter((order) => order.status !== 'CANCELLED');
    const cancelledOrders = orders.length - activeOrders.length;
    const settledOrders = activeOrders.filter((order) => {
      const raw = (order.rawPayload || {}) as Record<string, any>;
      return raw.paymentStatus === 'PAID' || (raw.paymentMethod === 'COD' && ['DELIVERED', 'COMPLETED'].includes(order.status));
    });
    const settledIds = settledOrders.map((order) => order.id);
    const commissions = settledIds.length
      ? await this.prisma.commission.findMany({ where: { orderId: { in: settledIds }, collaboratorId: session.creatorId, status: { not: CommissionStatus.REVERSED } }, select: { commissionAmount: true } })
      : [];
    return {
      claims: session._count.claims,
      orders: activeOrders.length,
      pendingOrders: activeOrders.length - settledOrders.length,
      cancelledOrders,
      grossSales: settledOrders.reduce((sum, order) => sum + Number(order.finalAmount), 0),
      voucherDiscount: activeOrders.reduce((sum, order) => sum + Number(order.couponDiscountAmount || 0), 0),
      commission: commissions.reduce((sum, commission) => sum + Number(commission.commissionAmount), 0),
      usedUses: session.coupon.usageCount,
      remainingUses: session.coupon.usageLimitTotal === null ? null : Math.max(0, session.coupon.usageLimitTotal - session.coupon.usageCount),
    };
  }
}

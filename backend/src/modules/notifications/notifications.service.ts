import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import type { Notification, Prisma } from '@prisma/client';
import { CacheService, NOOP_CACHE_SERVICE } from '../../core/cache/cache.service';

export type NotificationCategory = 'ALL' | 'ORDER' | 'PROMOTION' | 'SYSTEM';

export interface GetNotificationsQuery {
  category?: NotificationCategory;
  page?: number;
  limit?: number;
}

const ORDER_TYPE_PREFIXES = ['ORDER_', 'DISPUTE_', 'RETURN_', 'LIVE_ORDER_'];
const PROMOTION_TYPE_PREFIXES = [
  'PROMOTION_',
  'PROMO_',
  'VOUCHER_',
  'CAMPAIGN_',
  'LIVE_SESSION_',
];

function getCategoryFilter(category: Exclude<NotificationCategory, 'ALL'>) {
  const orderFilters = ORDER_TYPE_PREFIXES.map((prefix) => ({
    type: { startsWith: prefix },
  }));
  const promotionFilters = [
    ...PROMOTION_TYPE_PREFIXES.map((prefix) => ({
      type: { startsWith: prefix },
    })),
    { type: { contains: 'COUPON' } },
    { type: 'FLASH_SALE' },
  ];

  if (category === 'ORDER') return { OR: orderFilters };
  if (category === 'PROMOTION') return { OR: promotionFilters };
  return { NOT: [...orderFilters, ...promotionFilters] };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService = NOOP_CACHE_SERVICE,
  ) {}

  private async withOrderProductImages(userId: string, items: Notification[]) {
    const dataOf = (item: Notification): Prisma.JsonObject => {
      if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
        return item.data as Prisma.JsonObject;
      }
      if (typeof item.data === 'string') {
        try {
          const parsed: unknown = JSON.parse(item.data);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Prisma.JsonObject
            : {};
        } catch {
          return {};
        }
      }
      return {};
    };
    const orderCodeOf = (item: Notification): string | undefined => {
      const data = dataOf(item);
      if (typeof data.externalOrderSn === 'string' && data.externalOrderSn.trim()) {
        return data.externalOrderSn.trim();
      }
      // Older order notices stored the public code only in their text (data = null).
      if (!ORDER_TYPE_PREFIXES.some(prefix => item.type.startsWith(prefix))) return undefined;
      return `${item.title} ${item.message}`.match(/\bDH-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i)?.[0].toUpperCase();
    };
    const orderIds = [...new Set(items.map(item => dataOf(item).orderId)
      .filter((id): id is string => typeof id === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)))];
    const orderCodes = [...new Set(items.map(orderCodeOf)
      .filter((code): code is string => typeof code === 'string' && code.trim().length > 0))];
    if (!orderIds.length && !orderCodes.length) return items;

    try {
      // Resolve old notices by public order code as well as newer notices by UUID.
      const orders = await this.prisma.order.findMany({
        where: {
          AND: [
            {
              OR: [
                ...(orderIds.length ? [{ id: { in: orderIds } }] : []),
                ...(orderCodes.length ? [{ externalOrderSn: { in: orderCodes } }] : []),
              ],
            },
            {
              OR: [
                { customerId: userId },
                { attributedCollaboratorId: userId },
                { store: { is: { ownerId: userId } } },
              ],
            },
          ],
        },
        select: {
          id: true,
          externalOrderSn: true,
          orderItems: {
            take: 1,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { product: { select: { title: true, imageUrl: true } }, variant: { select: { imageUrl: true } } },
          },
        },
      });
      const images = new Map(orders.map(order => {
        const item = order.orderItems[0];
        return [order.id, item ? { productImageUrl: item.variant?.imageUrl || item.product.imageUrl, productTitle: item.product.title } : null] as const;
      }));
      const ordersByCode = new Map(orders.map(order => [order.externalOrderSn, order.id] as const));
      return items.map(item => {
        const data = dataOf(item);
        const orderId = typeof data.orderId === 'string' && images.has(data.orderId)
          ? data.orderId
          : orderCodeOf(item)
            ? ordersByCode.get(orderCodeOf(item)!)
            : undefined;
        const product = orderId ? images.get(orderId) : null;
        return product?.productImageUrl ? { ...item, data: { ...data, ...product } } : item;
      });
    } catch (error) {
      this.logger.warn('Could not load product thumbnails for notifications: ' + String(error));
      return items;
    }
  }

  /**
   * Tự động dọn dẹp các thông báo phiên live đã kết thúc qua Cron Job định kỳ 10 phút
   * (Không chạy trong luồng đọc GET của người dùng)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredLiveBroadcasts() {
    try {
      const nowIso = new Date().toISOString();
      await this.prisma.notification.deleteMany({
        where: {
          OR: [
            {
              type: 'LIVE_SESSION_BROADCAST',
              data: {
                path: ['endsAt'],
                lte: nowIso,
              },
            },
            {
              type: 'LIVE_SESSION_ENDED',
            },
          ],
        },
      });
    } catch (e) {
      this.logger.debug(
        'Cleanup expired live broadcast notifications error (non-fatal):',
        e,
      );
    }
  }

  /**
   * Khởi tạo thông báo chào mừng thực tế cho người dùng mới đăng ký
   * (Chỉ gieo thông báo chào mừng & ưu đãi khách mới; KHÔNG gieo đơn ảo hay ví ảo)
   */
  private async ensureSeedNotifications(userId: string) {
    const totalCount = await this.prisma.notification.count({
      where: { userId },
    });
    if (totalCount === 0) {
      try {
        await this.prisma.notification.createMany({
          data: [
            {
              userId,
              title: 'Chào mừng bạn đến với Hệ sinh thái Sàn SCANMS',
              message:
                'Khám phá hàng ngàn sản phẩm chính hãng với ưu đãi độc quyền trên Sàn thương mại tiếp thị liên kết SCANMS!',
              type: 'WELCOME',
              data: { actionUrl: '/marketplace' },
              isRead: false,
            },
            {
              userId,
              title: 'Tặng bạn voucher giảm giá 15% bạn mới',
              message:
                'Chào mừng bạn đến với SCANMS! Khám phá kho voucher để nhận các ưu đãi hấp dẫn áp dụng toàn sàn.',
              type: 'PROMOTION_COUPON',
              data: { discount: '15%', actionUrl: '/customer/vouchers' },
              isRead: false,
            },
          ],
        });
      } catch (e) {
        this.logger.warn(`Không thể khởi tạo thông báo chào mừng: ${e}`);
      }
    }
  }

  /**
   * Lấy danh sách thông báo của người dùng kèm bộ lọc 3 danh mục (Đơn Hàng, Khuyến Mãi, SCANMS)
   */
  async getUserNotifications(userId: string, query?: GetNotificationsQuery) {
    await this.ensureSeedNotifications(userId);

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };
    if (query?.category && query.category !== 'ALL') {
      Object.assign(whereClause, getCategoryFilter(query.category));
    }

    const [
      notifications,
      total,
      unreadCount,
      orderUnread,
      promotionUnread,
      systemUnread,
    ] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({
        where: { userId, isRead: false, ...getCategoryFilter('ORDER') },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false, ...getCategoryFilter('PROMOTION') },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false, ...getCategoryFilter('SYSTEM') },
      }),
    ]);

    const items = await this.withOrderProductImages(userId, notifications);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
      categoryUnreadCounts: {
        ORDER: orderUnread,
        PROMOTION: promotionUnread,
        SYSTEM: systemUnread,
      },
    };
  }

  /**
   * Đếm nhanh số lượng thông báo chưa đọc (phục vụ hiển thị badge chuông báo)
   */
  async getUnreadCount(userId: string) {
    const cacheKey = `notif:unread:${userId}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const [unreadCount, orderUnread, promotionUnread, systemUnread] =
      await Promise.all([
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.count({
          where: { userId, isRead: false, ...getCategoryFilter('ORDER') },
        }),
        this.prisma.notification.count({
          where: { userId, isRead: false, ...getCategoryFilter('PROMOTION') },
        }),
        this.prisma.notification.count({
          where: { userId, isRead: false, ...getCategoryFilter('SYSTEM') },
        }),
      ]);

    const result = {
      unreadCount,
      categoryUnreadCounts: {
        ORDER: orderUnread,
        PROMOTION: promotionUnread,
        SYSTEM: systemUnread,
      },
    };
    await this.cacheService.set(cacheKey, result, 15); // 15s TTL
    return result;
  }

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    await this.cacheService.del(`notif:unread:${userId}`);
    return { success: true };
  }

  /**
   * Đánh dấu toàn bộ thông báo đã đọc
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    await this.cacheService.del(`notif:unread:${userId}`);
    return { success: true, updatedCount: result.count };
  }

  /**
   * Tạo thông báo mới cho người dùng
   */
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: any;
  }) {
    try {
      const created = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          data: data.data || null,
        },
      });
      await this.cacheService.del(`notif:unread:${data.userId}`);
      return created;
    } catch (err) {
      this.logger.warn(`Không thể tạo notification: ${err}`);
      return null;
    }
  }
}

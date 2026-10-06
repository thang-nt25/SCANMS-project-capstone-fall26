import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export type NotificationCategory = 'ALL' | 'ORDER' | 'PROMOTION' | 'SYSTEM';

export interface GetNotificationsQuery {
  category?: NotificationCategory;
  page?: number;
  limit?: number;
}

const ORDER_TYPES = [
  'ORDER_CREATED',
  'ORDER_SHIPPING',
  'ORDER_DELIVERED',
  'ORDER_COMPLETED',
  'ORDER_CANCELLED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
];

const PROMOTION_TYPES = [
  'PROMOTION_COUPON',
  'VOUCHER_RECEIVED',
  'FLASH_SALE',
  'CAMPAIGN_INVITE',
  'PROMO_DISCOUNT',
  'VOUCHER_EXPIRED',
  'LIVE_SESSION_BROADCAST',
];

const SYSTEM_TYPES = [
  'KYC_SUBMITTED',
  'KYC_VERIFIED',
  'KYC_REJECTED',
  'SECURITY_ALERT',
  'SYSTEM_NOTICE',
  'WELCOME',
  'PARTNER_UPGRADE',
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động dọn dẹp các thông báo phiên live đã kết thúc để không còn hiện trong danh sách và chuông của user
   */
  private async cleanupExpiredLiveBroadcasts() {
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
    await this.cleanupExpiredLiveBroadcasts();
    await this.ensureSeedNotifications(userId);

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };

    if (query?.category && query.category !== 'ALL') {
      switch (query.category) {
        case 'ORDER':
          whereClause.type = { in: ORDER_TYPES };
          break;
        case 'PROMOTION':
          whereClause.type = { in: PROMOTION_TYPES };
          break;
        case 'SYSTEM':
          whereClause.type = { in: SYSTEM_TYPES };
          break;
      }
    }

    const [
      items,
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
        where: { userId, isRead: false, type: { in: ORDER_TYPES } },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false, type: { in: PROMOTION_TYPES } },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false, type: { in: SYSTEM_TYPES } },
      }),
    ]);

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
    await this.cleanupExpiredLiveBroadcasts();
    const [unreadCount, orderUnread, promotionUnread, systemUnread] =
      await Promise.all([
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.count({
          where: { userId, isRead: false, type: { in: ORDER_TYPES } },
        }),
        this.prisma.notification.count({
          where: { userId, isRead: false, type: { in: PROMOTION_TYPES } },
        }),
        this.prisma.notification.count({
          where: { userId, isRead: false, type: { in: SYSTEM_TYPES } },
        }),
      ]);

    return {
      unreadCount,
      categoryUnreadCounts: {
        ORDER: orderUnread,
        PROMOTION: promotionUnread,
        SYSTEM: systemUnread,
      },
    };
  }

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
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
      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          data: data.data || null,
        },
      });
    } catch (err) {
      this.logger.warn(`Không thể tạo notification: ${err}`);
      return null;
    }
  }
}

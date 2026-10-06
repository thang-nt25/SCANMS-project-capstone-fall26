import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

export interface GetNotificationsQuery {
  category?: 'ALL' | 'ORDER' | 'FINANCE' | 'SYSTEM';
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách thông báo của người dùng kèm bộ lọc 4 danh mục đa vai trò
   */
  async getUserNotifications(userId: string, query?: GetNotificationsQuery) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.NotificationWhereInput = { userId };

    if (query?.category && query.category !== 'ALL') {
      switch (query.category) {
        case 'ORDER':
          whereClause.type = {
            in: [
              'ORDER_CREATED',
              'ORDER_SHIPPING',
              'ORDER_DELIVERED',
              'ORDER_COMPLETED',
              'ORDER_CANCELLED',
              'DISPUTE_OPENED',
              'DISPUTE_RESOLVED',
              'RETURN_REQUESTED',
              'RETURN_APPROVED',
              'RETURN_REJECTED',
              'RETURN_INSTRUCTIONS',
              'RETURN_SHIPPED',
              'RETURN_TRACKING_CORRECTED',
              'RETURN_RECEIVED',
              'RETURN_INSPECTED',
              'RETURN_EXCHANGE_SHIPPED',
              'RETURN_COMPLETED',
              'RETURN_DISPUTED',
              'RETURN_DISPUTE_RESOLVED',
              'RETURN_EXPIRED',
              'RETURN_INSPECTION_OVERDUE',
            ],
          };
          break;
        case 'FINANCE':
          whereClause.type = {
            in: [
              'COMMISSION_EARNED',
              'COMMISSION_RELEASED',
              'COMMISSION_REVERSED',
              'PAYOUT_APPROVED',
              'PAYOUT_COMPLETED',
              'WALLET_TOPUP',
            ],
          };
          break;
        case 'SYSTEM':
          whereClause.type = {
            in: [
              'KYC_SUBMITTED',
              'KYC_VERIFIED',
              'KYC_REJECTED',
              'CAMPAIGN_INVITE',
              'SECURITY_ALERT',
              'SYSTEM_NOTICE',
            ],
          };
          break;
      }
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Đếm nhanh số lượng thông báo chưa đọc (phục vụ hiển thị badge chuông báo)
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
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
    data?: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          data: data.data ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.warn(`Không thể tạo notification: ${err}`);
      return null;
    }
  }
}

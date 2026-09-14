import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UserRole } from '@prisma/client';
import {
  DashboardAnalyticsQueryDto,
  AnalyticsQuickRange,
  AnalyticsTimeInterval,
  TopBreakdownQueryDto,
} from './dto/dashboard-analytics.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Lấy storeId từ userId (Shop) ────────────────────────────────────
  private async getStoreId(userId: string): Promise<string | null> {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId, isDeleted: false },
    });
    return store?.id ?? null;
  }

  // ─── Trợ thủ xử lý khoảng thời gian (Date Range Resolver) ─────────────
  resolveDateRange(dto: DashboardAnalyticsQueryDto) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    let interval: AnalyticsTimeInterval = dto.interval || AnalyticsTimeInterval.DAILY;

    const range = dto.range || (dto.days ? AnalyticsQuickRange.CUSTOM : AnalyticsQuickRange.LAST_30_DAYS);

    switch (range) {
      case AnalyticsQuickRange.TODAY: {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        interval = AnalyticsTimeInterval.HOURLY;
        break;
      }
      case AnalyticsQuickRange.YESTERDAY: {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        interval = AnalyticsTimeInterval.HOURLY;
        break;
      }
      case AnalyticsQuickRange.LAST_7_DAYS: {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        interval = AnalyticsTimeInterval.DAILY;
        break;
      }
      case AnalyticsQuickRange.LAST_30_DAYS: {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        interval = AnalyticsTimeInterval.DAILY;
        break;
      }
      case AnalyticsQuickRange.THIS_MONTH: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = now;
        interval = AnalyticsTimeInterval.DAILY;
        break;
      }
      case AnalyticsQuickRange.LAST_MONTH: {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        interval = AnalyticsTimeInterval.DAILY;
        break;
      }
      case AnalyticsQuickRange.CUSTOM:
      default: {
        if (dto.startDate && dto.endDate) {
          startDate = new Date(dto.startDate);
          endDate = new Date(dto.endDate);
          if (startDate > endDate) {
            throw new BadRequestException('Ngày bắt đầu không thể sau ngày kết thúc.');
          }
        } else if (dto.days) {
          startDate = new Date(now.getTime() - dto.days * 24 * 60 * 60 * 1000);
          endDate = now;
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
        }
        break;
      }
    }

    // Tính khoảng thời gian đối ứng kỳ trước để so sánh % tăng trưởng (Growth comparison)
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

    return {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      interval,
    };
  }

  // ─── 1. TỔNG QUAN HIỆU SUẤT REAL-TIME (KPI OVERVIEW) ─────────────────
  async getRealtimeOverview(userId: string, role: string, dto: DashboardAnalyticsQueryDto) {
    const { startDate, endDate, prevStartDate, prevEndDate } = this.resolveDateRange(dto);

    let storeId: string | null = null;
    let isShop = false;

    if (role === UserRole.SHOP_MANAGER) {
      storeId = await this.getStoreId(userId);
      isShop = true;
    } else if (role === UserRole.SYSTEM_ADMIN && dto.storeId) {
      storeId = dto.storeId;
      isShop = true;
    }

    // Điều kiện lọc theo vai trò
    const currentOrderWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    const prevOrderWhere: any = {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
    };

    const currentCommissionWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    const prevCommissionWhere: any = {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
    };

    const currentClickWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    const prevClickWhere: any = {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
    };

    if (isShop) {
      if (storeId) {
        currentOrderWhere.storeId = storeId;
        prevOrderWhere.storeId = storeId;
        currentCommissionWhere.order = { storeId };
        prevCommissionWhere.order = { storeId };
        currentClickWhere.referralLink = { product: { storeId } };
        prevClickWhere.referralLink = { product: { storeId } };
      }
    } else {
      // Vai trò KOL / Collaborator
      currentOrderWhere.attributedCollaboratorId = userId;
      prevOrderWhere.attributedCollaboratorId = userId;
      currentCommissionWhere.collaboratorId = userId;
      prevCommissionWhere.collaboratorId = userId;
      currentClickWhere.referralLink = { collaboratorId: userId };
      prevClickWhere.referralLink = { collaboratorId: userId };
    }

    // Lọc theo campaignId nếu có (FR-27)
    if (dto.campaignId) {
      currentOrderWhere.campaignId = dto.campaignId;
      prevOrderWhere.campaignId = dto.campaignId;
    }

    // Thực thi song song các câu query tổng hợp
    const [
      currOrdersCount,
      prevOrdersCount,
      currCompletedOrdersCount,
      currRevenueAgg,
      prevRevenueAgg,
      currCommissionAgg,
      prevCommissionAgg,
      currClicksCount,
      prevClicksCount,
    ] = await Promise.all([
      // Số đơn hàng kỳ này
      this.prisma.order.count({ where: currentOrderWhere }),
      // Số đơn hàng kỳ trước
      this.prisma.order.count({ where: prevOrderWhere }),
      // Số đơn hàng thành công (DELIVERED / COMPLETED)
      this.prisma.order.count({
        where: { ...currentOrderWhere, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
      // Doanh thu GMV kỳ này (finalAmount)
      this.prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { ...currentOrderWhere, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
      // Doanh thu GMV kỳ trước
      this.prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { ...prevOrderWhere, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
      // Hoa hồng kỳ này
      this.prisma.commission.aggregate({
        _sum: { commissionAmount: true },
        where: { ...currentCommissionWhere, status: { in: ['APPROVED', 'PAID'] } },
      }),
      // Hoa hồng kỳ trước
      this.prisma.commission.aggregate({
        _sum: { commissionAmount: true },
        where: { ...prevCommissionWhere, status: { in: ['APPROVED', 'PAID'] } },
      }),
      // Lượt clicks kỳ này
      this.prisma.clickTrafficLog.count({ where: currentClickWhere }),
      // Lượt clicks kỳ trước
      this.prisma.clickTrafficLog.count({ where: prevClickWhere }),
    ]);

    const currRevenue = Number(currRevenueAgg._sum?.finalAmount ?? 0);
    const prevRevenue = Number(prevRevenueAgg._sum?.finalAmount ?? 0);
    const currCommission = Number(currCommissionAgg._sum?.commissionAmount ?? 0);
    const prevCommission = Number(prevCommissionAgg._sum?.commissionAmount ?? 0);

    // Tỷ lệ chuyển đổi Conversion Rate (CR%) = (Orders / Clicks) * 100
    const conversionRate = currClicksCount > 0
      ? parseFloat(((currOrdersCount / currClicksCount) * 100).toFixed(2))
      : 0;

    const prevConversionRate = prevClicksCount > 0
      ? parseFloat(((prevOrdersCount / prevClicksCount) * 100).toFixed(2))
      : 0;

    // Giá trị đơn hàng trung bình (Average Order Value - AOV)
    const averageOrderValue = currCompletedOrdersCount > 0
      ? Math.round(currRevenue / currCompletedOrdersCount)
      : 0;

    // Tính % tăng trưởng so với kỳ trước
    const growthClicks = this._calcGrowthPercent(currClicksCount, prevClicksCount);
    const growthOrders = this._calcGrowthPercent(currOrdersCount, prevOrdersCount);
    const growthRevenue = this._calcGrowthPercent(currRevenue, prevRevenue);
    const growthCommission = this._calcGrowthPercent(currCommission, prevCommission);
    const growthConversionRate = this._calcGrowthPercent(conversionRate, prevConversionRate);

    // Số liên kết tiếp thị đang hoạt động
    const activeLinksCount = isShop && storeId
      ? await this.prisma.referralLink.count({ where: { product: { storeId }, status: 'ACTIVE', deletedAt: null } })
      : await this.prisma.referralLink.count({ where: { collaboratorId: userId, status: 'ACTIVE', deletedAt: null } });

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        prevStartDate: prevStartDate.toISOString(),
        prevEndDate: prevEndDate.toISOString(),
        range: dto.range || AnalyticsQuickRange.LAST_30_DAYS,
      },
      metrics: {
        totalClicks: currClicksCount,
        previousClicks: prevClicksCount,
        growthClicks,

        totalOrders: currOrdersCount,
        previousOrders: prevOrdersCount,
        growthOrders,

        completedOrders: currCompletedOrdersCount,
        grossRevenue: currRevenue,
        previousRevenue: prevRevenue,
        growthRevenue,

        totalCommission: currCommission,
        previousCommission: prevCommission,
        growthCommission,

        vipBonusCommission: 0,
        conversionRate,
        previousConversionRate: prevConversionRate,
        growthConversionRate,

        averageOrderValue,
        activeReferralLinks: activeLinksCount,
      },
    };
  }

  // ─── 2. CHUỖI THỜI GIAN BIỂU ĐỒ (TIME-SERIES METRICS) ────────────────
  async getTimeSeriesMetrics(userId: string, role: string, dto: DashboardAnalyticsQueryDto) {
    const { startDate, endDate, interval } = this.resolveDateRange(dto);

    let storeId: string | null = null;
    let isShop = false;

    if (role === UserRole.SHOP_MANAGER) {
      storeId = await this.getStoreId(userId);
      isShop = true;
    } else if (role === UserRole.SYSTEM_ADMIN && dto.storeId) {
      storeId = dto.storeId;
      isShop = true;
    }

    if (interval === AnalyticsTimeInterval.HOURLY) {
      return this._getHourlyTimeSeries(userId, isShop, storeId, startDate, endDate);
    } else {
      return this._getDailyTimeSeries(userId, isShop, storeId, startDate, endDate);
    }
  }

  // ─── 3. TOP SẢN PHẨM BÁN CHẠY NHẤT (TOP PRODUCTS BREAKDOWN) ───────────
  async getTopProductsBreakdown(userId: string, role: string, dto: TopBreakdownQueryDto) {
    const { startDate, endDate } = this.resolveDateRange({
      range: dto.range,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
    const limit = dto.limit || 5;

    let storeId: string | null = null;
    const isShop = role === UserRole.SHOP_MANAGER || role === UserRole.SYSTEM_ADMIN;

    if (role === UserRole.SHOP_MANAGER) {
      storeId = await this.getStoreId(userId);
    }

    const orderWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['DELIVERED', 'COMPLETED'] },
    };

    if (isShop && storeId) {
      orderWhere.storeId = storeId;
    } else if (!isShop) {
      orderWhere.attributedCollaboratorId = userId;
    }

    // Lấy danh sách sản phẩm qua OrderItem
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: orderWhere,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            sku: true,
            imageUrl: true,
            price: true,
            store: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Gom nhóm theo productId
    const productMap = new Map<string, {
      product: any;
      orderCount: number;
      quantitySold: number;
      grossRevenue: number;
    }>();

    for (const item of orderItems) {
      if (!item.product) continue;
      const pid = item.product.id;
      const existing = productMap.get(pid) || {
        product: item.product,
        orderCount: 0,
        quantitySold: 0,
        grossRevenue: 0,
      };

      existing.orderCount += 1;
      existing.quantitySold += item.quantity;
      existing.grossRevenue += Number(item.unitPrice || item.product.price) * item.quantity;
      productMap.set(pid, existing);
    }

    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
      .slice(0, limit);

    return sortedProducts.map((p, idx) => ({
      rank: idx + 1,
      productId: p.product.id,
      title: p.product.title,
      sku: p.product.sku,
      imageUrl: p.product.imageUrl,
      unitPrice: Number(p.product.price),
      storeName: p.product.store?.name,
      ordersCount: p.orderCount,
      quantitySold: p.quantitySold,
      grossRevenue: p.grossRevenue,
    }));
  }

  // ─── 4. TOP KÊNH TRUYỀN THÔNG HIỆU QUẢ (CHANNELS BREAKDOWN) ───────────
  async getTopChannelsBreakdown(userId: string, role: string, dto: TopBreakdownQueryDto) {
    const { startDate, endDate } = this.resolveDateRange({
      range: dto.range,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    let storeId: string | null = null;
    const isShop = role === UserRole.SHOP_MANAGER;

    if (isShop) {
      storeId = await this.getStoreId(userId);
    }

    const clickWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
    };

    if (isShop && storeId) {
      clickWhere.referralLink = { product: { storeId } };
    } else if (!isShop) {
      clickWhere.referralLink = { collaboratorId: userId };
    }

    // Lấy click traffic log kèm thông tin kênh
    const logs = await this.prisma.clickTrafficLog.findMany({
      where: clickWhere,
      include: {
        referralLink: {
          select: { channel: true },
        },
      },
    });

    const channelMap = new Map<string, { channel: string; clicks: number; orders: number }>();
    const defaultChannels = ['TIKTOK', 'FACEBOOK', 'YOUTUBE', 'INSTAGRAM', 'ZALO', 'DIRECT'];

    defaultChannels.forEach((c) => {
      channelMap.set(c, { channel: c, clicks: 0, orders: 0 });
    });

    for (const log of logs) {
      const ch = (log.referralLink?.channel || 'DIRECT').toUpperCase();
      const existing = channelMap.get(ch) || { channel: ch, clicks: 0, orders: 0 };
      existing.clicks += 1;
      channelMap.set(ch, existing);
    }

    // Lấy orders phân theo sourcePlatform / channel
    const orderWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
    };
    if (isShop && storeId) {
      orderWhere.storeId = storeId;
    } else if (!isShop) {
      orderWhere.attributedCollaboratorId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      select: { sourcePlatform: true },
    });

    for (const ord of orders) {
      const ch = (ord.sourcePlatform || 'DIRECT').toUpperCase();
      const existing = channelMap.get(ch) || { channel: ch, clicks: 0, orders: 0 };
      existing.orders += 1;
      channelMap.set(ch, existing);
    }

    const totalClicks = logs.length;
    const result = Array.from(channelMap.values())
      .filter((c) => c.clicks > 0 || c.orders > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .map((c) => ({
        channel: c.channel,
        clicks: c.clicks,
        orders: c.orders,
        conversionRate: c.clicks > 0 ? parseFloat(((c.orders / c.clicks) * 100).toFixed(2)) : 0,
        trafficSharePercent: totalClicks > 0 ? parseFloat(((c.clicks / totalClicks) * 100).toFixed(1)) : 0,
      }));

    return result;
  }

  // ─── 5. PHỄU CHUYỂN ĐỔI (CONVERSION FUNNEL) ──────────────────────────
  async getConversionFunnel(userId: string, role: string, dto: DashboardAnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(dto);

    let storeId: string | null = null;
    const isShop = role === UserRole.SHOP_MANAGER;
    if (isShop) storeId = await this.getStoreId(userId);

    const clickWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    const orderWhere: any = { createdAt: { gte: startDate, lte: endDate } };

    if (isShop && storeId) {
      clickWhere.referralLink = { product: { storeId } };
      orderWhere.storeId = storeId;
    } else if (!isShop) {
      clickWhere.referralLink = { collaboratorId: userId };
      orderWhere.attributedCollaboratorId = userId;
    }

    const [totalClicks, totalOrders, completedOrders] = await Promise.all([
      this.prisma.clickTrafficLog.count({ where: clickWhere }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.count({
        where: { ...orderWhere, status: { in: ['DELIVERED', 'COMPLETED'] } },
      }),
    ]);

    return {
      stages: [
        {
          stage: 'VISITORS_CLICKS',
          label: 'Lượt Truy Cập (Clicks)',
          count: totalClicks,
          percentage: 100,
        },
        {
          stage: 'ORDERS_PLACED',
          label: 'Đơn Hàng Khởi Tạo (Orders Placed)',
          count: totalOrders,
          percentage: totalClicks > 0 ? parseFloat(((totalOrders / totalClicks) * 100).toFixed(2)) : 0,
        },
        {
          stage: 'ORDERS_COMPLETED',
          label: 'Đơn Giao Thành Công (Completed)',
          count: completedOrders,
          percentage: totalOrders > 0 ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(2)) : 0,
        },
      ],
      conversionRate: totalClicks > 0 ? parseFloat(((totalOrders / totalClicks) * 100).toFixed(2)) : 0,
      fulfillmentRate: totalOrders > 0 ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(2)) : 0,
    };
  }

  // ─── 6. HIỆU SUẤT CHIẾN DỊCH ĐỘC QUYỀN VIP (CAMPAIGN PERFORMANCE) ─────
  async getCampaignPerformanceMetrics(userId: string, role: string, dto: DashboardAnalyticsQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(dto);

    let rawCampaigns: any[] = [];

    if (role === UserRole.SHOP_MANAGER) {
      const storeId = await this.getStoreId(userId);
      if (storeId) {
        rawCampaigns = await this.prisma.campaign.findMany({
          where: { storeId },
          include: {
            store: { select: { id: true, name: true } },
            participants: {
              include: {
                collaborator: {
                  select: { id: true, fullName: true, email: true },
                },
              },
            },
          },
        });
      }
    } else {
      // KOL: Các chiến dịch đã tham gia
      const participants = await this.prisma.campaignParticipant.findMany({
        where: { collaboratorId: userId },
        include: {
          campaign: {
            include: {
              store: { select: { id: true, name: true } },
              participants: true,
            },
          },
        },
      });

      rawCampaigns = participants.map((p) => ({
        ...p.campaign,
        myStatus: p.status,
      }));
    }

    const results: any[] = [];
    for (const camp of rawCampaigns) {
      const orderWhere: any = {
        referralLink: { campaignId: camp.id },
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      };
      if (role === UserRole.COLLABORATOR) {
        orderWhere.attributedCollaboratorId = userId;
      }

      const orders = await this.prisma.order.findMany({
        where: orderWhere,
        select: {
          id: true,
          finalAmount: true,
          commissions: { select: { commissionAmount: true } },
        },
      });

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.finalAmount || 0), 0);
      const totalCommissions = orders.reduce((sum, o) => {
        const commSum = o.commissions?.reduce((cSum, c) => cSum + Number(c.commissionAmount || 0), 0) || 0;
        return sum + commSum;
      }, 0);

      results.push({
        campaignId: camp.id,
        name: camp.name,
        campaignName: camp.name,
        bonusCommissionRate: Number(camp.bonusCommissionRate || 0),
        isActive: camp.isActive,
        startDate: camp.startDate,
        endDate: camp.endDate,
        storeName: camp.store?.name,
        participantsCount: camp.participants?.length || 0,
        participantCount: camp.participants?.length || 0,
        totalOrders,
        totalRevenue,
        totalCommissions,
        myStatus: camp.myStatus || undefined,
      });
    }

    return results;
  }

  // ─── Helpers: Time Series Aggregators ────────────────────────────────
  private async _getHourlyTimeSeries(
    userId: string,
    isShop: boolean,
    storeId: string | null,
    startDate: Date,
    endDate: Date,
  ) {
    const hours: any[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, '0') + ':00';
      hours.push({
        hour: h,
        label: hourStr,
        clicks: 0,
        orders: 0,
        revenue: 0,
        commission: 0,
      });
    }

    // Query click traffic logs theo giờ
    const clickWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (isShop && storeId) {
      clickWhere.referralLink = { product: { storeId } };
    } else if (!isShop) {
      clickWhere.referralLink = { collaboratorId: userId };
    }

    const clicks = await this.prisma.clickTrafficLog.findMany({
      where: clickWhere,
      select: { createdAt: true },
    });

    clicks.forEach((c) => {
      const h = new Date(c.createdAt).getHours();
      if (hours[h]) hours[h].clicks += 1;
    });

    // Query orders theo giờ
    const orderWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (isShop && storeId) {
      orderWhere.storeId = storeId;
    } else if (!isShop) {
      orderWhere.attributedCollaboratorId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      select: { createdAt: true, finalAmount: true, status: true },
    });

    orders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      if (hours[h]) {
        hours[h].orders += 1;
        if (o.status === 'DELIVERED' || o.status === 'COMPLETED') {
          hours[h].revenue += Number(o.finalAmount || 0);
        }
      }
    });

    return hours.map((item) => ({
      ...item,
      conversionRate: item.clicks > 0 ? parseFloat(((item.orders / item.clicks) * 100).toFixed(2)) : 0,
    }));
  }

  private async _getDailyTimeSeries(
    userId: string,
    isShop: boolean,
    storeId: string | null,
    startDate: Date,
    endDate: Date,
  ) {
    const dayMap = new Map<string, {
      date: string;
      label: string;
      clicks: number;
      orders: number;
      revenue: number;
      commission: number;
    }>();

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dateStr = curr.toISOString().slice(0, 10);
      const label = `${curr.getDate()}/${curr.getMonth() + 1}`;
      dayMap.set(dateStr, {
        date: dateStr,
        label,
        clicks: 0,
        orders: 0,
        revenue: 0,
        commission: 0,
      });
      curr.setDate(curr.getDate() + 1);
    }

    // Query clicks
    const clickWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (isShop && storeId) {
      clickWhere.referralLink = { product: { storeId } };
    } else if (!isShop) {
      clickWhere.referralLink = { collaboratorId: userId };
    }

    const clicks = await this.prisma.clickTrafficLog.findMany({
      where: clickWhere,
      select: { createdAt: true },
    });

    clicks.forEach((c) => {
      const dateStr = new Date(c.createdAt).toISOString().slice(0, 10);
      const point = dayMap.get(dateStr);
      if (point) point.clicks += 1;
    });

    // Query orders
    const orderWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (isShop && storeId) {
      orderWhere.storeId = storeId;
    } else if (!isShop) {
      orderWhere.attributedCollaboratorId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      select: { createdAt: true, finalAmount: true, status: true },
    });

    orders.forEach((o) => {
      const dateStr = new Date(o.createdAt).toISOString().slice(0, 10);
      const point = dayMap.get(dateStr);
      if (point) {
        point.orders += 1;
        if (o.status === 'DELIVERED' || o.status === 'COMPLETED') {
          point.revenue += Number(o.finalAmount || 0);
        }
      }
    });

    // Query commissions
    const commissionWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (isShop && storeId) {
      commissionWhere.order = { storeId };
    } else if (!isShop) {
      commissionWhere.collaboratorId = userId;
    }

    const commissions = await this.prisma.commission.findMany({
      where: commissionWhere,
      select: { createdAt: true, commissionAmount: true },
    });

    commissions.forEach((comm) => {
      const dateStr = new Date(comm.createdAt).toISOString().slice(0, 10);
      const point = dayMap.get(dateStr);
      if (point) {
        point.commission += Number(comm.commissionAmount || 0);
      }
    });

    return Array.from(dayMap.values()).map((p) => ({
      ...p,
      conversionRate: p.clicks > 0 ? parseFloat(((p.orders / p.clicks) * 100).toFixed(2)) : 0,
    }));
  }

  private _calcGrowthPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100.0 : 0.0;
    }
    const growth = ((current - previous) / previous) * 100;
    return parseFloat(growth.toFixed(1));
  }

  // ─── CÁC HÀM CŨ ĐỂ TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY) ───────
  async getShopDashboard(userId: string, days = 30) {
    const overview = await this.getRealtimeOverview(userId, UserRole.SHOP_MANAGER, { days });
    const timeseries = await this.getTimeSeriesMetrics(userId, UserRole.SHOP_MANAGER, { days });

    return {
      summary: {
        totalOrders: overview.metrics.totalOrders,
        totalRevenue: overview.metrics.grossRevenue,
        totalCommissions: overview.metrics.totalCommission,
        totalClicks: overview.metrics.totalClicks,
        conversionRate: overview.metrics.conversionRate,
      },
      charts: {
        ordersByDay: timeseries.map((t) => ({ date: t.date, count: t.orders })),
        revenueByDay: timeseries.map((t) => ({ date: t.date, revenue: t.revenue })),
        clicksByDay: timeseries.map((t) => ({ date: t.date, clicks: t.clicks })),
      },
    };
  }

  async getKolDashboard(userId: string, days = 30) {
    const overview = await this.getRealtimeOverview(userId, UserRole.COLLABORATOR, { days });
    const timeseries = await this.getTimeSeriesMetrics(userId, UserRole.COLLABORATOR, { days });

    return {
      summary: {
        totalOrders: overview.metrics.totalOrders,
        totalClicks: overview.metrics.totalClicks,
        conversionRate: overview.metrics.conversionRate,
        totalCommission: overview.metrics.totalCommission,
        pendingCommission: 0,
      },
      charts: {
        commissionsByDay: timeseries.map((t) => ({ date: t.date, commission: t.commission })),
        clicksByDay: timeseries.map((t) => ({ date: t.date, clicks: t.clicks })),
      },
    };
  }
}

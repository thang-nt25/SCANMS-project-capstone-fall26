import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService, NOOP_CACHE_SERVICE } from '../../core/cache/cache.service';
import { UserRole, OrderStatus } from '@prisma/client';
import { DAY_MS, VIETNAM_OFFSET_MS, vietnamDayKey, vietnamDayStart, vietnamHour } from './analytics-time';
import {
  DashboardAnalyticsQueryDto,
  AnalyticsQuickRange,
  AnalyticsTimeInterval,
  TopBreakdownQueryDto,
  QueryReferralOrdersDto,
} from './dto/dashboard-analytics.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService = NOOP_CACHE_SERVICE,
  ) {}

  private async resolveAnalyticsScope(userId: string, role: string, requestedStoreId?: string) {
    if (role === UserRole.SHOP_MANAGER) {
      const storeId = await this.getStoreId(userId);
      if (!storeId || (requestedStoreId && requestedStoreId !== storeId)) throw new ForbiddenException('Không có quyền xem dữ liệu gian hàng này.');
      return { storeId, isShop: true };
    }
    if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER) return { storeId: requestedStoreId || null, isShop: true };
    if (role === UserRole.COLLABORATOR) return { storeId: null, isShop: false };
    throw new ForbiddenException('Không có quyền xem báo cáo tiếp thị.');
  }

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
    let interval: AnalyticsTimeInterval =
      dto.interval || AnalyticsTimeInterval.DAILY;

    const range =
      dto.range ||
      (dto.days
        ? AnalyticsQuickRange.CUSTOM
        : AnalyticsQuickRange.LAST_30_DAYS);

    const dayStart = vietnamDayStart(now);
    const local = new Date(now.getTime() + VIETNAM_OFFSET_MS);
    const monthStart = (offset: number) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1) - VIETNAM_OFFSET_MS);
    switch (range) {
      case AnalyticsQuickRange.TODAY:
        startDate = dayStart; endDate = new Date(dayStart.getTime() + DAY_MS - 1);
        interval = AnalyticsTimeInterval.HOURLY; break;
      case AnalyticsQuickRange.YESTERDAY:
        startDate = new Date(dayStart.getTime() - DAY_MS); endDate = new Date(dayStart.getTime() - 1);
        interval = AnalyticsTimeInterval.HOURLY; break;
      case AnalyticsQuickRange.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * DAY_MS); endDate = now; break;
      case AnalyticsQuickRange.LAST_30_DAYS:
        startDate = new Date(now.getTime() - 30 * DAY_MS); endDate = now; break;
      case AnalyticsQuickRange.THIS_MONTH:
        startDate = monthStart(0); endDate = now; break;
      case AnalyticsQuickRange.LAST_MONTH:
        startDate = monthStart(-1); endDate = new Date(monthStart(0).getTime() - 1); break;
      default:
        if (dto.startDate && dto.endDate) {
          startDate = new Date(dto.startDate); endDate = new Date(dto.endDate);
        } else if (dto.startDate || dto.endDate || dto.range === AnalyticsQuickRange.CUSTOM) {
          throw new BadRequestException('Khoảng tùy chọn cần đủ ngày bắt đầu và kết thúc.');
        } else {
          const days = dto.days || 30;
          if (!Number.isInteger(days) || days < 1 || days > 366) throw new BadRequestException('Khoảng thời gian không hợp lệ.');
          startDate = new Date(now.getTime() - days * DAY_MS); endDate = now;
        }
    }
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
      throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ.');
    }
    if (endDate.getTime() - startDate.getTime() > 366 * DAY_MS) throw new BadRequestException('Khoảng thời gian tối đa 366 ngày.');

    // Tính khoảng thời gian đối ứng kỳ trước để so sánh % tăng trưởng (Growth comparison)
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
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
  async getRealtimeOverview(
    userId: string,
    role: string,
    dto: DashboardAnalyticsQueryDto,
  ) {
    const cacheKey = `dashboard:overview:${role}:${userId}:${dto.storeId || ''}:${dto.range || ''}:${dto.days || ''}:${dto.startDate || ''}:${dto.endDate || ''}:${dto.campaignId || ''}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const { startDate, endDate, prevStartDate, prevEndDate } =
      this.resolveDateRange(dto);

    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

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
        where: {
          ...currentOrderWhere,
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
      // Doanh thu GMV kỳ này (finalAmount)
      this.prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: {
          ...currentOrderWhere,
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
      // Doanh thu GMV kỳ trước
      this.prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: {
          ...prevOrderWhere,
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
      // Hoa hồng kỳ này
      this.prisma.commission.aggregate({
        _sum: { commissionAmount: true },
        where: {
          ...currentCommissionWhere,
          status: { in: ['APPROVED', 'PAID'] },
        },
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
    const currCommission = Number(
      currCommissionAgg._sum?.commissionAmount ?? 0,
    );
    const prevCommission = Number(
      prevCommissionAgg._sum?.commissionAmount ?? 0,
    );

    // Tỷ lệ chuyển đổi Conversion Rate (CR%) = (Orders / Clicks) * 100
    const conversionRate =
      currClicksCount > 0
        ? parseFloat(((currOrdersCount / currClicksCount) * 100).toFixed(2))
        : 0;

    const prevConversionRate =
      prevClicksCount > 0
        ? parseFloat(((prevOrdersCount / prevClicksCount) * 100).toFixed(2))
        : 0;

    // Giá trị đơn hàng trung bình (Average Order Value - AOV)
    const averageOrderValue =
      currCompletedOrdersCount > 0
        ? Math.round(currRevenue / currCompletedOrdersCount)
        : 0;

    // Tính % tăng trưởng so với kỳ trước
    const growthClicks = this._calcGrowthPercent(
      currClicksCount,
      prevClicksCount,
    );
    const growthOrders = this._calcGrowthPercent(
      currOrdersCount,
      prevOrdersCount,
    );
    const growthRevenue = this._calcGrowthPercent(currRevenue, prevRevenue);
    const growthCommission = this._calcGrowthPercent(
      currCommission,
      prevCommission,
    );
    const growthConversionRate = this._calcGrowthPercent(
      conversionRate,
      prevConversionRate,
    );

    // Số liên kết tiếp thị đang hoạt động
    const activeLinksCount = await this.prisma.referralLink.count({ where: {
      status: 'ACTIVE', deletedAt: null,
      ...(storeId ? { storeId } : !isShop ? { collaboratorId: userId } : {}),
    } });

    // Tính toán Hoa hồng tạm tính (Estimated Commission từ các đơn đang xử lý / đang giao / chờ đối soát)
    let estimatedCommission = 0;
    let pendingOrdersCount = 0;
    if (!isShop) {
      const rows = await this.prisma.$queryRaw<Array<{ estimatedCommission: string | number | null; pendingOrdersCount: bigint }>>`
        SELECT COALESCE(SUM(oi.calculated_commission_amount), 0) AS "estimatedCommission",
               COUNT(DISTINCT o.id) AS "pendingOrdersCount"
        FROM "orders" o
        JOIN "order_items" oi ON oi.order_id = o.id
        LEFT JOIN "commissions" c ON c.order_id = o.id AND c.status IN ('APPROVED', 'PAID')
        WHERE o.attributed_collaborator_id = ${userId}::uuid
          AND o.status IN ('PENDING', 'SHIPPING', 'DELIVERED')
          AND c.id IS NULL
      `;
      estimatedCommission = Number(rows[0]?.estimatedCommission || 0);
      pendingOrdersCount = Number(rows[0]?.pendingOrdersCount || 0);
    } else if (storeId) {
      const rows = await this.prisma.$queryRaw<Array<{ estimatedCommission: string | number | null; pendingOrdersCount: bigint }>>`
        SELECT COALESCE(SUM(oi.calculated_commission_amount), 0) AS "estimatedCommission",
               COUNT(DISTINCT o.id) AS "pendingOrdersCount"
        FROM "orders" o
        JOIN "order_items" oi ON oi.order_id = o.id
        LEFT JOIN "commissions" c ON c.order_id = o.id AND c.status IN ('APPROVED', 'PAID')
        WHERE o.store_id = ${storeId}::uuid
          AND o.attributed_collaborator_id IS NOT NULL
          AND o.status IN ('PENDING', 'SHIPPING', 'DELIVERED')
          AND c.id IS NULL
      `;
      estimatedCommission = Number(rows[0]?.estimatedCommission || 0);
      pendingOrdersCount = Number(rows[0]?.pendingOrdersCount || 0);
    }

    const overviewResult = {
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

        estimatedCommission: Math.round(estimatedCommission),
        pendingOrdersCount,

        vipBonusCommission: 0,
        conversionRate,
        previousConversionRate: prevConversionRate,
        growthConversionRate,

        averageOrderValue,
        activeReferralLinks: activeLinksCount,
      },
    };
    await this.cacheService.set(cacheKey, overviewResult, 30);
    return overviewResult;
  }

  // ─── 2. CHUỖI THỜI GIAN BIỂU ĐỒ (TIME-SERIES METRICS) ────────────────
  async getTimeSeriesMetrics(
    userId: string,
    role: string,
    dto: DashboardAnalyticsQueryDto,
  ) {
    const { startDate, endDate, interval } = this.resolveDateRange(dto);
    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

    const cacheKey = `dashboard:timeseries:${role}:${userId}:${dto.storeId || ''}:${dto.range || ''}:${dto.days || ''}:${dto.startDate || ''}:${dto.endDate || ''}:${interval}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    let result;
    if (interval === AnalyticsTimeInterval.HOURLY) {
      result = await this._getHourlyTimeSeries(
        userId,
        isShop,
        storeId,
        startDate,
        endDate,
      );
    } else {
      result = await this._getDailyTimeSeries(
        userId,
        isShop,
        storeId,
        startDate,
        endDate,
      );
    }
    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }

  // ─── 3. TOP SẢN PHẨM BÁN CHẠY NHẤT (TOP PRODUCTS BREAKDOWN) ───────────
  async getTopProductsBreakdown(
    userId: string,
    role: string,
    dto: TopBreakdownQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      range: dto.range,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
    const limit = dto.limit || 5;

    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

    const cacheKey = `dashboard:topproducts:${role}:${userId}:${dto.storeId || ''}:${dto.range || ''}:${dto.startDate || ''}:${dto.endDate || ''}:${limit}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

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
    const productMap = new Map<
      string,
      {
        product: any;
        orderCount: number;
        quantitySold: number;
        grossRevenue: number;
      }
    >();

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
      existing.grossRevenue +=
        Number(item.unitPrice || item.product.price) * item.quantity;
      productMap.set(pid, existing);
    }

    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.grossRevenue - a.grossRevenue)
      .slice(0, limit);

    const result = sortedProducts.map((p, idx) => ({
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
    await this.cacheService.set(cacheKey, result, 45);
    return result;
  }

  // ─── 4. TOP KÊNH TRUYỀN THÔNG HIỆU QUẢ (CHANNELS BREAKDOWN) ───────────
  async getTopChannelsBreakdown(
    userId: string,
    role: string,
    dto: TopBreakdownQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      range: dto.range,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

    const cacheKey = `dashboard:topchannels:${role}:${userId}:${dto.storeId || ''}:${dto.range || ''}:${dto.startDate || ''}:${dto.endDate || ''}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

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

    const channelMap = new Map<
      string,
      { channel: string; clicks: number; orders: number }
    >();
    const defaultChannels = [
      'TIKTOK',
      'FACEBOOK',
      'YOUTUBE',
      'INSTAGRAM',
      'ZALO',
      'DIRECT',
    ];

    defaultChannels.forEach((c) => {
      channelMap.set(c, { channel: c, clicks: 0, orders: 0 });
    });

    for (const log of logs) {
      const ch = (log.referralLink?.channel || 'DIRECT').toUpperCase();
      const existing = channelMap.get(ch) || {
        channel: ch,
        clicks: 0,
        orders: 0,
      };
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
      const existing = channelMap.get(ch) || {
        channel: ch,
        clicks: 0,
        orders: 0,
      };
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
        conversionRate:
          c.clicks > 0
            ? parseFloat(((c.orders / c.clicks) * 100).toFixed(2))
            : 0,
        trafficSharePercent:
          totalClicks > 0
            ? parseFloat(((c.clicks / totalClicks) * 100).toFixed(1))
            : 0,
      }));

    await this.cacheService.set(cacheKey, result, 45);
    return result;
  }

  // ─── 5. PHỄU CHUYỂN ĐỔI (CONVERSION FUNNEL) ──────────────────────────
  async getConversionFunnel(
    userId: string,
    role: string,
    dto: DashboardAnalyticsQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDateRange(dto);

    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

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
          percentage:
            totalClicks > 0
              ? parseFloat(((totalOrders / totalClicks) * 100).toFixed(2))
              : 0,
        },
        {
          stage: 'ORDERS_COMPLETED',
          label: 'Đơn Giao Thành Công (Completed)',
          count: completedOrders,
          percentage:
            totalOrders > 0
              ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(2))
              : 0,
        },
      ],
      conversionRate:
        totalClicks > 0
          ? parseFloat(((totalOrders / totalClicks) * 100).toFixed(2))
          : 0,
      fulfillmentRate:
        totalOrders > 0
          ? parseFloat(((completedOrders / totalOrders) * 100).toFixed(2))
          : 0,
    };
  }

  // ─── 6. HIỆU SUẤT CHIẾN DỊCH ĐỘC QUYỀN VIP (CAMPAIGN PERFORMANCE) ─────
  async getCampaignPerformanceMetrics(
    userId: string,
    role: string,
    dto: DashboardAnalyticsQueryDto,
  ) {
    const { startDate, endDate } = this.resolveDateRange(dto);

    let rawCampaigns: any[] = [];
    const { storeId, isShop } = await this.resolveAnalyticsScope(userId, role, dto.storeId);

    if (isShop) {
        rawCampaigns = await this.prisma.campaign.findMany({
          where: storeId ? { storeId } : {},
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

    const campIds = rawCampaigns.map((c) => c.id);
    const allOrdersWhere: any = {
      referralLink: { campaignId: { in: campIds } },
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['DELIVERED', 'COMPLETED'] },
    };
    if (role === UserRole.COLLABORATOR) {
      allOrdersWhere.attributedCollaboratorId = userId;
    }

    // Tối ưu N+1: Lấy toàn bộ đơn hàng của tất cả chiến dịch trong 1 query duy nhất
    const allOrders = campIds.length
      ? await this.prisma.order.findMany({
          where: allOrdersWhere,
          select: {
            id: true,
            finalAmount: true,
            referralLink: { select: { campaignId: true } },
            commissions: { select: { commissionAmount: true } },
          },
        })
      : [];

    const ordersByCampId = new Map<string, typeof allOrders>();
    for (const o of allOrders) {
      const cId = o.referralLink?.campaignId;
      if (cId) {
        let list = ordersByCampId.get(cId);
        if (!list) {
          list = [];
          ordersByCampId.set(cId, list);
        }
        list.push(o);
      }
    }

    const results: any[] = [];
    for (const camp of rawCampaigns) {
      const orders = ordersByCampId.get(camp.id) || [];
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, o) => sum + Number(o.finalAmount || 0),
        0,
      );
      const totalCommissions = orders.reduce((sum, o) => {
        const commSum =
          o.commissions?.reduce(
            (cSum, c) => cSum + Number(c.commissionAmount || 0),
            0,
          ) || 0;
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
      const h = vietnamHour(c.createdAt);
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
      const h = vietnamHour(o.createdAt);
      if (hours[h]) {
        hours[h].orders += 1;
        if (o.status === 'DELIVERED' || o.status === 'COMPLETED') {
          hours[h].revenue += Number(o.finalAmount || 0);
        }
      }
    });

    const commissions = await this.prisma.commission.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, status: { in: ['APPROVED', 'PAID'] },
        ...(storeId ? { order: { storeId } } : !isShop ? { collaboratorId: userId } : {}),
      }, select: { createdAt: true, commissionAmount: true },
    });
    for (const commission of commissions) hours[vietnamHour(commission.createdAt)].commission += Number(commission.commissionAmount || 0);

    return hours.map((item) => ({
      ...item,
      conversionRate:
        item.clicks > 0
          ? parseFloat(((item.orders / item.clicks) * 100).toFixed(2))
          : 0,
    }));
  }

  private async _getDailyTimeSeries(
    userId: string,
    isShop: boolean,
    storeId: string | null,
    startDate: Date,
    endDate: Date,
  ) {
    const dayMap = new Map<
      string,
      {
        date: string;
        label: string;
        clicks: number;
        orders: number;
        revenue: number;
        commission: number;
      }
    >();

    const curr = vietnamDayStart(startDate);
    while (curr <= endDate) {
      const dateStr = vietnamDayKey(curr);
      const label = `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}`;
      dayMap.set(dateStr, {
        date: dateStr,
        label,
        clicks: 0,
        orders: 0,
        revenue: 0,
        commission: 0,
      });
      curr.setTime(curr.getTime() + DAY_MS);
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
      const dateStr = vietnamDayKey(c.createdAt);
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
      const dateStr = vietnamDayKey(o.createdAt);
      const point = dayMap.get(dateStr);
      if (point) {
        point.orders += 1;
        if (o.status === 'DELIVERED' || o.status === 'COMPLETED') {
          point.revenue += Number(o.finalAmount || 0);
        }
      }
    });

    // Query commissions
    const commissionWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['APPROVED', 'PAID'] },
    };
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
      const dateStr = vietnamDayKey(comm.createdAt);
      const point = dayMap.get(dateStr);
      if (point) {
        point.commission += Number(comm.commissionAmount || 0);
      }
    });

    return Array.from(dayMap.values()).map((p) => ({
      ...p,
      conversionRate:
        p.clicks > 0 ? parseFloat(((p.orders / p.clicks) * 100).toFixed(2)) : 0,
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
    const overview = await this.getRealtimeOverview(
      userId,
      UserRole.SHOP_MANAGER,
      { days },
    );
    const timeseries = await this.getTimeSeriesMetrics(
      userId,
      UserRole.SHOP_MANAGER,
      { days },
    );

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
        revenueByDay: timeseries.map((t) => ({
          date: t.date,
          revenue: t.revenue,
        })),
        clicksByDay: timeseries.map((t) => ({
          date: t.date,
          clicks: t.clicks,
        })),
      },
    };
  }

  async getKolDashboard(userId: string, days = 30) {
    const overview = await this.getRealtimeOverview(
      userId,
      UserRole.COLLABORATOR,
      { days },
    );
    const timeseries = await this.getTimeSeriesMetrics(
      userId,
      UserRole.COLLABORATOR,
      { days },
    );

    return {
      summary: {
        totalOrders: overview.metrics.totalOrders,
        totalClicks: overview.metrics.totalClicks,
        conversionRate: overview.metrics.conversionRate,
        totalCommission: overview.metrics.totalCommission,
        pendingCommission: 0,
      },
      charts: {
        commissionsByDay: timeseries.map((t) => ({
          date: t.date,
          commission: t.commission,
        })),
        clicksByDay: timeseries.map((t) => ({
          date: t.date,
          clicks: t.clicks,
        })),
      },
    };
  }

  // ─── 7. LẤY DANH SÁCH ĐƠN HÀNG TIẾP THỊ CỦA KOL (REFERRAL ORDERS) ───
  async getCollaboratorReferralOrders(
    collaboratorId: string,
    query: QueryReferralOrdersDto,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      attributedCollaboratorId: collaboratorId,
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { externalOrderSn: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        {
          orderItems: {
            some: {
              product: {
                title: { contains: s, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          externalOrderSn: true,
          status: true,
          subtotalAmount: true,
          discountAmount: true,
          shippingFee: true,
          finalAmount: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          customerName: true,
          customerPhone: true,
          attributionMethod: true,
          attributionConfidence: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              appliedCommissionRate: true,
              calculatedCommissionAmount: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  sku: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          commissions: {
            select: {
              id: true,
              status: true,
              commissionAmount: true,
              availableAt: true,
              eligibleAt: true,
              approvedAt: true,
            },
          },
        },
      }),
    ]);

    const items = orders.map((order) => {
      const totalCommission = order.orderItems.reduce(
        (sum, item) => sum + Number(item.calculatedCommissionAmount || 0),
        0,
      );
      const avgCommissionRate =
        order.orderItems.length > 0
          ? order.orderItems[0].appliedCommissionRate
          : 10;

      return {
        id: order.id,
        orderCode: order.externalOrderSn,
        status: order.status,
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerPhoneMasked: order.customerPhone
          ? order.customerPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
          : '***',
        storeName: order.store?.name || 'Gian hàng',
        storeLogo: order.store?.logoUrl,
        finalAmount: Number(order.finalAmount),
        commissionAmount: totalCommission,
        commissionRate: avgCommissionRate,
        commissionStatus:
          order.commissions?.[0]?.status ||
          (['DELIVERED', 'COMPLETED'].includes(order.status)
            ? 'IN_ESCROW'
            : 'ESTIMATED'),
        availableAt: order.commissions?.[0]?.availableAt || null,
        products: order.orderItems.map((item) => ({
          id: item.product?.id,
          title: item.product?.title || '',
          variantName: item.variant?.name,
          imageUrl: item.product?.imageUrl,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          commissionAmount: Number(item.calculatedCommissionAmount || 0),
        })),
      };
    });

    return {
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  // ─── 8. LẤY ĐƠN HÀNG TIẾP THỊ CỦA 1 KOL TRONG GIAN HÀNG (SHOP MANAGER) ───
  async getShopKolOrders(
    userId: string,
    userRole: string,
    kolId: string,
    query: QueryReferralOrdersDto,
  ) {
    let storeId: string | null = null;
    if (userRole === UserRole.SHOP_MANAGER) {
      storeId = await this.getStoreId(userId);
      if (!storeId) throw new ForbiddenException('Không tìm thấy gian hàng của bạn.');
    } else if (
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER
    ) {
      storeId = query.storeId || null;
    } else {
      throw new ForbiddenException('Không có quyền xem dữ liệu.');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      attributedCollaboratorId: kolId,
      ...(storeId ? { storeId } : {}),
    };

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          externalOrderSn: true,
          status: true,
          finalAmount: true,
          createdAt: true,
          customerName: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              appliedCommissionRate: true,
              calculatedCommissionAmount: true,
              product: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                },
              },
            },
          },
          commissions: {
            select: {
              id: true,
              status: true,
              commissionAmount: true,
            },
          },
        },
      }),
    ]);

    const items = orders.map((order) => {
      const totalCommission = order.orderItems.reduce(
        (sum, item) => sum + Number(item.calculatedCommissionAmount || 0),
        0,
      );
      const firstProduct =
        order.orderItems[0]?.product?.title || 'Sản phẩm tiếp thị';
      const otherCount = order.orderItems.length - 1;

      return {
        id: order.id,
        orderCode: order.externalOrderSn,
        createdAt: order.createdAt,
        customerName: order.customerName,
        productTitle:
          otherCount > 0 ? `${firstProduct} (+${otherCount})` : firstProduct,
        orderTotal: Number(order.finalAmount),
        finalAmount: Number(order.finalAmount),
        commissionEarned: totalCommission,
        commissionAmount: totalCommission,
        commissionRate: order.orderItems[0]?.appliedCommissionRate || 10,
        status: order.status,
      };
    });

    return {
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  // ─── 9. TỔNG HỢP HOA HỒNG THEO TỪNG SẢN PHẨM CỦA KOL (PRODUCT BREAKDOWN) ───
  async getCollaboratorTopProducts(collaboratorId: string, limit = 10) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId: collaboratorId },
      include: { tier: true },
    });
    const tierName = profile?.tier?.name || 'Mới';
    let tierBonus = 0;
    if (tierName.toLowerCase().includes('bạc') || tierName.toLowerCase().includes('silver')) tierBonus = 1;
    else if (tierName.toLowerCase().includes('vàng') || tierName.toLowerCase().includes('gold')) tierBonus = 2;
    else if (tierName.toLowerCase().includes('kim cương') || tierName.toLowerCase().includes('diamond')) tierBonus = 3;

    const activeDeals = await this.prisma.exclusiveDealProposal.findMany({
      where: {
        collaboratorId,
        status: 'APPROVED',
      },
      select: {
        productId: true,
        approvedCommissionRate: true,
        proposedCommissionRate: true,
      },
    });
    const dealRateByProduct = new Map<string, number>();
    for (const d of activeDeals) {
      const rate = Number(d.approvedCommissionRate || d.proposedCommissionRate || 0);
      dealRateByProduct.set(d.productId, rate);
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          attributedCollaboratorId: collaboratorId,
          status: { in: [OrderStatus.PENDING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            store: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    const productMap = new Map<string, {
      productId: string;
      productTitle: string;
      productImage: string | null;
      productPrice: number;
      storeName: string;
      unitsSold: number;
      grossRevenue: number;
      commissionEarned: number;
      appliedRates: number[];
      orderIds: Set<string>;
    }>();

    for (const item of orderItems) {
      const pid = item.productId;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productTitle: item.product?.title || 'Sản phẩm',
          productImage: item.product?.imageUrl || null,
          productPrice: Number(item.unitPrice || item.product?.price || 0),
          storeName: item.product?.store?.name || 'SCANMS Store',
          unitsSold: 0,
          grossRevenue: 0,
          commissionEarned: 0,
          appliedRates: [],
          orderIds: new Set<string>(),
        });
      }

      const pData = productMap.get(pid)!;
      pData.unitsSold += item.quantity;
      pData.grossRevenue += Number(item.unitPrice) * item.quantity;
      pData.commissionEarned += Number(item.calculatedCommissionAmount || 0);
      pData.orderIds.add(item.orderId);
      if (item.appliedCommissionRate) {
        pData.appliedRates.push(Number(item.appliedCommissionRate));
      }
    }

    const items = Array.from(productMap.values()).map((p) => {
      const avgRate = p.appliedRates.length > 0
        ? Math.round(p.appliedRates.reduce((a, b) => a + b, 0) / p.appliedRates.length)
        : 10;
      
      const dealRate = dealRateByProduct.get(p.productId);
      const dealBonus = dealRate ? Math.max(0, dealRate - 10) : 0;
      const baseRate = 10;
      const finalRate = Math.min(25, Math.max(avgRate, baseRate + tierBonus + dealBonus));

      return {
        productId: p.productId,
        productTitle: p.productTitle,
        productImage: p.productImage,
        productPrice: p.productPrice,
        storeName: p.storeName,
        unitsSold: p.unitsSold,
        ordersCount: p.orderIds.size,
        grossRevenue: p.grossRevenue,
        commissionEarned: p.commissionEarned,
        rateBreakdown: {
          baseRate,
          tierBonus,
          tierName,
          dealBonus,
          hasExclusiveDeal: Boolean(dealRate),
          liveBonus: finalRate > baseRate + tierBonus + dealBonus ? finalRate - (baseRate + tierBonus + dealBonus) : 0,
          finalRate,
        },
      };
    });

    items.sort((a, b) => b.commissionEarned - a.commissionEarned);

    return {
      success: true,
      totalProducts: items.length,
      items: items.slice(0, limit),
    };
  }

  // ─── 10. TỔNG HỢP HIỆU SUẤT LIVESTREAM CỦA KOL (LIVE SESSION SUMMARY) ───
  async getCollaboratorLiveSessionsSummary(collaboratorId: string) {
    const cacheKey = `dashboard:livesummary:${collaboratorId}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const liveSessions = await this.prisma.liveShoppingSession.findMany({
      where: { creatorId: collaboratorId },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        products: {
          include: {
            product: { select: { id: true, title: true, imageUrl: true, price: true } },
          },
        },
      },
      orderBy: { startsAt: 'desc' },
      take: 20,
    });

    if (!liveSessions.length) {
      const emptyRes = {
        success: true,
        totalSessions: 0,
        totals: {
          totalLiveRevenue: 0,
          totalLiveCommission: 0,
          totalLiveOrders: 0,
        },
        sessions: [],
      };
      await this.cacheService.set(cacheKey, emptyRes, 45);
      return emptyRes;
    }

    // Tối ưu N+1: Gộp 20 câu query thành 1 query duy nhất quét toàn bộ khoảng thời gian
    const minStartsAt = new Date(Math.min(...liveSessions.map(s => s.startsAt.getTime())));
    const maxEndsAt = new Date(Math.max(...liveSessions.map(s => (s.endsAt ? s.endsAt.getTime() : Date.now()))));
    const storeIds = [...new Set(liveSessions.map(s => s.storeId))];

    const allLiveOrders = await this.prisma.order.findMany({
      where: {
        attributedCollaboratorId: collaboratorId,
        storeId: { in: storeIds },
        createdAt: { gte: minStartsAt, lte: maxEndsAt },
        status: { in: [OrderStatus.PENDING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      },
      include: {
        orderItems: {
          select: {
            quantity: true,
            unitPrice: true,
            calculatedCommissionAmount: true,
          },
        },
      },
    });

    const sessions = liveSessions.map((sess) => {
      const sessEndsAt = sess.endsAt || new Date();
      const liveOrders = allLiveOrders.filter(
        (o) => o.storeId === sess.storeId && o.createdAt >= sess.startsAt && o.createdAt <= sessEndsAt
      );

      const ordersCount = liveOrders.length;
      let unitsSold = 0;
      let grossRevenue = 0;
      let commissionEarned = 0;

      for (const ord of liveOrders) {
        for (const it of ord.orderItems) {
          unitsSold += it.quantity;
          grossRevenue += Number(it.unitPrice) * it.quantity;
          commissionEarned += Number(it.calculatedCommissionAmount || 0);
        }
      }

        return {
          id: sess.id,
          title: sess.title,
          coverImageUrl: sess.coverImageUrl,
          storeName: sess.store?.name || 'Gian hàng',
          storeLogo: sess.store?.logoUrl,
          startsAt: sess.startsAt,
          endsAt: sess.endsAt,
          status: sess.status,
          pinnedProductsCount: sess.products.length,
          liveBonusRate: Number(sess.commissionRate || 2),
          metrics: {
            ordersCount,
            unitsSold,
            grossRevenue,
            commissionEarned,
          },
        };
      });

    const totalLiveRevenue = sessions.reduce((sum, s) => sum + s.metrics.grossRevenue, 0);
    const totalLiveCommission = sessions.reduce((sum, s) => sum + s.metrics.commissionEarned, 0);
    const totalLiveOrders = sessions.reduce((sum, s) => sum + s.metrics.ordersCount, 0);

    return {
      success: true,
      totalSessions: sessions.length,
      totals: {
        totalLiveRevenue,
        totalLiveCommission,
        totalLiveOrders,
      },
      sessions,
    };
  }
}



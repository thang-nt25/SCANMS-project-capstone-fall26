import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  LeaderboardQueryDto,
  LeaderboardMetricType,
  LeaderboardTimeRange,
  LeaderboardScope,
  LeaderboardItemDto,
  LeaderboardFullResponseDto,
  LeaderboardPodiumDto,
  MyRankStatusDto,
} from './dto/leaderboard.dto';
import { UserRole, OrderStatus } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. XỬ LÝ KHOẢNG THỜI GIAN THEO BỘ LỌC ───────────────────────────
  private resolveLeaderboardPeriod(dto: LeaderboardQueryDto): {
    startDate: Date;
    endDate: Date;
    prevStartDate: Date;
    prevEndDate: Date;
    label: string;
    hasPreviousPeriod: boolean;
  } {
    const now = new Date();
    const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const monthStart = (year: number, month: number) =>
      new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000);
    const allTime = dto.timeRange === LeaderboardTimeRange.ALL_TIME && !(dto.month && dto.year);
    let year = dto.year && dto.month ? dto.year : vietnamNow.getUTCFullYear();
    let month = dto.year && dto.month ? dto.month - 1 : vietnamNow.getUTCMonth();
    let months = 1;
    if (!(dto.month && dto.year)) {
      if (dto.timeRange === LeaderboardTimeRange.LAST_MONTH) month -= 1;
      if (dto.timeRange === LeaderboardTimeRange.THIS_QUARTER) {
        month = Math.floor(month / 3) * 3;
        months = 3;
      }
    }
    // Normalize January -> previous December independently of the server timezone.
    const normalized = new Date(Date.UTC(year, month, 1));
    year = normalized.getUTCFullYear();
    month = normalized.getUTCMonth();
    const startDate = allTime ? new Date(0) : monthStart(year, month);
    const endDate = allTime ? now : new Date(monthStart(year, month + months).getTime() - 1);
    const prevStartDate = allTime ? new Date(0) : monthStart(year, month - months);
    const prevEndDate = new Date(startDate.getTime() - 1);
    const label = allTime ? 'Toàn thời gian' : months === 3
      ? `Quý ${Math.floor(month / 3) + 1}/${year}` : `Tháng ${month + 1}/${year}`;
    return { startDate, endDate, prevStartDate, prevEndDate, label, hasPreviousPeriod: !allTime };
  }

  // ─── 2. TÍNH TOÁN BẢNG XẾP HẠNG LEADERBOARD TOÀN DIỆN ─────────────────
  async getLeaderboard(
    currentUserId: string,
    currentUserRole: string,
    dto: LeaderboardQueryDto,
  ): Promise<LeaderboardFullResponseDto> {
    const { startDate, endDate, prevStartDate, prevEndDate, label, hasPreviousPeriod } =
      this.resolveLeaderboardPeriod(dto);

    // Điều kiện lọc phạm vi (Global vs Store)
    // Count each successful order in the period it was delivered. Completion is
    // the fallback only when delivery has no timestamp; never use its creation date.
    const successDateWhere = (start: Date, end: Date) => ({ OR: [
      { deliveredAt: { gte: start, lte: end } },
      { deliveredAt: null, completedAt: { gte: start, lte: end } },
    ] });
    const baseOrderWhere: any = {
      ...(hasPreviousPeriod ? successDateWhere(startDate, endDate) : {}),
      status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      attributedCollaboratorId: { not: null },
    };

    const prevOrderWhere: any = {
      ...successDateWhere(prevStartDate, prevEndDate),
      status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      attributedCollaboratorId: { not: null },
    };

    let scopedStoreId: string | undefined;
    if (dto.scope === LeaderboardScope.STORE) {
      scopedStoreId = dto.storeId;
      if (currentUserRole === UserRole.SHOP_MANAGER) {
        const store = await this.prisma.store.findFirst({
          where: {
            ownerId: currentUserId,
            isDeleted: false,
            ...(dto.storeId ? { id: dto.storeId } : {}),
          },
          select: { id: true },
        });
        if (!store)
          throw new NotFoundException('Không tìm thấy gian hàng của bạn.');
        scopedStoreId = store.id;
      } else if (
        currentUserRole !== UserRole.SYSTEM_ADMIN &&
        currentUserRole !== UserRole.SYSTEM_MANAGER
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền xem bảng xếp hạng theo gian hàng.',
        );
      }

      if (!scopedStoreId) {
        throw new BadRequestException(
          'Cần chọn gian hàng để lọc bảng xếp hạng.',
        );
      }
      baseOrderWhere.storeId = scopedStoreId;
      prevOrderWhere.storeId = scopedStoreId;
    }

    if (dto.category) {
      baseOrderWhere.orderItems = {
        some: { product: { categoryName: dto.category } },
      };
      prevOrderWhere.orderItems = {
        some: { product: { categoryName: dto.category } },
      };
    }

    // Gom số liệu ngay trong DB để không tải toàn bộ đơn và click log về Node.
    const metric = dto.metric || LeaderboardMetricType.REVENUE;
    const clickWhere = {
      createdAt: { gte: startDate, lte: endDate },
      collaboratorId: { not: null },
      isValid: true,
      ...(scopedStoreId ? { storeId: scopedStoreId } : {}),
    };
    const [
      orderGroups,
      prevOrderGroups,
      clickGroups,
      commissionGroups,
      collaborators,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['attributedCollaboratorId'],
        where: baseOrderWhere,
        _sum: { finalAmount: true },
        _count: { _all: true },
      }),
      metric === LeaderboardMetricType.REVENUE && hasPreviousPeriod
        ? this.prisma.order.groupBy({
            by: ['attributedCollaboratorId'],
            where: prevOrderWhere,
            _sum: { finalAmount: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      this.prisma.clickTrafficLog.groupBy({
        by: ['collaboratorId'],
        where: clickWhere,
        _count: { _all: true },
      }),
      this.prisma.commission.groupBy({
        by: ['collaboratorId'],
        where: { order: { is: baseOrderWhere }, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.user.findMany({
        where: {
          role: UserRole.COLLABORATOR,
          isActive: true,
          isDeleted: false,
        },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          collaboratorProfile: {
            select: {
              avatarUrl: true,
              tier: { select: { name: true } },
            },
          },
          socialChannels: {
            where: { isPrimary: true },
            select: { channelName: true, platformName: true },
          },
        },
      }),
    ]);

    // 2. Gom nhóm số liệu theo từng Collaborator
    const statsMap = new Map<
      string,
      {
        collaboratorId: string;
        fullName: string;
        avatarUrl?: string;
        primaryChannelHandle?: string;
        primaryPlatform?: string;
        tierName: string;
        grossRevenue: number;
        totalOrders: number;
        totalClicks: number;
        totalCommission: number;
      }
    >();

    // Khởi tạo danh sách từ bảng người dùng
    for (const c of collaborators) {
      const primarySocial = c.socialChannels?.[0];
      statsMap.set(c.id, {
        collaboratorId: c.id,
        fullName: c.fullName || 'Creator SCANMS',
        avatarUrl: c.avatarUrl || c.collaboratorProfile?.avatarUrl || undefined,
        primaryChannelHandle: primarySocial?.channelName
          ? `@${primarySocial.channelName}`
          : undefined,
        primaryPlatform: primarySocial?.platformName || undefined,
        tierName: c.collaboratorProfile?.tier?.name || 'Chưa xếp cấp bậc',
        grossRevenue: 0,
        totalOrders: 0,
        totalClicks: 0,
        totalCommission: 0,
      });
    }

    // Gán số liệu đã được gom nhóm từ DB.
    for (const group of clickGroups) {
      if (group.collaboratorId && statsMap.has(group.collaboratorId)) {
        statsMap.get(group.collaboratorId)!.totalClicks = group._count._all;
      }
    }

    for (const group of orderGroups) {
      if (
        group.attributedCollaboratorId &&
        statsMap.has(group.attributedCollaboratorId)
      ) {
        const item = statsMap.get(group.attributedCollaboratorId)!;
        item.totalOrders = group._count._all;
        item.grossRevenue = Number(group._sum.finalAmount || 0);
      }
    }
    for (const group of commissionGroups) {
      if (statsMap.has(group.collaboratorId)) {
        statsMap.get(group.collaboratorId)!.totalCommission = Number(
          group._sum.commissionAmount || 0,
        );
      }
    }

    // Gom nhóm kỳ trước để tính thứ hạng quá khứ
    const prevRevenueMap = new Map<string, { revenue: number; orders: number }>();
    for (const group of prevOrderGroups) {
      if (group.attributedCollaboratorId && statsMap.has(group.attributedCollaboratorId) && Number(group._sum.finalAmount || 0) > 0) {
        prevRevenueMap.set(
          group.attributedCollaboratorId,
          { revenue: Number(group._sum.finalAmount || 0), orders: group._count._all },
        );
      }
    }

    const prevRankSorted = Array.from(prevRevenueMap.entries()).sort(
      (a, b) => b[1].revenue - a[1].revenue || b[1].orders - a[1].orders || a[0].localeCompare(b[0]),
    );
    const prevRankMap = new Map<string, number>();
    let previousRank = 0;
    prevRankSorted.forEach(([collabId, stats], index) => {
      const prior = prevRankSorted[index - 1]?.[1];
      if (!prior || stats.revenue !== prior.revenue || stats.orders !== prior.orders) previousRank = index + 1;
      prevRankMap.set(collabId, previousRank);
    });

    // 3. Sắp xếp danh sách theo Metric được chọn
    type CreatorStats = (typeof statsMap extends Map<string, infer T> ? T : never);
    const conversion = (item: CreatorStats) => item.totalClicks > 0
      ? (item.totalOrders / item.totalClicks) * 100 : 0;
    const eligible = (item: CreatorStats) => {
      switch (metric) {
        case LeaderboardMetricType.ORDERS: return item.totalOrders > 0;
        case LeaderboardMetricType.CONVERSION_RATE: return conversion(item) > 0;
        case LeaderboardMetricType.COMMISSION: return item.totalCommission > 0;
        default: return item.grossRevenue > 0;
      }
    };
    const compareStats = (a: CreatorStats, b: CreatorStats) => {
      switch (metric) {
        case LeaderboardMetricType.ORDERS:
          return (
            b.totalOrders - a.totalOrders || b.grossRevenue - a.grossRevenue
          );
        case LeaderboardMetricType.CONVERSION_RATE: {
          const crA = conversion(a);
          const crB = conversion(b);
          return crB - crA || b.grossRevenue - a.grossRevenue;
        }
        case LeaderboardMetricType.COMMISSION:
          return (
            b.totalCommission - a.totalCommission ||
            b.grossRevenue - a.grossRevenue
          );
        case LeaderboardMetricType.REVENUE:
        default:
          return (
            b.grossRevenue - a.grossRevenue || b.totalOrders - a.totalOrders
          );
      }
    };
    const sortedList = Array.from(statsMap.values()).filter(eligible).sort(
      (a, b) => compareStats(a, b) || a.collaboratorId.localeCompare(b.collaboratorId),
    );

    // 4. Định hình DTO và tính toán Rank Delta
    let sharedRank = 0;
    const allRankedItems: LeaderboardItemDto[] = sortedList.map(
      (item, index) => {
        // ID only stabilizes display order. Equal metric and secondary metric
        // share a competition rank (1, 1, 3), including across podium/table.
        if (index === 0 || compareStats(item, sortedList[index - 1]) !== 0) sharedRank = index + 1;
        const currentRank = sharedRank;
        const prevRank = prevRankMap.get(item.collaboratorId);
        let rankDelta = 0;
        if (prevRank !== undefined) {
          rankDelta = prevRank - currentRank; // rank cũ 5, rank mới 3 => +2 bậc
        } else {
          rankDelta = 0; // NEW
        }

        const conversionRate =
          item.totalClicks > 0
            ? parseFloat(
                ((item.totalOrders / item.totalClicks) * 100).toFixed(2),
              )
            : 0;

        return {
          rank: currentRank,
          rankDelta,
          collaboratorId: item.collaboratorId,
          fullName: item.fullName,
          avatarUrl: item.avatarUrl,
          primaryChannelHandle: item.primaryChannelHandle,
          primaryPlatform: item.primaryPlatform,
          tierName: item.tierName,
          grossRevenue: item.grossRevenue,
          totalOrders: item.totalOrders,
          totalClicks: item.totalClicks,
          conversionRate,
          totalCommission: item.totalCommission,
          isCurrentUser: item.collaboratorId === currentUserId,
        };
      },
    );

    // 5. Tách Podium (Top 1, 2, 3) và Bảng Top 4 - N
    const podium: LeaderboardPodiumDto = {
      rank1: allRankedItems[0] || null,
      rank2: allRankedItems[1] || null,
      rank3: allRankedItems[2] || null,
    };

    const limit = dto.limit || 10;
    const rankings = allRankedItems.slice(3, limit);

    // 6. Tính toán vị trí cá nhân của người dùng hiện tại (My Rank Status)
    let myRankStatus: MyRankStatusDto | undefined;
    const myItemIndex = allRankedItems.findIndex(
      (i) => i.collaboratorId === currentUserId,
    );
    const myStats = statsMap.get(currentUserId);
    if (myStats) {
      const myItem = allRankedItems[myItemIndex];
      const rank10Item = allRankedItems[9];
      const nextRankItem =
        [...allRankedItems].reverse().find(item => myItem && item.rank < myItem.rank);

      const gapToTop10 =
        rank10Item && (!myItem || myItem.rank > 10)
          ? Math.max(0, rank10Item.grossRevenue - myStats.grossRevenue)
          : 0;

      const gapToNextRank = nextRankItem
        ? Math.max(0, nextRankItem.grossRevenue - myStats.grossRevenue)
        : 0;

      myRankStatus = {
        myRank: myItem?.rank ?? null,
        rankDelta: myItem?.rankDelta ?? 0,
        myRevenue: myStats.grossRevenue,
        myOrders: myStats.totalOrders,
        myConversionRate: parseFloat(conversion(myStats).toFixed(2)),
        myCommission: myStats.totalCommission,
        gapToTop10Revenue: gapToTop10,
        gapToNextRankRevenue: gapToNextRank,
        currentPeriodLabel: label,
      };
    }

    return {
      metric,
      periodLabel: label,
      updatedAt: new Date().toISOString(),
      podium,
      rankings,
      myRankStatus,
      totalParticipants: allRankedItems.length,
    };
  }

  // ─── 3. BỤC VINH DANH PODIUM TOP 3 ───────────────────────────────────
  async getPodiumTop3(dto: LeaderboardQueryDto): Promise<LeaderboardPodiumDto> {
    const full = await this.getLeaderboard('', '', { ...dto, limit: 3 });
    return full.podium;
  }

  // ─── 4. TRẠNG THÁI THỨ HẠNG CỦA TÔI (MY RANK) ─────────────────────────
  async getMyRankStatus(
    userId: string,
    userRole: string,
    dto: LeaderboardQueryDto,
  ): Promise<MyRankStatusDto> {
    const full = await this.getLeaderboard(userId, userRole, dto);
    if (!full.myRankStatus) {
      return {
        myRank: null,
        rankDelta: 0,
        myRevenue: 0,
        myOrders: 0,
        myConversionRate: 0,
        myCommission: 0,
        gapToTop10Revenue: 0,
        gapToNextRankRevenue: 0,
        currentPeriodLabel: full.periodLabel,
      };
    }
    return full.myRankStatus;
  }

  // ─── 5. HỒ SƠ VINH DANH CHI TIẾT (CREATOR HALL OF FAME) ───────────────
  async getCreatorHallOfFameProfile(creatorId: string) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        collaboratorProfile: {
          include: { tier: true },
        },
        socialChannels: true,
      },
    });

    if (!creator) {
      throw new NotFoundException(
        'Không tìm thấy Creator trong danh sách vinh danh.',
      );
    }

    // Thống kê thành tích trọn đời
    const [
      lifetimeOrdersCount,
      lifetimeRevenueAgg,
      lifetimeCommissionAgg,
      totalSampleRequests,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          attributedCollaboratorId: creatorId,
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: {
          attributedCollaboratorId: creatorId,
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      }),
      this.prisma.commission.aggregate({
        _sum: { commissionAmount: true },
        where: {
          collaboratorId: creatorId,
          status: { in: ['APPROVED', 'PAID'] },
        },
      }),
      this.prisma.sampleProductRequest.count({
        where: { collaboratorId: creatorId, status: 'APPROVED' },
      }),
    ]);

    // Top sản phẩm Creator bán chạy nhất
    const topItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          attributedCollaboratorId: creatorId,
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      },
      include: {
        product: {
          select: { id: true, title: true, imageUrl: true, price: true },
        },
      },
      take: 5,
    });

    return {
      creatorId: creator.id,
      fullName: creator.fullName,
      email: creator.email,
      avatarUrl:
        creator.avatarUrl ||
        creator.collaboratorProfile?.avatarUrl ||
        undefined,
      bio:
        creator.collaboratorProfile?.bio ||
        'Nhà sáng tạo trên SCANMS',
      tierName: creator.collaboratorProfile?.tier?.name || 'Chưa xếp cấp bậc',
      socialChannels: creator.socialChannels.map((s) => ({
        platform: s.platformName,
        channelName: s.channelName,
        channelUrl: s.channelUrl,
        followerCount: s.followerCount,
        isPrimary: s.isPrimary,
      })),
      lifetimeStats: {
        totalOrders: lifetimeOrdersCount,
        totalRevenue: Number(lifetimeRevenueAgg._sum?.finalAmount || 0),
        totalCommission: Number(
          lifetimeCommissionAgg._sum?.commissionAmount || 0,
        ),
        totalSamplesReceived: totalSampleRequests,
      },
      topProducts: topItems.map((ti) => ({
        productId: ti.product.id,
        title: ti.product.title,
        imageUrl: ti.product.imageUrl,
        price: Number(ti.product.price),
        quantitySold: ti.quantity,
      })),
      badges: [],
    };
  }
}

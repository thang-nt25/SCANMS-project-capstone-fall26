import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let label = '';

    if (dto.month && dto.year) {
      startDate = new Date(dto.year, dto.month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(dto.year, dto.month, 0, 23, 59, 59, 999);
      label = `Tháng ${dto.month}/${dto.year}`;
    } else {
      switch (dto.timeRange) {
        case LeaderboardTimeRange.LAST_MONTH: {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          startDate = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
          endDate = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);
          label = `Tháng ${prevMonth + 1}/${prevYear}`;
          break;
        }
        case LeaderboardTimeRange.THIS_QUARTER: {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
          label = `Quý ${currentQuarter + 1}/${now.getFullYear()}`;
          break;
        }
        case LeaderboardTimeRange.ALL_TIME: {
          startDate = new Date(2020, 0, 1);
          endDate = now;
          label = 'Toàn Thời Gian (All-Time)';
          break;
        }
        case LeaderboardTimeRange.THIS_MONTH:
        default: {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
          break;
        }
      }
    }

    // Khoảng thời gian kỳ trước để tính rankDelta
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

    return { startDate, endDate, prevStartDate, prevEndDate, label };
  }

  // ─── 2. TÍNH TOÁN BẢNG XẾP HẠNG LEADERBOARD TOÀN DIỆN ─────────────────
  async getLeaderboard(
    currentUserId: string,
    currentUserRole: string,
    dto: LeaderboardQueryDto,
  ): Promise<LeaderboardFullResponseDto> {
    const { startDate, endDate, prevStartDate, prevEndDate, label } = this.resolveLeaderboardPeriod(dto);

    // Điều kiện lọc phạm vi (Global vs Store)
    const baseOrderWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      attributedCollaboratorId: { not: null },
    };

    const prevOrderWhere: any = {
      createdAt: { gte: prevStartDate, lte: prevEndDate },
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
        if (!store) throw new NotFoundException('Không tìm thấy gian hàng của bạn.');
        scopedStoreId = store.id;
      } else if (currentUserRole !== UserRole.SYSTEM_ADMIN && currentUserRole !== UserRole.SYSTEM_MANAGER) {
        throw new ForbiddenException('Bạn không có quyền xem bảng xếp hạng theo gian hàng.');
      }

      if (!scopedStoreId) {
        throw new BadRequestException('Cần chọn gian hàng để lọc bảng xếp hạng.');
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
    const [orderGroups, prevOrderGroups, clickGroups, commissionGroups, collaborators] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['attributedCollaboratorId'],
        where: baseOrderWhere,
        _sum: { finalAmount: true },
        _count: { _all: true },
      }),
      metric === LeaderboardMetricType.REVENUE
        ? this.prisma.order.groupBy({
            by: ['attributedCollaboratorId'],
            where: prevOrderWhere,
            _sum: { finalAmount: true },
          })
        : Promise.resolve([]),
      this.prisma.clickTrafficLog.groupBy({
        by: ['collaboratorId'],
        where: clickWhere,
        _count: { _all: true },
      }),
      this.prisma.commission.groupBy({
        by: ['collaboratorId'],
        where: { order: { is: baseOrderWhere } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.COLLABORATOR, isActive: true, isDeleted: false },
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
    const statsMap = new Map<string, {
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
    }>();

    // Khởi tạo danh sách từ bảng người dùng
    for (const c of collaborators) {
      const primarySocial = c.socialChannels?.[0];
      statsMap.set(c.id, {
        collaboratorId: c.id,
        fullName: c.fullName || 'Creator SCANMS',
        avatarUrl: c.avatarUrl || c.collaboratorProfile?.avatarUrl || undefined,
        primaryChannelHandle: primarySocial?.channelName ? `@${primarySocial.channelName}` : undefined,
        primaryPlatform: primarySocial?.platformName || undefined,
        tierName: c.collaboratorProfile?.tier?.name || 'Cấp Bạc',
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
      if (group.attributedCollaboratorId && statsMap.has(group.attributedCollaboratorId)) {
        const item = statsMap.get(group.attributedCollaboratorId)!;
        item.totalOrders = group._count._all;
        item.grossRevenue = Number(group._sum.finalAmount || 0);
      }
    }
    for (const group of commissionGroups) {
      if (statsMap.has(group.collaboratorId)) {
        statsMap.get(group.collaboratorId)!.totalCommission = Number(group._sum.commissionAmount || 0);
      }
    }

    // Gom nhóm kỳ trước để tính thứ hạng quá khứ
    const prevRevenueMap = new Map<string, number>();
    for (const group of prevOrderGroups) {
      if (group.attributedCollaboratorId) {
        prevRevenueMap.set(group.attributedCollaboratorId, Number(group._sum.finalAmount || 0));
      }
    }

    const prevRankSorted = Array.from(prevRevenueMap.entries()).sort((a, b) => b[1] - a[1]);
    const prevRankMap = new Map<string, number>();
    prevRankSorted.forEach(([collabId], index) => {
      prevRankMap.set(collabId, index + 1);
    });

    // 3. Sắp xếp danh sách theo Metric được chọn
    const sortedList = Array.from(statsMap.values()).sort((a, b) => {
      switch (metric) {
        case LeaderboardMetricType.ORDERS:
          return b.totalOrders - a.totalOrders || b.grossRevenue - a.grossRevenue;
        case LeaderboardMetricType.CONVERSION_RATE: {
          const crA = a.totalClicks > 0 ? (a.totalOrders / a.totalClicks) * 100 : 0;
          const crB = b.totalClicks > 0 ? (b.totalOrders / b.totalClicks) * 100 : 0;
          return crB - crA || b.grossRevenue - a.grossRevenue;
        }
        case LeaderboardMetricType.COMMISSION:
          return b.totalCommission - a.totalCommission || b.grossRevenue - a.grossRevenue;
        case LeaderboardMetricType.REVENUE:
        default:
          return b.grossRevenue - a.grossRevenue || b.totalOrders - a.totalOrders;
      }
    });

    // 4. Định hình DTO và tính toán Rank Delta
    const allRankedItems: LeaderboardItemDto[] = sortedList.map((item, index) => {
      const currentRank = index + 1;
      const prevRank = prevRankMap.get(item.collaboratorId);
      let rankDelta = 0;
      if (prevRank !== undefined) {
        rankDelta = prevRank - currentRank; // rank cũ 5, rank mới 3 => +2 bậc
      } else {
        rankDelta = 0; // NEW
      }

      const conversionRate = item.totalClicks > 0
        ? parseFloat(((item.totalOrders / item.totalClicks) * 100).toFixed(2))
        : 0;

      let bonusPrizeAmount: number | undefined;
      let badgeTitle: string | undefined;

      if (currentRank === 1) {
        bonusPrizeAmount = 5000000;
        badgeTitle = '🏆 Quán Quân Doanh Số';
      } else if (currentRank === 2) {
        bonusPrizeAmount = 2500000;
        badgeTitle = '🥈 Á Quân Bán Hàng';
      } else if (currentRank === 3) {
        bonusPrizeAmount = 1000000;
        badgeTitle = '🥉 Top 3 Bứt Phá';
      } else if (currentRank <= 10) {
        badgeTitle = '⭐ Top 10 Tinh Hoa';
      }

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
        bonusPrizeAmount,
        badgeTitle,
        isCurrentUser: item.collaboratorId === currentUserId,
      };
    });

    // 5. Tách Podium (Top 1, 2, 3) và Bảng Top 4 - N
    const podium: LeaderboardPodiumDto = {
      rank1: allRankedItems.find((i) => i.rank === 1) || null,
      rank2: allRankedItems.find((i) => i.rank === 2) || null,
      rank3: allRankedItems.find((i) => i.rank === 3) || null,
    };

    const limit = dto.limit || 10;
    const rankings = allRankedItems.slice(3, limit);

    // 6. Tính toán vị trí cá nhân của người dùng hiện tại (My Rank Status)
    let myRankStatus: MyRankStatusDto | undefined;
    const myItemIndex = allRankedItems.findIndex((i) => i.collaboratorId === currentUserId);
    if (myItemIndex !== -1) {
      const myItem = allRankedItems[myItemIndex];
      const rank10Item = allRankedItems[9];
      const nextRankItem = myItemIndex > 0 ? allRankedItems[myItemIndex - 1] : null;

      const gapToTop10 = rank10Item && myItem.rank > 10
        ? Math.max(0, rank10Item.grossRevenue - myItem.grossRevenue + 100000)
        : 0;

      const gapToNextRank = nextRankItem
        ? Math.max(0, nextRankItem.grossRevenue - myItem.grossRevenue + 50000)
        : 0;

      myRankStatus = {
        myRank: myItem.rank,
        rankDelta: myItem.rankDelta,
        myRevenue: myItem.grossRevenue,
        myOrders: myItem.totalOrders,
        myConversionRate: myItem.conversionRate,
        myCommission: myItem.totalCommission,
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
  async getMyRankStatus(userId: string, userRole: string, dto: LeaderboardQueryDto): Promise<MyRankStatusDto> {
    const full = await this.getLeaderboard(userId, userRole, dto);
    if (!full.myRankStatus) {
      return {
        myRank: full.totalParticipants + 1,
        rankDelta: 0,
        myRevenue: 0,
        myOrders: 0,
        myConversionRate: 0,
        myCommission: 0,
        gapToTop10Revenue: 5000000,
        gapToNextRankRevenue: 1000000,
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
      throw new NotFoundException('Không tìm thấy Creator trong danh sách vinh danh.');
    }

    // Thống kê thành tích trọn đời
    const [lifetimeOrdersCount, lifetimeRevenueAgg, lifetimeCommissionAgg, totalSampleRequests] = await Promise.all([
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
          status: 'APPROVED',
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
        product: { select: { id: true, title: true, imageUrl: true, price: true } },
      },
      take: 5,
    });

    return {
      creatorId: creator.id,
      fullName: creator.fullName,
      email: creator.email,
      avatarUrl: creator.avatarUrl || creator.collaboratorProfile?.avatarUrl || undefined,
      bio: creator.collaboratorProfile?.bio || 'Top Creator chuyên nghiệp hệ sinh thái SCANMS',
      tierName: creator.collaboratorProfile?.tier?.name || 'Cấp Bạc',
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
        totalCommission: Number(lifetimeCommissionAgg._sum?.commissionAmount || 0),
        totalSamplesReceived: totalSampleRequests,
      },
      topProducts: topItems.map((ti) => ({
        productId: ti.product.id,
        title: ti.product.title,
        imageUrl: ti.product.imageUrl,
        price: Number(ti.product.price),
        quantitySold: ti.quantity,
      })),
      badges: [
        { id: 'b1', name: '🏆 Top 10 Seller of the Year', icon: 'trophy', color: 'amber' },
        { id: 'b2', name: '⚡ High Conversion Creator (CR > 5%)', icon: 'zap', color: 'emerald' },
        { id: 'b3', name: '💎 Diamond Ambassador', icon: 'diamond', color: 'blue' },
      ],
    };
  }
}

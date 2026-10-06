import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  RecommendKolsQueryDto,
  KolMatchResultDto,
  AiRecommendationResponseDto,
  PriceRangeFilter,
  ScoreBreakdownDto,
  MatchAnalysisRequestDto,
} from './dto/ai-recommendation.dto';
import { OrderStatus, UserRole } from '@prisma/client';

@Injectable()
export class AiRecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. GỢI Ý TOP KOLS PHÙ HỢP CHO SẢN PHẨM HOẶC BỘ LỌC ───────────────
  async getRecommendedKols(
    query: RecommendKolsQueryDto,
    currentUserId: string,
    currentUserRole: string,
    onlyCollaboratorId?: string,
  ): Promise<AiRecommendationResponseDto> {
    let targetProduct: any = null;
    let targetCategory = query.category;
    let targetPrice = 0;

    // 1. Nếu có productId -> Lấy thông tin sản phẩm cụ thể
    if (query.productId) {
      targetProduct = await this.prisma.product.findFirst({
        where: { id: query.productId, moderationStatus: 'APPROVED', isActive: true, isDeleted: false, store: { isDeleted: false } },
        include: { store: true },
      });

      if (!targetProduct) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${query.productId}`);
      }

      if (currentUserRole === UserRole.SHOP_MANAGER && targetProduct.store.ownerId !== currentUserId) {
        throw new ForbiddenException('Chỉ được quét KOL cho sản phẩm của gian hàng mình.');
      }
      targetCategory = query.category || targetProduct.categoryName || undefined;
      targetPrice = Number(targetProduct.price || 0);
    }

    // 2. Lấy danh sách tất cả Collaborators đủ điều kiện (KYC, Active)
    const collaborators = await this.prisma.user.findMany({
      where: {
        role: UserRole.COLLABORATOR,
        ...(onlyCollaboratorId ? { id: onlyCollaboratorId } : {}),
        isActive: true,
        isDeleted: false,
        collaboratorProfile: { is: { kycStatus: 'VERIFIED' } },
      },
      include: {
        collaboratorProfile: {
          include: { tier: true },
        },
        socialChannels: true,
      },
    });

    // 3. Lấy dữ liệu lịch sử đơn hàng, click traffic và hoa hồng của các KOLs
    const [allOrders, allClicks] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
          OR: [
            { attributedCollaboratorId: { in: collaborators.map((c) => c.id) } },
            { orderItems: { some: { referralLink: { collaboratorId: { in: collaborators.map((c) => c.id) } } } } },
          ],
        },
        select: {
          attributedCollaboratorId: true,
          orderItems: {
            select: { quantity: true, unitPrice: true, product: { select: { categoryName: true } }, referralLink: { select: { collaboratorId: true } } },
          },
        },
      }),
      this.prisma.clickTrafficLog.groupBy({
        by: ['collaboratorId'],
        where: { isValid: true, isUnique: true, collaboratorId: { in: collaborators.map((c) => c.id) } },
        _count: { _all: true },
      }),
    ]);

    // Gom nhóm thống kê theo từng KOL
    const kolStatsMap = new Map<string, {
      totalOrders: number;
      grossRevenue: number;
      totalClicks: number;
      categoryOrderCounts: Map<string, number>;
      priceSum: number;
      totalUnits: number;
    }>();

    for (const c of collaborators) {
      kolStatsMap.set(c.id, {
        totalOrders: 0,
        grossRevenue: 0,
        totalClicks: 0,
        categoryOrderCounts: new Map<string, number>(),
        priceSum: 0,
        totalUnits: 0,
      });
    }

    for (const click of allClicks) {
      if (click.collaboratorId && kolStatsMap.has(click.collaboratorId)) {
        kolStatsMap.get(click.collaboratorId)!.totalClicks += click._count._all;
      }
    }

    for (const order of allOrders) {
      const countedCollaborators = new Set<string>();
      for (const item of order.orderItems) {
        const collaboratorId = item.referralLink?.collaboratorId || order.attributedCollaboratorId;
        if (collaboratorId && kolStatsMap.has(collaboratorId)) {
          const stats = kolStatsMap.get(collaboratorId)!;
          if (!countedCollaborators.has(collaboratorId)) {
            stats.totalOrders += 1;
            countedCollaborators.add(collaboratorId);
          }
          const lineRevenue = Number(item.unitPrice) * item.quantity;
          stats.grossRevenue += lineRevenue;
          stats.priceSum += lineRevenue;
          stats.totalUnits += item.quantity;
          const cat = item.product?.categoryName || 'Khác';
          const currentCount = stats.categoryOrderCounts.get(cat) || 0;
          stats.categoryOrderCounts.set(cat, currentCount + item.quantity);
        }
      }
    }

    // 4. Áp dụng Thuật toán AI Matching chấm điểm Affinity Score (0 - 100%)
    const matchResults: KolMatchResultDto[] = [];

    for (const c of collaborators) {
      const stats = kolStatsMap.get(c.id)!;
      const socialChannels = c.socialChannels.filter((channel, index, channels) => {
        const identity = (entry: typeof channel) => `${entry.platformName.toUpperCase()}:${(entry.channelUrl || entry.channelName || entry.id).trim().replace(/\/$/, '').toLowerCase()}`;
        return channels.findIndex((entry) => identity(entry) === identity(channel)) === index;
      });
      const tierName = c.collaboratorProfile?.tier?.name || 'Chưa xếp hạng';

      // Tiêu chí 1: Điểm trùng khớp ngành hàng (Category Score - 35%)
      let categoryScore = 0;
      let primaryCategory = 'Chưa có lịch sử bán hàng';
      let maxCatCount = 0;

      for (const [cat, count] of stats.categoryOrderCounts.entries()) {
        if (count > maxCatCount) {
          maxCatCount = count;
          primaryCategory = cat;
        }
      }

      if (targetCategory) {
        const targetCatNormalized = targetCategory.toLowerCase();
        let directMatchOrders = 0;
        for (const [cat, count] of stats.categoryOrderCounts.entries()) {
          if (cat.toLowerCase().includes(targetCatNormalized) || targetCatNormalized.includes(cat.toLowerCase())) {
            directMatchOrders += count;
          }
        }

        if (directMatchOrders >= 50) categoryScore = 98;
        else if (directMatchOrders >= 20) categoryScore = 92;
        else if (directMatchOrders >= 5) categoryScore = 85;
        else if (directMatchOrders > 0) categoryScore = 75;
        else if (primaryCategory.toLowerCase().includes(targetCatNormalized)) categoryScore = 80;
        else categoryScore = 0;
      } else if (stats.totalOrders > 0) {
        categoryScore = Math.min(100, Math.round((stats.totalOrders / 50) * 100));
      }

      // Tiêu chí 2: Điểm tỷ lệ chuyển đổi (Conversion Rate CR% - 25%)
      const conversionRate = stats.totalClicks > 0
        ? parseFloat(((stats.totalOrders / stats.totalClicks) * 100).toFixed(2))
        : 0;

      let conversionRateScore = 0;
      if (conversionRate >= 8.0) conversionRateScore = 98;
      else if (conversionRate >= 6.0) conversionRateScore = 92;
      else if (conversionRate >= 4.0) conversionRateScore = 84;
      else if (conversionRate >= 2.0) conversionRateScore = 74;
      else if (conversionRate > 0) conversionRateScore = 65;
      // Reduce the influence of a high CR from only a handful of clicks.
      conversionRateScore = Math.round(conversionRateScore * Math.min(1, stats.totalClicks / 30));

      // Lọc điều kiện minConversionRate nếu có
      if (query.minConversionRate !== undefined && conversionRate < query.minConversionRate) {
        continue;
      }

      // Tiêu chí 3: Điểm cấp bậc & mạng xã hội (Tier & Social Score - 20%)
      let tierAndSocialScore = 0;
      const tierNormalized = tierName.toUpperCase();
      if (tierNormalized.includes('KIM CƯƠNG') || tierNormalized.includes('DIAMOND')) tierAndSocialScore = 98;
      else if (tierNormalized.includes('BẠCH KIM') || tierNormalized.includes('PLATINUM')) tierAndSocialScore = 90;
      else if (tierNormalized.includes('VÀNG') || tierNormalized.includes('GOLD')) tierAndSocialScore = 80;
      else if (tierNormalized.includes('BẠC') || tierNormalized.includes('SILVER')) tierAndSocialScore = 70;
      else if (tierNormalized.includes('ĐỒNG') || tierNormalized.includes('BRONZE')) tierAndSocialScore = 60;

      // Lọc điều kiện minTier nếu có
      if (query.minTier) {
        const minTierNorm = query.minTier.toUpperCase();
        if (minTierNorm === 'BRONZE' && tierAndSocialScore < 60) continue;
        if (minTierNorm === 'DIAMOND' && tierAndSocialScore < 95) continue;
        if (minTierNorm === 'PLATINUM' && tierAndSocialScore < 88) continue;
        if (minTierNorm === 'GOLD' && tierAndSocialScore < 78) continue;
        if (minTierNorm === 'SILVER' && tierAndSocialScore < 68) continue;
      }

      // Thưởng điểm Follower MXH
      const totalFollowers = socialChannels.reduce((sum, ch) => sum + (ch.followerCount || 0), 0);
      if (totalFollowers >= 500000) tierAndSocialScore = Math.min(100, tierAndSocialScore + 5);
      else if (totalFollowers >= 100000) tierAndSocialScore = Math.min(100, tierAndSocialScore + 3);

      // Tiêu chí 4: Điểm phù hợp phân khúc giá (Price Fit Score - 20%)
      let priceFitScore = 0;
      const avgOrderValue = stats.totalUnits > 0 ? stats.priceSum / stats.totalUnits : 0;

      if (targetPrice > 0 && avgOrderValue > 0) {
        const ratio = Math.min(targetPrice, avgOrderValue) / Math.max(targetPrice, avgOrderValue);
        priceFitScore = Math.round(60 + ratio * 38);
      }

      // Lọc điều kiện PriceRangeFilter
      if (query.priceRange && query.priceRange !== PriceRangeFilter.ALL) {
        const evalPrice = avgOrderValue;
        if (evalPrice <= 0) continue;
        if (query.priceRange === PriceRangeFilter.UNDER_200K && evalPrice >= 200000) continue;
        if (query.priceRange === PriceRangeFilter.FROM_200K_TO_500K && (evalPrice < 200000 || evalPrice > 500000)) continue;
        if (query.priceRange === PriceRangeFilter.FROM_500K_TO_1M && (evalPrice < 500000 || evalPrice > 1000000)) continue;
        if (query.priceRange === PriceRangeFilter.OVER_1M && evalPrice <= 1000000) continue;
      }

      // 5. TỔNG HỢP MATCH SCORE (Công thức ma trận trọng số)
      const finalMatchScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            categoryScore * 0.35 +
            conversionRateScore * 0.25 +
            tierAndSocialScore * 0.20 +
            priceFitScore * 0.20
          )
        )
      );

      // Đánh giá mức độ
      let matchLevel = 'Phù Hợp';
      if (finalMatchScore >= 90) matchLevel = 'Siêu Phù Hợp (Top Pick)';
      else if (finalMatchScore >= 78) matchLevel = 'Rất Phù Hợp';
      else if (finalMatchScore >= 65) matchLevel = 'Phù Hợp';
      else matchLevel = 'Tiềm Năng';
      if (stats.totalOrders === 0) matchLevel = 'Chưa đủ dữ liệu bán hàng';

      // 6. Sinh lời giải thích AI tự nhiên (Explainable AI Reasoning)
      const aiReasoning = this.generateAiReasoning(
        c.fullName,
        targetProduct?.title || 'Sản phẩm của Shop',
        targetCategory || 'Ngành hàng thế mạnh',
        conversionRate,
        tierName,
        finalMatchScore,
        stats.totalOrders,
      );

      // 7. Tạo 3 điểm mạnh cốt lõi (Key Strengths)
      const keyStrengths = this.generateKeyStrengths(
        tierName,
        primaryCategory,
        stats.totalOrders,
        totalFollowers,
      );

      const scoreBreakdown: ScoreBreakdownDto = {
        categoryScore,
        conversionRateScore,
        tierAndSocialScore,
        priceFitScore,
      };

      matchResults.push({
        collaboratorId: c.id,
        fullName: c.fullName,
        email: c.email,
        avatarUrl: c.collaboratorProfile?.avatarUrl || undefined,
        tierName,
        bio: c.collaboratorProfile?.bio || 'Chưa cập nhật giới thiệu',
        matchScore: finalMatchScore,
        matchLevel,
        scoreBreakdown,
        aiReasoning,
        keyStrengths,
        socialChannels: socialChannels.map((s) => ({
          platform: s.platformName,
          channelName: s.channelName || s.channelUrl || 'Kênh MXH',
          channelUrl: s.channelUrl,
          followerCount: s.followerCount || 0,
          isPrimary: s.isPrimary,
        })),
        lifetimeStats: {
          totalClicks: stats.totalClicks,
          dataConfidence: stats.totalOrders >= 20 && stats.totalClicks >= 100 ? 'HIGH' : stats.totalOrders >= 5 && stats.totalClicks >= 30 ? 'MEDIUM' : 'LOW',
          totalOrders: stats.totalOrders,
          grossRevenue: stats.grossRevenue,
          conversionRate,
          primaryCategory,
        },
      });
    }

    // Sắp xếp giảm dần theo Điểm tương thích AI (Match Score)
    matchResults.sort((a, b) => b.matchScore - a.matchScore || b.lifetimeStats.conversionRate - a.lifetimeStats.conversionRate);

    const limit = query.limit || 5;
    const topRecommended = matchResults.slice(0, limit);

    return {
      calculatedAt: new Date().toISOString(),
      targetProduct: targetProduct
        ? {
            productId: targetProduct.id,
            title: targetProduct.title,
            category: targetCategory || 'Chưa phân loại',
            price: targetPrice,
            imageUrl: targetProduct.imageUrl,
            commissionRate: Number(targetProduct.customCommissionRate ?? targetProduct.store.defaultCommissionRate ?? 0),
          }
        : undefined,
      totalKolsScanned: collaborators.length,
      recommendedKols: topRecommended,
    };
  }

  // ─── 2. PHÂN TÍCH CHUYÊN SÂU 1-1 GIỮA 1 SẢN PHẨM VÀ 1 KOL CỤ THỂ ─────
  async analyzeMatch(dto: MatchAnalysisRequestDto, currentUserId: string, currentUserRole: string) {
    const res = await this.getRecommendedKols(
      { productId: dto.productId, limit: 100 },
      currentUserId,
      currentUserRole,
      dto.collaboratorId,
    );

    const found = res.recommendedKols.find((k) => k.collaboratorId === dto.collaboratorId);
    if (!found) {
      throw new NotFoundException('Không tìm thấy dữ liệu đối sánh cho KOL được chọn.');
    }

    return {
      productId: dto.productId,
      targetProduct: res.targetProduct,
      collaborator: found,
      kolAnalysis: found,
      recommendationAction:
        found.matchScore >= 80
          ? 'Khuyến nghị gửi ngay Thẻ Mời Chiến Dịch VIP (FR-27) với mức thưởng hoa hồng cao.'
          : 'Có thể gửi sản phẩm mẫu (FR-25) để KOL trải nghiệm trước khi ký hợp tác độc quyền.',
    };
  }

  // ─── 3. HELPER SINH LỜI GIẢI THÍCH AI REASONING ────────────────────────
  private generateAiReasoning(
    kolName: string,
    productTitle: string,
    category: string,
    cr: number,
    tier: string,
    score: number,
    orders: number,
  ): string {
    if (!orders) return `${kolName} chưa có đơn affiliate hoàn tất trên SCANMS. Điểm ${score}/100 chủ yếu dựa trên hồ sơ; chưa đủ dữ liệu để đánh giá hiệu quả bán "${productTitle}".`;
    return `${kolName}: ${score}/100 điểm gợi ý cho "${productTitle}" với ngành mục tiêu ${category}. Căn cứ: ${orders} đơn affiliate đã giao/hoàn tất trên SCANMS, tỷ lệ đơn trên lượt nhấp hợp lệ duy nhất ${cr}% và hạng ${tier}. Điểm dùng để xếp hạng tham khảo, không phải xác suất chốt đơn.`;
  }

  private generateKeyStrengths(
    tier: string,
    category: string,
    orders: number,
    followers: number,
  ): string[] {
    const strengths: string[] = [];
    strengths.push(orders ? `${orders} đơn affiliate đã giao/hoàn tất` : 'Chưa có đơn affiliate hoàn tất');
    if (orders) strengths.push(`Ngành bán nhiều nhất: ${category}`);
    strengths.push(`Hạng: ${tier}`);
    if (followers > 0) strengths.push(`${followers.toLocaleString('vi-VN')} người theo dõi do hồ sơ kênh cung cấp`);

    return strengths.slice(0, 3);
  }
}

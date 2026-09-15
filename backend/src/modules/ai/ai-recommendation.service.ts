import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
  ): Promise<AiRecommendationResponseDto> {
    let targetProduct: any = null;
    let targetCategory = query.category;
    let targetPrice = 0;

    // 1. Nếu có productId -> Lấy thông tin sản phẩm cụ thể
    if (query.productId) {
      targetProduct = await this.prisma.product.findUnique({
        where: { id: query.productId },
        include: { store: true },
      });

      if (!targetProduct) {
        throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${query.productId}`);
      }

      targetCategory = targetProduct.categoryName || 'Mỹ phẩm & Làm đẹp';
      targetPrice = Number(targetProduct.price || 0);
    }

    // 2. Lấy danh sách tất cả Collaborators đủ điều kiện (KYC, Active)
    const collaborators = await this.prisma.user.findMany({
      where: {
        role: UserRole.COLLABORATOR,
        isActive: true,
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
          attributedCollaboratorId: { not: null },
        },
        include: {
          orderItems: {
            include: { product: true },
          },
        },
      }),
      this.prisma.clickTrafficLog.findMany({
        where: { isValid: true },
        select: { collaboratorId: true },
      }),
    ]);

    // Gom nhóm thống kê theo từng KOL
    const kolStatsMap = new Map<string, {
      totalOrders: number;
      grossRevenue: number;
      totalClicks: number;
      categoryOrderCounts: Map<string, number>;
      averageOrderValue: number;
      priceSum: number;
    }>();

    for (const c of collaborators) {
      kolStatsMap.set(c.id, {
        totalOrders: 0,
        grossRevenue: 0,
        totalClicks: 0,
        categoryOrderCounts: new Map<string, number>(),
        averageOrderValue: 0,
        priceSum: 0,
      });
    }

    for (const click of allClicks) {
      if (click.collaboratorId && kolStatsMap.has(click.collaboratorId)) {
        kolStatsMap.get(click.collaboratorId)!.totalClicks += 1;
      }
    }

    for (const order of allOrders) {
      if (order.attributedCollaboratorId && kolStatsMap.has(order.attributedCollaboratorId)) {
        const stats = kolStatsMap.get(order.attributedCollaboratorId)!;
        stats.totalOrders += 1;
        stats.grossRevenue += Number(order.finalAmount || 0);
        stats.priceSum += Number(order.finalAmount || 0);

        for (const item of order.orderItems) {
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
      const tierName = c.collaboratorProfile?.tier?.name || 'Đồng';

      // Tiêu chí 1: Điểm trùng khớp ngành hàng (Category Score - 35%)
      let categoryScore = 50; // Điểm nền tảng
      let primaryCategory = 'Đa ngành hàng';
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
        else categoryScore = 50;
      }

      // Tiêu chí 2: Điểm tỷ lệ chuyển đổi (Conversion Rate CR% - 25%)
      const conversionRate = stats.totalClicks > 0
        ? parseFloat(((stats.totalOrders / stats.totalClicks) * 100).toFixed(2))
        : 0;

      let conversionRateScore = 60;
      if (conversionRate >= 8.0) conversionRateScore = 98;
      else if (conversionRate >= 6.0) conversionRateScore = 92;
      else if (conversionRate >= 4.0) conversionRateScore = 84;
      else if (conversionRate >= 2.0) conversionRateScore = 74;
      else if (conversionRate > 0) conversionRateScore = 65;

      // Lọc điều kiện minConversionRate nếu có
      if (query.minConversionRate !== undefined && conversionRate < query.minConversionRate) {
        continue;
      }

      // Tiêu chí 3: Điểm cấp bậc & mạng xã hội (Tier & Social Score - 20%)
      let tierAndSocialScore = 60;
      const tierNormalized = tierName.toUpperCase();
      if (tierNormalized.includes('KIM CƯƠNG') || tierNormalized.includes('DIAMOND')) tierAndSocialScore = 98;
      else if (tierNormalized.includes('BẠCH KIM') || tierNormalized.includes('PLATINUM')) tierAndSocialScore = 90;
      else if (tierNormalized.includes('VÀNG') || tierNormalized.includes('GOLD')) tierAndSocialScore = 80;
      else if (tierNormalized.includes('BẠC') || tierNormalized.includes('SILVER')) tierAndSocialScore = 70;
      else tierAndSocialScore = 60;

      // Lọc điều kiện minTier nếu có
      if (query.minTier) {
        const minTierNorm = query.minTier.toUpperCase();
        if (minTierNorm === 'DIAMOND' && tierAndSocialScore < 95) continue;
        if (minTierNorm === 'PLATINUM' && tierAndSocialScore < 88) continue;
        if (minTierNorm === 'GOLD' && tierAndSocialScore < 78) continue;
        if (minTierNorm === 'SILVER' && tierAndSocialScore < 68) continue;
      }

      // Thưởng điểm Follower MXH
      const totalFollowers = c.socialChannels.reduce((sum, ch) => sum + (ch.followerCount || 0), 0);
      if (totalFollowers >= 500000) tierAndSocialScore = Math.min(100, tierAndSocialScore + 5);
      else if (totalFollowers >= 100000) tierAndSocialScore = Math.min(100, tierAndSocialScore + 3);

      // Tiêu chí 4: Điểm phù hợp phân khúc giá (Price Fit Score - 20%)
      let priceFitScore = 80;
      const avgOrderValue = stats.totalOrders > 0 ? stats.priceSum / stats.totalOrders : 300000;

      if (targetPrice > 0) {
        const ratio = Math.min(targetPrice, avgOrderValue) / Math.max(targetPrice, avgOrderValue);
        priceFitScore = Math.round(60 + ratio * 38);
      }

      // Lọc điều kiện PriceRangeFilter
      if (query.priceRange && query.priceRange !== PriceRangeFilter.ALL) {
        const evalPrice = targetPrice > 0 ? targetPrice : avgOrderValue;
        if (query.priceRange === PriceRangeFilter.UNDER_200K && evalPrice >= 200000) continue;
        if (query.priceRange === PriceRangeFilter.FROM_200K_TO_500K && (evalPrice < 200000 || evalPrice > 500000)) continue;
        if (query.priceRange === PriceRangeFilter.FROM_500K_TO_1M && (evalPrice < 500000 || evalPrice > 1000000)) continue;
        if (query.priceRange === PriceRangeFilter.OVER_1M && evalPrice <= 1000000) continue;
      }

      // 5. TỔNG HỢP MATCH SCORE (Công thức ma trận trọng số)
      const finalMatchScore = Math.min(
        99,
        Math.max(
          40,
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
        conversionRate,
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
        bio: c.collaboratorProfile?.bio || `Top Creator chuyên review ${primaryCategory}`,
        matchScore: finalMatchScore,
        matchLevel,
        scoreBreakdown,
        aiReasoning,
        keyStrengths,
        socialChannels: c.socialChannels.map((s) => ({
          platform: s.platformName,
          channelName: s.channelName || s.channelUrl || 'Kênh MXH',
          channelUrl: s.channelUrl,
          followerCount: s.followerCount || 0,
          isPrimary: s.isPrimary,
        })),
        lifetimeStats: {
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
            category: targetCategory || 'Mỹ phẩm & Làm đẹp',
            price: targetPrice,
            imageUrl: targetProduct.imageUrl,
            commissionRate: Number(targetProduct.commissionRate || 15.0),
          }
        : undefined,
      totalKolsScanned: collaborators.length,
      recommendedKols: topRecommended,
    };
  }

  // ─── 2. PHÂN TÍCH CHUYÊN SÂU 1-1 GIỮA 1 SẢN PHẨM VÀ 1 KOL CỤ THỂ ─────
  async analyzeMatch(dto: MatchAnalysisRequestDto) {
    const res = await this.getRecommendedKols(
      { productId: dto.productId, limit: 50 },
      '',
      UserRole.SYSTEM_ADMIN,
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
    if (score >= 90) {
      return `KOL ${kolName} đạt ${score}% độ tương thích xuất sắc với "${productTitle}". Với cấp bậc ${tier}, tỷ lệ chốt đơn ${cr}% (vượt chuẩn ngành) và kinh nghiệm ${orders} đơn thành công ngành ${category}, đây là lựa chọn số 1 để bùng nổ doanh thu.`;
    }
    if (score >= 75) {
      return `KOL ${kolName} đạt mức phù hợp cao ${score}%. Sở hữu tệp người xem tương tác tốt trong ngành ${category} và hiệu suất chuyển đổi ${cr}%, rất thích hợp để gửi mẫu thử và mời tham gia chiến dịch mới.`;
    }
    return `KOL ${kolName} có điểm tương thích ${score}%. Có tiềm năng mở rộng tệp khách hàng cho sản phẩm "${productTitle}" với năng lực sáng tạo nội dung đều đặn.`;
  }

  private generateKeyStrengths(
    cr: number,
    tier: string,
    category: string,
    orders: number,
    followers: number,
  ): string[] {
    const strengths: string[] = [];
    if (cr >= 5.0) strengths.push(`Tỷ lệ chốt đơn CR cao ${cr}% (Top đầu toàn sàn)`);
    else strengths.push(`Tỷ lệ chuyển đổi ổn định ${cr}%`);

    if (orders >= 100) strengths.push(`Đã chốt thành công ${orders}+ đơn hàng ${category}`);
    else strengths.push(`Chuyên sâu ngành ${category}`);

    if (followers >= 100000) strengths.push(`Kênh MXH quy mô lớn (${(followers / 1000).toFixed(0)}k+ followers)`);
    else strengths.push(`Danh hiệu ${tier} được hệ thống xác thực`);

    return strengths.slice(0, 3);
  }
}

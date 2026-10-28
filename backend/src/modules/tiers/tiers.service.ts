import { ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService, NOOP_CACHE_SERVICE } from '../../core/cache/cache.service';
import { Prisma, type CollaboratorTier } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { tierBonusByName } from '../commissions/commission-policy';
import { goodsDiscount } from '../coupons/voucher-pricing';

@Injectable()
export class TiersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TiersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService = NOOP_CACHE_SERVICE,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.evaluateAllCollaborators();
    } catch (error) {
      this.logger.error('Chưa đồng bộ được cấp bậc KOL khi khởi động.', error instanceof Error ? error.stack : undefined);
    }
  }

  private previousMonthWindow(now = new Date()) {
    // Tháng doanh số được tính theo múi giờ Việt Nam (UTC+7).
    const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const year = vietnamTime.getUTCFullYear();
    const month = vietnamTime.getUTCMonth();
    return {
      gte: new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000),
      lt: new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000),
    };
  }

  private tierBonus(tier: CollaboratorTier) {
    return tierBonusByName(tier.name);
  }

  /**
   * Lấy danh mục tất cả cấp bậc KOL
   */
  async getAllTiers() {
    const cached = await this.cache.get<any>('tiers:all');
    if (cached) return cached;

    const tiers = await this.prisma.collaboratorTier.findMany({
      orderBy: [{ minRevenueThreshold: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    // Older seed runs may have created identical policies with different IDs.
    // Collapse those policies for display without deleting or reassigning profiles.
    const seen = new Set<string>();
    const result = tiers.map(tier => ({ ...tier, extraBonusPercentage: new Prisma.Decimal(this.tierBonus(tier)) })).filter((tier) => {
      const key = this.policyKey(tier);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await this.cache.set('tiers:all', result, 300);
    return result;
  }

  private policyKey(tier: CollaboratorTier) {
    return `${tier.name.trim().toLowerCase()}|${Number(tier.minRevenueThreshold)}|${this.tierBonus(tier)}`;
  }

  private async previousMonthSales(userId: string, period = this.previousMonthWindow()) {
    let revenue = 0;
    let orderCount = 0;
    let cursor: string | undefined;
    while (true) {
      const orders = await this.prisma.order.findMany({
        where: {
          attributedCollaboratorId: userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: period,
        },
        select: { id: true, subtotalAmount: true, discountAmount: true, couponDiscountAmount: true, finalAmount: true, refundedAmount: true },
        orderBy: { id: 'asc' },
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const order of orders) {
        const netGoods = Math.max(0, Number(order.subtotalAmount) - goodsDiscount(order));
        const paid = Math.max(0, Number(order.finalAmount));
        const refunded = Math.min(paid, Math.max(0, Number(order.refundedAmount || 0)));
        // Refund records contain an amount for the whole order, without a goods/shipping split.
        // Allocate a partial refund proportionally, as the commission refund flow does.
        const netRevenue = paid > 0 ? netGoods * (paid - refunded) / paid : 0;
        revenue += netRevenue;
        if (netRevenue > 0) orderCount++;
      }
      if (orders.length < 500) break;
      cursor = orders[orders.length - 1].id;
    }
    return { revenue: Math.max(0, revenue), orderCount };
  }

  private qualifiedTier(tiers: CollaboratorTier[], revenue: number) {
    return [...tiers].reverse().find(tier => revenue >= Number(tier.minRevenueThreshold)) || tiers[0];
  }

  private async synchronizeTier(
    profile: { id: string; userId: string; tier: CollaboratorTier | null },
    matchedTier: CollaboratorTier,
    revenue: number,
    period: { gte: Date; lt: Date },
  ) {
    if (profile.tier && this.policyKey(profile.tier) === this.policyKey(matchedTier)) return false;
    const month = new Intl.DateTimeFormat('en-GB', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(period.gte);
    const promoted = profile.tier && Number(matchedTier.minRevenueThreshold) > Number(profile.tier.minRevenueThreshold);
    return this.prisma.$transaction(async tx => {
      const result = await tx.collaboratorProfile.updateMany({
        where: { id: profile.id, tierId: profile.tier?.id || null },
        data: { tierId: matchedTier.id },
      });
      if (!result.count) return false;
      await tx.notification.create({ data: {
        userId: profile.userId,
        type: 'TIER_UPDATED',
        title: promoted ? `Bạn đã lên hạng ${matchedTier.name}` : `Cấp bậc được cập nhật: ${matchedTier.name}`,
        message: `GMV hợp lệ tháng ${month} của bạn là ${revenue.toLocaleString('vi-VN')} đ, được xếp hạng ${matchedTier.name} theo ngưỡng từ ${Number(matchedTier.minRevenueThreshold).toLocaleString('vi-VN')} đ. Thưởng cấp bậc hiện áp dụng +${this.tierBonus(matchedTier)}% cho đơn mới đủ điều kiện.`,
        data: { actionUrl: '/collaborator/tiers', oldTier: profile.tier?.name || null, newTier: matchedTier.name,
          previousBonus: profile.tier ? this.tierBonus(profile.tier) : 0, newBonus: this.tierBonus(matchedTier),
          revenue, threshold: Number(matchedTier.minRevenueThreshold),
          periodStart: period.gte.toISOString(), periodEnd: period.lt.toISOString() },
      } });
      return true;
    });
  }

  /**
   * Xem cấp bậc hiện tại và tiến độ lên hạng của KOL
   */
  async getMyTierStatus(userId: string) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ cộng tác viên');
    }

    const tiers = await this.getAllTiers();
    if (!tiers.length) {
      throw new NotFoundException('Chưa có chính sách cấp bậc được cấu hình');
    }

    // Tính tổng doanh thu từ các đơn hàng thành công mà KOL này mang lại
    const period = this.previousMonthWindow();
    const sales = await this.previousMonthSales(userId, period);
    const vietnamMonth = new Date(period.lt.getTime() + 7 * 60 * 60 * 1000);
    const currentEvaluation = new Date(period.lt.getTime() + 15 * 60 * 1000);
    const nextEvaluationAt = Date.now() < currentEvaluation.getTime() ? currentEvaluation
      : new Date(Date.UTC(vietnamMonth.getUTCFullYear(), vietnamMonth.getUTCMonth() + 1, 1, 0, 15) - 7 * 60 * 60 * 1000);
    const currentRevenue = sales.revenue;
    const totalOrders = sales.orderCount;

    // Repair a missed monthly run or a seeded rank in storage as well as in the
    // response, so commission readers and the leaderboard use the same rank.
    const qualifiedTier = this.qualifiedTier(tiers, currentRevenue);
    let currentTier = profile.tier;
    if (!currentTier || this.policyKey(currentTier) !== this.policyKey(qualifiedTier)) {
      const changed = await this.synchronizeTier(profile, qualifiedTier, currentRevenue, period);
      if (changed) currentTier = qualifiedTier;
      else {
        const latest = await this.prisma.collaboratorProfile.findUnique({ where: { userId }, include: { tier: true } });
        if (!latest?.tier || this.policyKey(latest.tier) !== this.policyKey(qualifiedTier)) {
          throw new ConflictException('Cấp bậc đang được đồng bộ. Vui lòng tải lại sau ít giây.');
        }
        currentTier = latest.tier;
      }
    }
    const nextTier = tiers.find(
      (tier) => Number(tier.minRevenueThreshold) > Number(currentTier.minRevenueThreshold),
    ) || null;

    let progressPercentage = 100;
    let revenueNeeded = 0;

    if (nextTier) {
      const nextThreshold = Number(nextTier.minRevenueThreshold);
      progressPercentage = Math.min(100, Math.max(0, Math.round((currentRevenue / nextThreshold) * 100)));
      revenueNeeded = Math.max(0, nextThreshold - currentRevenue);
    }

    return {
      currentTier: {
        id: currentTier.id,
        name: currentTier.name,
        extraBonusPercentage: this.tierBonus(currentTier),
        minRevenueThreshold: Number(currentTier.minRevenueThreshold),
      },
      currentRevenue,
      totalOrders,
      revenueBasis: 'PREVIOUS_MONTH_VIETNAM',
      assessmentPeriod: { startsAt: period.gte.toISOString(), endsAt: period.lt.toISOString() },
      nextEvaluationAt: nextEvaluationAt.toISOString(),
      qualifiedTier: {
        id: qualifiedTier.id,
        name: qualifiedTier.name,
        extraBonusPercentage: this.tierBonus(qualifiedTier),
        minRevenueThreshold: Number(qualifiedTier.minRevenueThreshold),
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.name,
            minRevenueThreshold: Number(nextTier.minRevenueThreshold),
            extraBonusPercentage: this.tierBonus(nextTier),
          }
        : null,
      progressPercentage,
      revenueNeeded,
    };
  }

  /**
   * Xếp hạng KOL theo GMV tháng trước, gồm cả tăng và giảm hạng.
   */
  @Cron('15 0 1 * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async evaluateAllCollaborators() {
    const tiers = await this.getAllTiers();
    if (!tiers.length) {
      throw new NotFoundException('Chưa có chính sách cấp bậc được cấu hình');
    }

    const profiles = await this.prisma.collaboratorProfile.findMany({
      include: { tier: true },
    });

    let updatedCount = 0;
    const details: any[] = [];
    const period = this.previousMonthWindow();

    for (const p of profiles) {
      const totalRevenue = (await this.previousMonthSales(p.userId, period)).revenue;

      // Tìm tier cao nhất mà doanh thu thỏa mãn
      const matchedTier = this.qualifiedTier(tiers, totalRevenue);

      if (!p.tier || this.policyKey(p.tier) !== this.policyKey(matchedTier)) {
        const changed = await this.synchronizeTier(p, matchedTier, totalRevenue, period);
        if (!changed) continue;
        updatedCount++;
        details.push({
          userId: p.userId,
          oldTier: p.tier?.name || 'Chưa xếp hạng',
          newTier: matchedTier.name,
          revenue: totalRevenue,
        });
      }
    }

    return {
      message: `Đã hoàn tất quét và đánh giá cấp bậc cho ${profiles.length} cộng tác viên`,
      updatedCount,
      details,
    };
  }
}

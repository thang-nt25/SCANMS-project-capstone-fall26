import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import type { CollaboratorTier } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TiersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const name = tier.name.toLowerCase();
    if (name.includes('diamond')) return 3;
    if (name.includes('gold')) return 2;
    if (name.includes('silver')) return 1;
    return 0;
  }

  /**
   * Lấy danh mục tất cả cấp bậc KOL
   */
  async getAllTiers() {
    const tiers = await this.prisma.collaboratorTier.findMany({
      orderBy: [{ minRevenueThreshold: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    // Older seed runs may have created identical policies with different IDs.
    // Collapse those policies for display without deleting or reassigning profiles.
    const seen = new Set<string>();
    return tiers.filter((tier) => {
      const key = this.policyKey(tier);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private policyKey(tier: CollaboratorTier) {
    return `${tier.name.trim().toLowerCase()}|${Number(tier.minRevenueThreshold)}|${Number(tier.extraBonusPercentage)}`;
  }

  private async previousMonthSales(userId: string) {
    let revenue = 0;
    let orderCount = 0;
    let cursor: string | undefined;
    while (true) {
      const orders = await this.prisma.order.findMany({
        where: {
          attributedCollaboratorId: userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
          createdAt: this.previousMonthWindow(),
        },
        select: { id: true, subtotalAmount: true, couponDiscountAmount: true, finalAmount: true, refundedAmount: true },
        orderBy: { id: 'asc' },
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const order of orders) {
        const netGoods = Math.max(0, Number(order.subtotalAmount) - Number(order.couponDiscountAmount || 0));
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
    const sales = await this.previousMonthSales(userId);
    const currentRevenue = sales.revenue;
    const totalOrders = sales.orderCount;

    // Commissions and the leaderboard use the profile's assigned tier. Reading
    // this page must not silently replace it with a different calculated tier.
    const currentTier = profile.tier || tiers[0];
    const qualifiedTier = [...tiers].reverse().find(
      (tier) => currentRevenue >= Number(tier.minRevenueThreshold),
    ) || tiers[0];
    const nextTier = tiers.find(
      (tier) => Number(tier.minRevenueThreshold) > Number(currentTier.minRevenueThreshold),
    ) || null;

    let progressPercentage = 100;
    let revenueNeeded = 0;

    if (nextTier) {
      const currentThreshold = Number(currentTier.minRevenueThreshold);
      const nextThreshold = Number(nextTier.minRevenueThreshold);
      const span = nextThreshold - currentThreshold;
      const progress = currentRevenue - currentThreshold;
      progressPercentage = Math.min(
        100,
        Math.max(0, Math.round((progress / span) * 100)),
      );
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
   * Động cơ đánh giá và tự động thăng hạng KOL dựa trên doanh số tích lũy
   */
  @Cron('15 0 1 * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async evaluateAllCollaborators() {
    const tiers = (await this.getAllTiers()).reverse();
    if (!tiers.length) {
      throw new NotFoundException('Chưa có chính sách cấp bậc được cấu hình');
    }

    const profiles = await this.prisma.collaboratorProfile.findMany({
      include: { tier: true },
    });

    let updatedCount = 0;
    const details: any[] = [];

    for (const p of profiles) {
      const totalRevenue = (await this.previousMonthSales(p.userId)).revenue;

      // Tìm tier cao nhất mà doanh thu thỏa mãn
      const matchedTier =
        tiers.find((t) => totalRevenue >= Number(t.minRevenueThreshold)) ||
        tiers[tiers.length - 1];

      if (!p.tier || this.policyKey(p.tier) !== this.policyKey(matchedTier)) {
        await this.prisma.collaboratorProfile.update({
          where: { id: p.id },
          data: { tierId: matchedTier.id },
        });
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

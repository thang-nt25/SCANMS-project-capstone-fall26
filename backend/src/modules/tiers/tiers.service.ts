import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import type { CollaboratorTier } from '@prisma/client';

@Injectable()
export class TiersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const salesAggregate = await this.prisma.order.aggregate({
      where: {
        attributedCollaboratorId: userId,
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      _sum: { finalAmount: true },
      _count: { id: true },
    });

    const currentRevenue = Number(salesAggregate._sum.finalAmount || 0);
    const totalOrders = salesAggregate._count.id || 0;

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
        extraBonusPercentage: Number(currentTier.extraBonusPercentage),
        minRevenueThreshold: Number(currentTier.minRevenueThreshold),
      },
      currentRevenue,
      totalOrders,
      revenueBasis: 'LIFETIME',
      qualifiedTier: {
        id: qualifiedTier.id,
        name: qualifiedTier.name,
        extraBonusPercentage: Number(qualifiedTier.extraBonusPercentage),
        minRevenueThreshold: Number(qualifiedTier.minRevenueThreshold),
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.name,
            minRevenueThreshold: Number(nextTier.minRevenueThreshold),
            extraBonusPercentage: Number(nextTier.extraBonusPercentage),
          }
        : null,
      progressPercentage,
      revenueNeeded,
    };
  }

  /**
   * Động cơ đánh giá và tự động thăng hạng KOL dựa trên doanh số tích lũy
   */
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
      const salesAggregate = await this.prisma.order.aggregate({
        where: {
          attributedCollaboratorId: p.userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        _sum: { finalAmount: true },
      });

      const totalRevenue = Number(salesAggregate._sum.finalAmount || 0);

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

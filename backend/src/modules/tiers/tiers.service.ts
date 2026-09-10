import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TiersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh mục tất cả cấp bậc KOL
   */
  async getAllTiers() {
    return this.prisma.collaboratorTier.findMany({
      orderBy: { minRevenueThreshold: 'asc' },
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

    const tiers = await this.prisma.collaboratorTier.findMany({
      orderBy: { minRevenueThreshold: 'asc' },
    });

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

    // Xác định bậc hiện tại và bậc tiếp theo
    let currentTier: any = profile.tier || tiers[0];
    let nextTier: any = null;

    for (let i = 0; i < tiers.length; i++) {
      if (currentRevenue >= Number(tiers[i].minRevenueThreshold)) {
        currentTier = tiers[i];
        nextTier = tiers[i + 1] || null;
      }
    }

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
    const tiers = await this.prisma.collaboratorTier.findMany({
      orderBy: { minRevenueThreshold: 'desc' }, // Từ Kim Cương xuống Đồng
    });

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

      if (p.tierId !== matchedTier.id) {
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

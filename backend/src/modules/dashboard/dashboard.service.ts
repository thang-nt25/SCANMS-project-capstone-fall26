import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

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

  // ─── SHOP DASHBOARD ──────────────────────────────────────────────────
  async getShopDashboard(userId: string, days = 30) {
    const storeId = await this.getStoreId(userId);
    if (!storeId) return this._emptyShopDashboard();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalOrders, totalRevenue, totalCommissions, clicks, ordersByDay, revByDay, clicksByDay] =
      await Promise.all([
        // Tổng đơn
        this.prisma.order.count({ where: { storeId, createdAt: { gte: since } } }),
        // Tổng doanh thu
        this.prisma.order.aggregate({
          _sum: { finalAmount: true },
          where: { storeId, status: { in: ['DELIVERED', 'COMPLETED'] }, createdAt: { gte: since } },
        }),
        // Tổng hoa hồng đã trả
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: {
            order: { storeId },
            status: 'APPROVED',
            createdAt: { gte: since },
          },
        }),
        // Tổng click (từ referral links của shop)
        this.prisma.clickTrafficLog.count({
          where: {
            referralLink: { product: { storeId } },
            createdAt: { gte: since },
          },
        }),
        // Đơn hàng theo ngày (7 ngày gần nhất)
        this._ordersByDay(storeId, 7),
        // Doanh thu theo ngày
        this._revenueByDay(storeId, 7),
        // Clicks theo ngày
        this._clicksByDay(storeId, 7),
      ]);

    const cr = clicks > 0 ? ((totalOrders / clicks) * 100).toFixed(2) : '0.00';

    return {
      summary: {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.finalAmount ?? 0),
        totalCommissions: Number(totalCommissions._sum.commissionAmount ?? 0),
        totalClicks: clicks,
        conversionRate: parseFloat(cr),
      },
      charts: {
        ordersByDay,
        revenueByDay: revByDay,
        clicksByDay,
      },
    };
  }

  // ─── KOL DASHBOARD ───────────────────────────────────────────────────
  async getKolDashboard(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalOrders, clicks, totalCommission, pendingCommission, commissionsByDay, clicksByDay] =
      await Promise.all([
        // Tổng đơn KOL được attributed
        this.prisma.order.count({
          where: { attributedCollaboratorId: userId, createdAt: { gte: since } },
        }),
        // Clicks qua link của KOL
        this.prisma.clickTrafficLog.count({
          where: { referralLink: { collaboratorId: userId }, createdAt: { gte: since } },
        }),
        // Tổng hoa hồng khả dụng
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { collaboratorId: userId, status: 'APPROVED', createdAt: { gte: since } },
        }),
        // Hoa hồng đang chờ
        this.prisma.commission.aggregate({
          _sum: { commissionAmount: true },
          where: { collaboratorId: userId, status: 'PENDING', createdAt: { gte: since } },
        }),
        // Hoa hồng theo ngày (7 ngày)
        this._kolCommissionsByDay(userId, 7),
        // Clicks theo ngày (KOL)
        this._kolClicksByDay(userId, 7),
      ]);

    const cr = clicks > 0 ? ((totalOrders / clicks) * 100).toFixed(2) : '0.00';

    return {
      summary: {
        totalOrders,
        totalClicks: clicks,
        conversionRate: parseFloat(cr),
        totalCommission: Number(totalCommission._sum.commissionAmount ?? 0),
        pendingCommission: Number(pendingCommission._sum.commissionAmount ?? 0),
      },
      charts: {
        commissionsByDay,
        clicksByDay,
      },
    };
  }

  // ─── Helpers: Dữ liệu theo ngày ──────────────────────────────────────
  private async _ordersByDay(storeId: string, days: number) {
    const rows: Array<{ day: Date; count: bigint }> = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
             COUNT(*)::bigint AS count
      FROM orders
      WHERE store_id = ${storeId}::uuid
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;
    return this._fillDays(rows.map(r => ({ date: this._fmtDay(r.day), value: Number(r.count) })), days, 'count');
  }

  private async _revenueByDay(storeId: string, days: number) {
    const rows: Array<{ day: Date; total: any }> = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
             SUM(final_amount) AS total
      FROM orders
      WHERE store_id = ${storeId}::uuid
        AND status IN ('DELIVERED', 'COMPLETED')
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;
    return this._fillDays(rows.map(r => ({ date: this._fmtDay(r.day), value: Number(r.total ?? 0) })), days, 'revenue');
  }

  private async _clicksByDay(storeId: string, days: number) {
    const rows: Array<{ day: Date; count: bigint }> = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', ctl.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
             COUNT(*)::bigint AS count
      FROM click_traffic_logs ctl
      JOIN referral_links rl ON rl.id = ctl.referral_link_id
      JOIN products p ON p.id = rl.product_id
      WHERE p.store_id = ${storeId}::uuid
        AND ctl.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;
    return this._fillDays(rows.map(r => ({ date: this._fmtDay(r.day), value: Number(r.count) })), days, 'clicks');
  }

  private async _kolCommissionsByDay(userId: string, days: number) {
    const rows: Array<{ day: Date; total: any }> = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
             SUM(commission_amount) AS total
      FROM commissions
      WHERE collaborator_id = ${userId}::uuid
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;
    return this._fillDays(rows.map(r => ({ date: this._fmtDay(r.day), value: Number(r.total ?? 0) })), days, 'commission');
  }

  private async _kolClicksByDay(userId: string, days: number) {
    const rows: Array<{ day: Date; count: bigint }> = await this.prisma.$queryRaw`
      SELECT DATE_TRUNC('day', ctl.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
             COUNT(*)::bigint AS count
      FROM click_traffic_logs ctl
      JOIN referral_links rl ON rl.id = ctl.referral_link_id
      WHERE rl.collaborator_id = ${userId}::uuid
        AND ctl.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
    `;
    return this._fillDays(rows.map(r => ({ date: this._fmtDay(r.day), value: Number(r.count) })), days, 'clicks');
  }

  // ─── Utility: điền các ngày còn thiếu = 0 ────────────────────────────
  private _fillDays(
    data: Array<{ date: string; value: number }>,
    days: number,
    key: string,
  ) {
    const map = new Map(data.map(d => [d.date, d.value]));
    const result: Array<Record<string, string | number>> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = this._fmtDay(d);
      result.push({ date: label, [key]: map.get(label) ?? 0 });
    }
    return result;
  }

  private _fmtDay(d: Date): string {
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private _emptyShopDashboard() {
    return {
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        totalCommissions: 0,
        totalClicks: 0,
        conversionRate: 0,
      },
      charts: { ordersByDay: [], revenueByDay: [], clicksByDay: [] },
    };
  }
}

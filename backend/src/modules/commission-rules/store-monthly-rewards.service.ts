import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { managedStoreWhere } from '../../common/store-access';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { CommissionRulesService } from './commission-rules.service';
import { WalletsService } from '../wallets/wallets.service';
import { postFinance } from '../payouts/finance-posting';
import { rulesAt } from './rule-history';
import { cleanGoodsRevenue } from '../payouts/finance-revenue';
import { isSelfReferral, requiresReferralReview } from '../commissions/self-referral';

type RevenueOrder = Prisma.OrderGetPayload<{ include: { refunds: true } }>;
const creatorSelect = { id: true, fullName: true, email: true, phoneNumber: true } as const;
function summarizeRevenue(orders: RevenueOrder[], creator: { id: string; email?: string | null; phoneNumber?: string | null }) {
  let total = new Prisma.Decimal(0), count = 0;
  const validOrders: { order: RevenueOrder; revenue: Prisma.Decimal }[] = [];
  for (const order of orders) {
    if (isSelfReferral(order, creator)) continue;
    if (requiresReferralReview(order)) throw new Error('Referral review required');
    const refunds = order.refunds.reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    const clean = cleanGoodsRevenue(order, Prisma.Decimal.min(order.finalAmount, refunds.gt(0) ? refunds : order.refundedAmount));
    if (clean.gt(0)) { total = total.add(clean); count++; validOrders.push({ order, revenue: clean }); }
  }
  return { total, count, validOrders };
}
import {
  CreateMonthlyRewardDto,
  ReviewMonthlyRewardDto,
} from './dto/monthly-reward.dto';

export function rewardMonth(now = new Date(), offset = 0) {
  const local = new Date(now.getTime() + 7 * 3600000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1),
  )
    .toISOString()
    .slice(0, 7);
}
@Injectable()
export class StoreMonthlyRewardsService {
  constructor(
    private readonly db: PrismaService,
    private readonly commissions: CommissionRulesService,
    private readonly wallets: WalletsService,
  ) {}
  async myPolicyOrders(user: AuthenticatedUser, policyId: string) {
    if (user.role !== UserRole.COLLABORATOR) throw new ForbiddenException('Chỉ KOL được xem đơn của chính mình tại đây.');
    const policy = await this.db.storeMonthlyRewardPolicy.findUnique({ where: { id: policyId } });
    if (!policy || policy.status !== 'APPROVED') throw new NotFoundException('Không tìm thấy chính sách đã duyệt.');
    const membership = await this.db.storeCollaborator.findFirst({ where: { storeId: policy.storeId, collaboratorId: user.id, status: 'APPROVED' } });
    if (!membership) throw new ForbiddenException('Bạn không có quyền xem đơn của chính sách này.');
    const creator = await this.db.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, phoneNumber: true } });
    if (!creator) throw new NotFoundException('Không tìm thấy tài khoản.');
    this.month(policy.yearMonth);
    const start = new Date(`${policy.yearMonth}-01T00:00:00+07:00`);
    const end = new Date(Date.UTC(Number(policy.yearMonth.slice(0, 4)), Number(policy.yearMonth.slice(5)), 1) - 7 * 3600000);
    const orders = await this.db.order.findMany({
      where: { storeId: policy.storeId, attributedCollaboratorId: user.id, status: 'COMPLETED', completedAt: { gte: start, lt: end } },
      include: { refunds: { where: { status: 'COMPLETED' } }, orderItems: { select: { quantity: true, product: { select: { title: true, imageUrl: true } } } } },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    });
    let summary: ReturnType<typeof summarizeRevenue>;
    try { summary = summarizeRevenue(orders, creator); }
    catch { throw new ConflictException('Doanh số đang cần đối soát.'); }
    const byId = new Map(orders.map(order => [order.id, order]));
    return { totalRevenue: summary.total.toFixed(2), totalOrders: summary.count, items: summary.validOrders.map(({ order, revenue }) => ({
      id: order.id, code: order.externalOrderSn || order.id, completedAt: order.completedAt,
      revenue: revenue.toFixed(2), products: byId.get(order.id)!.orderItems.map(item => ({ title: item.product.title, imageUrl: item.product.imageUrl, quantity: item.quantity })),
    })) };
  }
  private operator(user: AuthenticatedUser) {
    return (
      user.role === UserRole.SYSTEM_ADMIN ||
      user.role === UserRole.SYSTEM_MANAGER
    );
  }
  private async access(
    user: AuthenticatedUser,
    storeId: string,
    shopOnly = false,
  ) {
    if (shopOnly && user.role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException(
        'Chỉ quản lý cửa hàng được tạo chính sách hoặc đề nghị thưởng',
      );
    const store = await this.db.store.findFirst({
      where: {
        id: storeId,
        isDeleted: false,
        ...(this.operator(user) ? {} : managedStoreWhere(user.id)),
      },
    });
    if (!store)
      throw new ForbiddenException('Không có quyền truy cập cửa hàng này');
    return store;
  }
  private month(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? ''))
      throw new BadRequestException('Kỳ thưởng phải có dạng YYYY-MM');
  }
  private validateReward(target: string | Prisma.Decimal, reward: string | Prisma.Decimal) {
    const kpi = new Prisma.Decimal(target), amount = new Prisma.Decimal(reward);
    if (!kpi.isFinite() || !amount.isFinite() || kpi.lte(0) || amount.lte(0) || amount.gt(kpi))
      throw new BadRequestException('Tiền thưởng phải lớn hơn 0 và không được vượt KPI doanh số sạch.');
  }
  private async notifyReviewers(tx: Prisma.TransactionClient, title: string, message: string, policyId: string, yearMonth: string) {
    const reviewers = await tx.user.findMany({ where: { role: { in: [UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN] } }, select: { id: true } });
    if (reviewers.length) await tx.notification.createMany({ data: reviewers.map(reviewer => ({ userId: reviewer.id, type: 'SYSTEM', title, message,
      data: { actionUrl: `/admin/payouts?tab=monthly&yearMonth=${yearMonth}`, policyId, yearMonth } })) });
  }
  async policyHistory(user: AuthenticatedUser, storeId: string, page = 1) {
    await this.access(user, storeId, true);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000)
      throw new BadRequestException('Trang không hợp lệ');
    const pageSize = 5;
    const where = { storeId };
    const [items, total] = await Promise.all([
      this.db.storeMonthlyRewardPolicy.findMany({
        where, select: { id: true, yearMonth: true, name: true, targetRevenue: true, rewardAmount: true, status: true, createdAt: true, reviewNote: true },
        orderBy: [{ yearMonth: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.db.storeMonthlyRewardPolicy.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
  private async notifyShopSubmission(tx: Prisma.TransactionClient, userId: string, policyId: string, dto: CreateMonthlyRewardDto, resubmitted = false) {
    await tx.notification.create({ data: {
      userId, type: 'SYSTEM', title: resubmitted ? 'Đã gửi lại mốc thưởng tháng' : 'Đã tạo mốc thưởng tháng',
      message: `${dto.name.trim()} · ${dto.yearMonth} · Mốc ${Number(dto.targetRevenue).toLocaleString('vi-VN')} đ · Thưởng ${Number(dto.rewardAmount).toLocaleString('vi-VN')} đ · Chờ kiểm duyệt.`,
      data: { actionUrl: `/merchant/promotions?tab=creator-incentives&section=milestones&yearMonth=${dto.yearMonth}`, policyId, yearMonth: dto.yearMonth },
    } });
  }
  async create(
    user: AuthenticatedUser,
    storeId: string,
    dto: CreateMonthlyRewardDto,
  ) {
    const store = await this.access(user, storeId, true);
    this.month(dto.yearMonth);
    this.validateReward(dto.targetRevenue, dto.rewardAmount);
    if (dto.name.trim().length < 3)
      throw new BadRequestException('Tên chính sách cần ít nhất 3 ký tự');
    if (dto.yearMonth < rewardMonth())
      throw new BadRequestException(
        'Chỉ tạo chính sách từ tháng hiện tại trở đi',
      );
    try {
      return await this.db.$transaction(async (tx) => {
        const previous = await tx.storeMonthlyRewardPolicy.findUnique({
          where: { storeId_yearMonth: { storeId, yearMonth: dto.yearMonth } },
        });
        if (previous) {
          if (previous.status !== 'REJECTED')
            throw new ConflictException('Chính sách tháng này đang chờ duyệt hoặc đã được duyệt; không thể gửi trùng.');
          const changed = await tx.storeMonthlyRewardPolicy.updateMany({
            where: { id: previous.id, status: 'REJECTED', updatedAt: previous.updatedAt },
            data: {
              name: dto.name.trim(), targetRevenue: new Prisma.Decimal(dto.targetRevenue), rewardAmount: new Prisma.Decimal(dto.rewardAmount),
              status: 'PENDING', createdBy: user.id, reviewedBy: null, reviewedAt: null, reviewNote: null,
            },
          });
          if (!changed.count) throw new ConflictException('Chính sách vừa thay đổi. Vui lòng tải lại trước khi gửi.');
          await tx.auditLog.create({ data: { userId: user.id, action: 'RESUBMIT_STORE_MONTHLY_REWARD', details: {
            policyId: previous.id, storeId, yearMonth: previous.yearMonth,
            previous: { name: previous.name, targetRevenue: previous.targetRevenue.toFixed(2), rewardAmount: previous.rewardAmount.toFixed(2),
              status: previous.status, reviewNote: previous.reviewNote, reviewedBy: previous.reviewedBy, reviewedAt: previous.reviewedAt?.toISOString() ?? null },
            submitted: { name: dto.name.trim(), targetRevenue: dto.targetRevenue, rewardAmount: dto.rewardAmount },
          } } });
          await this.notifyReviewers(tx, 'Chính sách thưởng tháng gửi lại', `${store.name} · ${dto.yearMonth} · Chờ kiểm duyệt chính sách đã chỉnh sửa.`, previous.id, dto.yearMonth);
          await this.notifyShopSubmission(tx, user.id, previous.id, dto, true);
          return { id: previous.id, status: 'PENDING', resubmitted: true };
        }
        const policy = await tx.storeMonthlyRewardPolicy.create({
          data: {
            ...dto,
            name: dto.name.trim(),
            targetRevenue: new Prisma.Decimal(dto.targetRevenue),
            rewardAmount: new Prisma.Decimal(dto.rewardAmount),
            storeId,
            createdBy: user.id,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'PROPOSE_STORE_MONTHLY_REWARD',
            details: {
              policyId: policy.id,
              storeId,
              yearMonth: policy.yearMonth,
            },
          },
        });
        await this.notifyReviewers(tx, 'Chính sách thưởng tháng chờ duyệt', `${store.name} · ${dto.yearMonth} · KPI ${Number(dto.targetRevenue).toLocaleString('vi-VN')} đ · Thưởng ${Number(dto.rewardAmount).toLocaleString('vi-VN')} đ.`, policy.id, dto.yearMonth);
        await this.notifyShopSubmission(tx, user.id, policy.id, dto);
        return policy;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Cửa hàng đã có chính sách tháng này');
      throw error;
    }
  }
  async reviewPolicy(
    user: AuthenticatedUser,
    id: string,
    dto: ReviewMonthlyRewardDto,
  ) {
    if (!this.operator(user))
      throw new ForbiddenException('Chỉ System Manager/Admin được kiểm duyệt');
    if (dto.decision === 'REJECTED' && !dto.note?.trim())
      throw new BadRequestException('Cần lý do từ chối');
    return this.db.$transaction(async (tx) => {
      const policy = await tx.storeMonthlyRewardPolicy.findUnique({ where: { id } });
      if (!policy) throw new NotFoundException('Không tìm thấy chính sách');
      if (dto.decision === 'APPROVED') this.validateReward(policy.targetRevenue, policy.rewardAmount);
      const changed = await tx.storeMonthlyRewardPolicy.updateMany({
        where: { id, status: 'PENDING', createdBy: { not: user.id } },
        data: {
          status: dto.decision,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNote: dto.note?.trim(),
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Chính sách đã xử lý hoặc không được tự duyệt',
        );
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REVIEW_STORE_MONTHLY_REWARD',
          details: { policyId: id, ...dto },
        },
      });
      await tx.notification.create({ data: { userId: policy.createdBy, type: 'SYSTEM',
        title: dto.decision === 'APPROVED' ? 'Chính sách thưởng tháng đã được duyệt' : 'Chính sách thưởng tháng bị từ chối',
        message: `${policy.name} · ${policy.yearMonth}${dto.note ? ` · ${dto.note}` : ''}`,
        data: { actionUrl: `/merchant/promotions?tab=creator-incentives&section=milestones&yearMonth=${policy.yearMonth}`, policyId: id, yearMonth: policy.yearMonth },
      } });
      if (dto.decision === 'APPROVED') {
        const store = await tx.store.findUnique({ where: { id: policy.storeId }, select: { name: true } });
        const members = await tx.storeCollaborator.findMany({ where: { storeId: policy.storeId, status: 'APPROVED' }, select: { collaboratorId: true } });
        const recipients = [...new Set(members.map(member => member.collaboratorId))];
        if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type: 'SYSTEM',
          title: 'Có mốc thưởng doanh số tháng mới',
          message: `${store?.name || policy.name} · ${policy.yearMonth}: đạt ${Number(policy.targetRevenue).toLocaleString('vi-VN')} đ doanh số sạch để được đề nghị thưởng ${Number(policy.rewardAmount).toLocaleString('vi-VN')} đ. Chính sách đã được duyệt, áp dụng cho các KOL hợp tác với cửa hàng; tiền thưởng cần kiểm duyệt trước khi cộng ví.`,
          data: { actionUrl: `/collaborator/bonus-progress?yearMonth=${policy.yearMonth}`, policyId: id, yearMonth: policy.yearMonth },
        })) });
      }
      return {
        message:
          dto.decision === 'APPROVED'
            ? 'Đã duyệt chính sách thưởng tháng'
            : 'Đã từ chối chính sách',
      };
    });
  }
  async list(user: AuthenticatedUser, month: string, storeId?: string) {
    this.month(month);
    const kol = user.role === UserRole.COLLABORATOR;
    const stores = await this.db.store.findMany({
      where: {
        isDeleted: false,
        ...(storeId ? { id: storeId } : {}),
        ...(this.operator(user)
          ? {}
          : kol
            ? {
                OR: [
                  { storeCollaborators: { some: { collaboratorId: user.id, status: 'APPROVED' } } },
                  { monthlyBonusResults: { some: { collaboratorId: user.id } } },
                ],
              }
            : managedStoreWhere(user.id)),
      },
      select: { id: true, name: true, logoUrl: true },
    });
    const policies = await this.db.storeMonthlyRewardPolicy.findMany({
      where: {
        storeId: { in: stores.map((s) => s.id) },
        yearMonth: month,
        ...(kol ? { status: 'APPROVED' } : {}),
      },
      include: { grants: { where: kol ? { collaboratorId: user.id } : {} } },
      orderBy: { createdAt: 'desc' },
    });
    const resubmissions = !kol && policies.length ? await this.db.auditLog.findMany({
      where: { action: 'RESUBMIT_STORE_MONTHLY_REWARD', OR: policies.map(policy => ({ details: { path: ['policyId'], equals: policy.id } })) },
      select: { id: true, createdAt: true, details: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }) : [];
    const result = await Promise.all(
      policies.map(async (policy) => {
        const memberships = await this.db.storeCollaborator.findMany({
          where: {
            storeId: policy.storeId,
            status: 'APPROVED',
            ...(kol ? { collaboratorId: user.id } : {}),
          },
          select: {
            collaboratorId: true,
            collaborator: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true, isActive: true, isDeleted: true } },
          },
        });
        const start = new Date(`${month}-01T00:00:00+07:00`);
        const end = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 1) - 7 * 3600000);
        // One sales read per policy, rather than repeating user/store/audit/rule
        // and order queries for every KOL. Review still checks fresh in its tx.
        const orders = memberships.length ? await this.db.order.findMany({
          where: { storeId: policy.storeId, attributedCollaboratorId: { in: memberships.map(m => m.collaboratorId) }, status: 'COMPLETED', completedAt: { gte: start, lt: end } },
          include: { refunds: { where: { status: 'COMPLETED' } } },
        }) : [];
        const byKol = new Map<string, typeof orders>();
        for (const order of orders) {
          if (!order.attributedCollaboratorId) continue;
          const group = byKol.get(order.attributedCollaboratorId) ?? [];
          group.push(order); byKol.set(order.attributedCollaboratorId, group);
        }
        const members = memberships.map((member) => {
            try {
              const person = member.collaborator;
              if (!person.isActive || person.isDeleted || person.role !== UserRole.COLLABORATOR) throw new Error('Inactive collaborator');
              const { total, count } = summarizeRevenue(byKol.get(member.collaboratorId) ?? [], person);
              const eligible = total.gte(policy.targetRevenue);
              return {
                collaboratorId: member.collaboratorId,
                name: member.collaborator.fullName,
                validRevenue: total.toFixed(2),
                validOrdersCount: count,
                eligible,
                estimatedReward: eligible
                  ? policy.rewardAmount.toString()
                  : '0',
                grant:
                  policy.grants.find(
                    (g) => g.collaboratorId === member.collaboratorId,
                  ) ?? null,
                error: null,
              };
            } catch {
              return {
                collaboratorId: member.collaboratorId,
                name: member.collaborator.fullName,
                validRevenue: null,
                validOrdersCount: 0,
                eligible: false,
                estimatedReward: '0',
                grant:
                  policy.grants.find(
                    (g) => g.collaboratorId === member.collaboratorId,
                  ) ?? null,
                error: 'Chưa đối soát được doanh số; không thể duyệt thưởng.',
              };
            }
          });
        const { grants, ...data } = policy;
        void grants;
        return {
          ...data,
          reviewHistory: resubmissions.flatMap(event => {
            const details = event.details as Prisma.JsonObject | null;
            const previous = details?.previous;
            if (details?.policyId !== policy.id || !previous || typeof previous !== 'object' || Array.isArray(previous)) return [];
            return [{ id: event.id, resubmittedAt: event.createdAt,
              name: typeof previous.name === 'string' ? previous.name : null,
              targetRevenue: typeof previous.targetRevenue === 'string' ? previous.targetRevenue : null,
              rewardAmount: typeof previous.rewardAmount === 'string' ? previous.rewardAmount : null,
              reviewNote: typeof previous.reviewNote === 'string' ? previous.reviewNote : null,
              reviewedAt: typeof previous.reviewedAt === 'string' ? previous.reviewedAt : null,
            }];
          }),
          storeName: stores.find((s) => s.id === policy.storeId)?.name,
          members,
        };
      }),
    );
    const legacyHistory = await this.legacyHistory(stores, month, kol ? user.id : undefined, new Set(policies.map(p => p.storeId)));
    return { month, stores, policies: result, legacyHistory };
  }
  private async legacyHistory(stores: { id: string; name: string }[], month: string, collaboratorId: string | undefined, newPolicyStores: Set<string>) {
    if (month > rewardMonth() || !stores.length) return [];
    const rows = await this.db.monthlyBonusResult.findMany({
      where: { storeId: { in: stores.map(s => s.id) }, yearMonth: month, ...(collaboratorId ? { collaboratorId } : {}) },
      include: { collaborator: { select: { fullName: true } } },
      orderBy: [{ settledAt: 'desc' }, { id: 'asc' }],
    });
    const monthStart = new Date(`${month}-01T00:00:00+07:00`);
    const needsPolicy = stores.filter(s => !newPolicyStores.has(s.id) && !rows.some(row => row.storeId === s.id && !(row.ruleSnapshot as Record<string, unknown> | null)?.storeMonthlyRewardPolicyId)).map(s => s.id);
    const candidates = month < rewardMonth() && needsPolicy.length ? await this.db.commissionRule.findMany({
      where: { storeId: { in: needsPolicy }, createdAt: { lte: monthStart } },
      select: { storeId: true },
      distinct: ['storeId'],
    }) : [];
    const candidateStores = new Set(candidates.map(rule => rule.storeId));
    const history: any[] = [];
    // Bounded per-store reads: history must not trigger calculations or writes.
    for (const store of stores) {
      const settlements = rows.filter(row => row.storeId === store.id && !(row.ruleSnapshot as Record<string, unknown> | null)?.storeMonthlyRewardPolicyId);
      const snapshots = settlements.flatMap(row => {
        const snapshot = row.ruleSnapshot as Record<string, any> | null;
        return Array.isArray(snapshot?.rules) ? snapshot.rules : [];
      });
      let rules = snapshots;
      let warning: string | null = null;
      if (!settlements.length && candidateStores.has(store.id)) {
        try {
          // Replay audited versions at month opening, never today's rules.
          rules = await this.db.$transaction(tx => rulesAt(tx, store.id, monthStart));
        } catch {
          warning = 'Chính sách cũ thiếu lịch sử phiên bản; cần đối soát.';
        }
      }
      rules = rules.filter(rule => rule.isActive !== false && !rule.isDeleted && (!rule.effectiveFrom || new Date(rule.effectiveFrom) <= monthStart) && (!rule.effectiveTo || new Date(rule.effectiveTo) >= monthStart));
      const uniqueRules = [...new Map(rules.map(rule => [`${rule.id}:${rule.version ?? 1}`, rule])).values()];
      if (!settlements.length && !uniqueRules.length && !warning) continue;
      history.push({
        storeId: store.id, storeName: store.name, yearMonth: month, warning,
        rules: uniqueRules.map(rule => ({ id: rule.id, name: rule.name, targetRevenue: String(rule.minMonthlyRevenue), rewardAmount: String(rule.achievementBonus ?? '0'), bonusPercentage: String(rule.bonusPercentage ?? '0') })),
        settlements: settlements.map(row => ({ id: row.id, collaboratorId: row.collaboratorId, name: row.collaborator.fullName, validRevenue: row.validRevenue.toString(), amount: row.bonusAmount.toString(), appliedRuleName: row.appliedRuleName, status: row.status, settledAt: row.settledAt, paidAt: row.paidAt })),
      });
    }
    if (!history.length) return history;
    const monthEnd = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 1) - 7 * 3600000);
    const historyStoreIds = history.map(h => h.storeId);
    // A historical roster comes from partnership dates or actual orders in that
    // period, never all of today's partners. Paid snapshots always take priority.
    const [partnerships, orders] = await Promise.all([
      this.db.storeCollaborator.findMany({ where: {
        storeId: { in: historyStoreIds }, ...(collaboratorId ? { collaboratorId } : {}),
        AND: [
          { OR: [{ approvedAt: { lt: monthEnd } }, { approvedAt: null, status: 'APPROVED', createdAt: { lt: monthEnd } }] },
          { OR: [{ terminatedAt: null }, { terminatedAt: { gte: monthStart } }] },
        ],
      }, select: { storeId: true, collaboratorId: true, collaborator: { select: creatorSelect } } }),
      this.db.order.findMany({ where: { storeId: { in: historyStoreIds }, status: 'COMPLETED', completedAt: { gte: monthStart, lt: monthEnd }, attributedCollaboratorId: collaboratorId ?? { not: null } }, include: { refunds: { where: { status: 'COMPLETED' } }, attributedCollaborator: { select: creatorSelect } } }),
    ]);
    for (const entry of history) {
      const roster = new Map<string, { id: string; fullName: string; email: string | null; phoneNumber: string | null }>();
      for (const member of partnerships) if (member.storeId === entry.storeId) roster.set(member.collaboratorId, member.collaborator);
      const byKol = new Map<string, RevenueOrder[]>();
      for (const order of orders) {
        if (order.storeId !== entry.storeId || !order.attributedCollaboratorId || !order.attributedCollaborator) continue;
        roster.set(order.attributedCollaboratorId, order.attributedCollaborator);
        const group = byKol.get(order.attributedCollaboratorId) ?? []; group.push(order); byKol.set(order.attributedCollaboratorId, group);
      }
      const members = entry.settlements.map(row => ({ ...row, isSettled: true, validOrdersCount: null, error: null }));
      for (const creator of roster.values()) {
        if (entry.settlements.some(row => row.collaboratorId === creator.id)) continue;
        const base = { id: `history-${entry.storeId}-${creator.id}`, collaboratorId: creator.id, name: creator.fullName, amount: null, appliedRuleName: null, status: 'NOT_SETTLED', settledAt: null, paidAt: null, isSettled: false };
        try {
          const { total, count } = summarizeRevenue(byKol.get(creator.id) ?? [], creator);
          members.push({ ...base, validRevenue: total.toFixed(2), validOrdersCount: count, error: null });
        } catch {
          members.push({ ...base, validRevenue: null, validOrdersCount: null, error: 'Doanh số cần đối soát' });
        }
      }
      entry.members = members;
    }
    return history;
  }
  async request(
    user: AuthenticatedUser,
    policyId: string,
    collaboratorId: string,
  ) {
    const policy = await this.db.storeMonthlyRewardPolicy.findUnique({
      where: { id: policyId },
    });
    if (!policy) throw new NotFoundException();
    await this.access(user, policy.storeId, true);
    if (policy.status !== 'APPROVED' || policy.yearMonth > rewardMonth())
      throw new BadRequestException(
        'Chính sách chưa được duyệt hoặc kỳ chưa bắt đầu',
      );
    const partnership = await this.db.storeCollaborator.findFirst({
      where: { storeId: policy.storeId, collaboratorId, status: 'APPROVED' },
    });
    if (!partnership)
      throw new BadRequestException('KOL chưa hợp tác với cửa hàng');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`monthly-bonus:${policy.storeId}:${collaboratorId}`},0))`;
      const existing = await tx.storeMonthlyRewardGrant.findUnique({ where: { policyId_collaboratorId: { policyId, collaboratorId } } });
      if (existing) throw new ConflictException('Đề nghị thưởng đã được gửi hoặc xử lý; vui lòng tải lại để xem trạng thái.');
      const revenue = await this.commissions.calculateValidMonthlyRevenue(
        policy.storeId,
        collaboratorId,
        policy.yearMonth,
        tx,
      );
      if (new Prisma.Decimal(revenue.validRevenue).lt(policy.targetRevenue))
        throw new BadRequestException('KOL chưa đạt KPI doanh số sạch');
      const legacy = await tx.monthlyBonusResult.findUnique({
        where: {
          storeId_collaboratorId_yearMonth: {
            storeId: policy.storeId,
            collaboratorId,
            yearMonth: policy.yearMonth,
          },
        },
      });
      if (legacy && ['APPROVED', 'PAID'].includes(legacy.status))
        throw new ConflictException(
          'Kỳ đã có thưởng từ luồng cũ; cần đối soát để tránh thưởng trùng',
        );
      const grant = await tx.storeMonthlyRewardGrant.upsert({
        where: { policyId_collaboratorId: { policyId, collaboratorId } },
        create: {
          policyId,
          collaboratorId,
          amount: policy.rewardAmount,
          validRevenue: revenue.validRevenue,
          requestedBy: user.id,
        },
        update: {},
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REQUEST_STORE_MONTHLY_REWARD',
          details: { grantId: grant.id, policyId, collaboratorId },
        },
      });
      await tx.notification.create({ data: { userId: collaboratorId, type: 'SYSTEM', title: 'Đề nghị thưởng tháng đang chờ duyệt',
        message: `${policy.name} · ${policy.yearMonth}: bạn đạt ${Number(revenue.validRevenue).toLocaleString('vi-VN')} đ doanh số sạch. Shop đã gửi đề nghị thưởng ${Number(policy.rewardAmount).toLocaleString('vi-VN')} đ đến Manager/Admin; chưa cộng ví.`,
        data: { actionUrl: `/collaborator/bonus-progress?yearMonth=${policy.yearMonth}`, policyId, grantId: grant.id, yearMonth: policy.yearMonth },
      } });
      await this.notifyReviewers(tx, 'Đề nghị thưởng KOL chờ duyệt', `${policy.name} · ${policy.yearMonth} · Đề nghị thưởng ${Number(policy.rewardAmount).toLocaleString('vi-VN')} đ cho KOL đã đạt KPI.`, policyId, policy.yearMonth);
      return {
        message: 'Đã gửi đề nghị thưởng, chờ System Manager/Admin duyệt',
        grant,
      };
    });
  }
  async reviewGrant(
    user: AuthenticatedUser,
    id: string,
    dto: ReviewMonthlyRewardDto,
  ) {
    if (!this.operator(user))
      throw new ForbiddenException(
        'Chỉ System Manager/Admin được duyệt thưởng',
      );
    if (dto.decision === 'REJECTED' && !dto.note?.trim())
      throw new BadRequestException('Cần lý do từ chối');
    return this.db.$transaction(
      async (tx) => {
        const initial = await tx.storeMonthlyRewardGrant.findUnique({
          where: { id },
          include: { policy: true },
        });
        if (!initial) throw new NotFoundException();
        // Use the same lock order as requests and refund adjustments.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`monthly-bonus:${initial.policy.storeId}:${initial.collaboratorId}`},0))`;
        await tx.$queryRaw`SELECT id FROM store_monthly_reward_grants WHERE id = ${id}::uuid FOR UPDATE`;
        const grant = await tx.storeMonthlyRewardGrant.findUnique({
          where: { id },
          include: { policy: true },
        });
        if (
          !grant ||
          grant.status !== 'PENDING' ||
          grant.requestedBy === user.id
        )
          throw new ConflictException(
            'Đề nghị đã xử lý hoặc không được tự duyệt',
          );
        const policy = grant.policy;
        if (dto.decision === 'APPROVED') {
          this.validateReward(policy.targetRevenue, grant.amount);
          if (policy.status !== 'APPROVED' || policy.yearMonth > rewardMonth())
            throw new BadRequestException('Chính sách chưa có hiệu lực');
          const partnership = await tx.storeCollaborator.findFirst({
            where: {
              storeId: policy.storeId,
              collaboratorId: grant.collaboratorId,
              status: 'APPROVED',
            },
          });
          if (!partnership)
            throw new BadRequestException('KOL không còn hợp tác với cửa hàng');
          const revenue = await this.commissions.calculateValidMonthlyRevenue(
            policy.storeId,
            grant.collaboratorId,
            policy.yearMonth,
            tx,
          );
          if (new Prisma.Decimal(revenue.validRevenue).lt(policy.targetRevenue))
            throw new ConflictException(
              'Doanh số thay đổi, KOL không còn đạt KPI',
            );
          const old = await tx.monthlyBonusResult.findUnique({
            where: {
              storeId_collaboratorId_yearMonth: {
                storeId: policy.storeId,
                collaboratorId: grant.collaboratorId,
                yearMonth: policy.yearMonth,
              },
            },
          });
          if (old && ['APPROVED', 'PAID'].includes(old.status))
            throw new ConflictException(
              'Kỳ đã có thưởng; không cộng ví hai lần',
            );
          // Keep a settlement snapshot so existing refund/clawback and financial
          // reports replay this exact shop policy, never today's legacy rules.
          const settlementData = {
            validRevenue: new Prisma.Decimal(revenue.validRevenue),
            appliedRuleId: null,
            appliedRuleName: policy.name,
            bonusPercentage: new Prisma.Decimal(0),
            achievementBonus: grant.amount,
            bonusAmount: grant.amount,
            status: 'PAID' as const,
            approvedAt: new Date(),
            paidAt: new Date(),
            ruleSnapshot: {
              policyVersion: 3,
              storeMonthlyRewardPolicyId: policy.id,
              grantId: grant.id,
              netBonus: grant.amount.toString(),
              rules: [
                {
                  id: policy.id,
                  name: policy.name,
                  minMonthlyRevenue: policy.targetRevenue.toString(),
                  achievementBonus: grant.amount.toString(),
                  bonusPercentage: '0',
                  isActive: true,
                  version: 1,
                  effectiveFrom: null,
                  effectiveTo: null,
                },
              ],
            },
          };
          const settlement = await tx.monthlyBonusResult.upsert({
            where: {
              storeId_collaboratorId_yearMonth: {
                storeId: policy.storeId,
                collaboratorId: grant.collaboratorId,
                yearMonth: policy.yearMonth,
              },
            },
            create: {
              ...settlementData,
              storeId: policy.storeId,
              collaboratorId: grant.collaboratorId,
              yearMonth: policy.yearMonth,
            },
            update: settlementData,
          });
          const { ledger } = await this.wallets.creditAvailableBalance(
            tx,
            grant.collaboratorId,
            grant.amount,
            { id: settlement.id, type: 'MONTHLY_BONUS' },
            policy.storeId,
          );
          await tx.monthlyBonusResult.update({
            where: { id: settlement.id },
            data: { walletTransactionId: ledger.id },
          });
          await postFinance(
            tx,
            settlement.id,
            'MONTHLY_BONUS_REWARD',
            'AFFILIATE_MARKETING_EXPENSE',
            'PARTNER_EARNINGS_PAYABLE',
            grant.amount,
          );
        }
        await tx.storeMonthlyRewardGrant.update({
          where: { id },
          data: {
            status: dto.decision === 'APPROVED' ? 'PAID' : 'REJECTED',
            reviewedBy: user.id,
            reviewNote: dto.note?.trim(),
            ...(dto.decision === 'APPROVED' ? { paidAt: new Date() } : {}),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'REVIEW_STORE_MONTHLY_REWARD_GRANT',
            details: { grantId: id, policyId: policy.id, ...dto },
          },
        });
        await tx.notification.create({
          data: {
            userId: grant.collaboratorId,
            type: 'SYSTEM',
            title:
              dto.decision === 'APPROVED'
                ? 'Đã nhận thưởng doanh số tháng'
                : 'Đề nghị thưởng bị từ chối',
            message: `${policy.name} · ${policy.yearMonth} · ${dto.decision === 'APPROVED' ? grant.amount.toString() + ' đ đã cộng ví' : dto.note}`,
            data: { actionUrl: `/collaborator/bonus-progress?yearMonth=${policy.yearMonth}`, policyId: policy.id, grantId: id, yearMonth: policy.yearMonth },
          },
        });
        return {
          message:
            dto.decision === 'APPROVED'
              ? 'Đã duyệt và cộng thưởng vào ví KOL'
              : 'Đã từ chối đề nghị thưởng',
        };
      },
      { timeout: 30000 },
    );
  }
}

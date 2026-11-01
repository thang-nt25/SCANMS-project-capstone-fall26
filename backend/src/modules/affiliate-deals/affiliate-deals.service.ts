import { createDealProposal } from './deal-proposal-creation';
import { activeDealMap, sameDealScope } from './deal-scope.policy';
import { eligibleRevenue, evaluateRevenueKpi } from './deal-kpi.policy';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponStatus,
  ExclusiveDealStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CacheService,
  NOOP_CACHE_SERVICE,
} from '../../core/cache/cache.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { CreateExclusiveDealDto } from './dto/create-exclusive-deal.dto';
import { TerminateExclusiveDealDto } from './dto/terminate-exclusive-deal.dto';
import { ApproveExclusiveDealDto } from './dto/approve-exclusive-deal.dto';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import { InviteExclusiveDealDto } from './dto/invite-exclusive-deal.dto';
import {
  couponTerms,
  decideExclusiveDeal,
  lockDealPair,
} from './exclusive-deal-activation';
import {
  dealOrderWhere,
  dealWindow,
  evaluateDealKpi,
  KpiDeal,
  validateDealKpi,
} from './deal-kpi.policy';

@Injectable()
export class AffiliateDealsService {
  private vipVoucherCode(
    proposalId: string,
    kolName: string,
    discountPercent: number,
  ) {
    const brand =
      kolName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^A-Za-z]/g, '')
        .toUpperCase()
        .slice(0, 8) || 'KOL';
    return `${brand}${discountPercent}${proposalId.replace(/-/g, '').slice(0, 10).toUpperCase()}`.slice(
      0,
      20,
    );
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly referralLinksService: ReferralLinksService,
    private readonly cache: CacheService = NOOP_CACHE_SERVICE,
  ) {}

  private isSystemReviewer(role: UserRole) {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;
  }

  private async calculateProgress(deal: KpiDeal, db: any = this.prisma) {
    if (deal.targetRevenue && (!deal.commitmentStartedAt || !deal.commitmentEndsAt || !deal.settlementEndsAt)) return evaluateRevenueKpi(deal, 0, 0);
    if (deal.targetRevenue && deal.commitmentStartedAt && deal.commitmentEndsAt && deal.settlementEndsAt) {
      if (deal.scopeType === 'SELECTED_PRODUCTS' && !deal.scopeProducts) deal = { ...deal, scopeProducts: await db.exclusiveDealProduct.findMany({ where: { proposalId: deal.id }, select: { productId: true } }) };
      const orders = await db.order.findMany({ where: { ...dealOrderWhere(deal), status: { in: ['COMPLETED', 'PENDING', 'SHIPPING', 'DELIVERED', 'RETURN_REQUESTED', 'DISPUTED'] } }, include: { orderItems: { include: { referralLink: { select: { collaboratorId: true } } } } } });
      const valid = orders.filter((order: any) => order.status === 'COMPLETED' && Number(order.refundedAmount || 0) === 0 && order.completedAt && order.completedAt <= new Date(Math.min(Date.now(), deal.settlementEndsAt!.getTime())));
      const pending = orders.filter((order: any) => order.status !== 'COMPLETED');
      return evaluateRevenueKpi(deal, valid.reduce((sum: number, order: any) => sum + eligibleRevenue(order, deal), 0), pending.reduce((sum: number, order: any) => sum + eligibleRevenue(order, deal), 0), valid.length, pending.length);
    }
    if (
      !deal.targetOrders ||
      !deal.commitmentStartedAt ||
      !deal.commitmentEndsAt ||
      !deal.settlementEndsAt
    )
      return evaluateDealKpi(deal, 0, 0);
    const where = dealOrderWhere(deal);
    const [completed, pending] = await Promise.all([
      db.order.count({
        where: {
          ...where,
          status: 'COMPLETED',
          refundedAmount: 0,
          completedAt: {
            lte: new Date(
              Math.min(Date.now(), deal.settlementEndsAt.getTime()),
            ),
          },
        },
      }),
      db.order.count({
        where: {
          ...where,
          status: {
            in: [
              'PENDING',
              'SHIPPING',
              'DELIVERED',
              'RETURN_REQUESTED',
              'DISPUTED',
            ],
          },
        },
      }),
    ]);
    return evaluateDealKpi(deal, completed, pending);
  }

  async getProgress(id: string, userId: string, role: UserRole) {
    const deal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id },
    });
    if (!deal) throw new NotFoundException('Không tìm thấy Deal.');
    if (deal.collaboratorId !== userId)
      await this.assertStoreAccess(deal.storeId, userId, role);
    return this.calculateProgress(deal);
  }

  async getProposalState(id: string, userId: string, role: UserRole) {
    const proposal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id },
      include: { store: { select: { isDeleted: true } }, referralLink: true },
    });
    if (!proposal || proposal.store.isDeleted)
      throw new NotFoundException('Không tìm thấy đề nghị VIP.');
    if (role !== UserRole.COLLABORATOR || proposal.collaboratorId !== userId)
      await this.assertStoreAccess(proposal.storeId, userId, role);
    const shortCode = proposal.referralLink?.shortCode;
    return {
      id: proposal.id,
      status: proposal.status,
      closedAt: proposal.closedAt,
      scopeType: proposal.scopeType,
      targetRevenue: proposal.targetRevenue,
      approvedCommissionRate: proposal.approvedCommissionRate,
      proposedCommissionRate: proposal.proposedCommissionRate,
      exceptionNote: proposal.exceptionNote,
      initiatorRole: proposal.initiatedById ? 'SHOP_MANAGER' : 'COLLABORATOR',
      shortUrl: shortCode
        ? `${(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/r/${shortCode}`
        : null,
      vipVoucherCode: proposal.referralLink?.customCouponCode || null,
    };
  }

  private async assertStoreAccess(
    storeId: string,
    userId: string,
    role: UserRole,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        deletedAt: true,
        isDeleted: true,
      },
    });
    if (!store || store.deletedAt || store.isDeleted) {
      throw new NotFoundException('Không tìm thấy cửa hàng hoạt động.');
    }
    if (!this.isSystemReviewer(role)) {
      const managedStore =
        role === UserRole.SHOP_MANAGER
          ? await this.prisma.store.findFirst({
              where: { ...managedStoreWhere(userId), id: storeId },
              select: { id: true },
            })
          : null;
      if (!managedStore) {
        throw new ForbiddenException(
          'Bạn không có quyền xử lý đề xuất của Shop này.',
        );
      }
    }
    return store;
  }

  private async getCurrentApprovedDeals(
    pairs: Array<{ collaboratorId: string; productId: string }>,
  ) {
    return activeDealMap(this.prisma, pairs);
  }

  async getMyProposals(collaboratorId: string) {
    const proposals = await this.prisma.exclusiveDealProposal.findMany({
      where: { collaboratorId },
      include: {
        scopeProducts: { select: { productId: true } },
        collaborator: { select: { fullName: true } },
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            customCommissionRate: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            defaultCommissionRate: true,
          },
        },
        referralLink: {
          select: {
            id: true,
            shortCode: true,
            status: true,
            customCouponCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const currentDeals = await this.getCurrentApprovedDeals(
      proposals.map((proposal) => ({
        collaboratorId,
        productId: proposal.productId,
      })),
    );
    return proposals.map((proposal) => ({
      ...proposal,
      vipVoucherCode: proposal.referralLink?.customCouponCode || null,
      proposedCommissionRate: Number(proposal.proposedCommissionRate),
      approvedCommissionRate:
        proposal.approvedCommissionRate === null
          ? null
          : Number(proposal.approvedCommissionRate),
      publicCommissionRate: 10,
      shortUrl: proposal.referralLink
        ? `${process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/r/${proposal.referralLink.shortCode}`
        : null,
      isCurrentDeal: proposal.status === 'APPROVED' && !proposal.closedAt && (!proposal.commitmentEndsAt || proposal.commitmentEndsAt > new Date()),
      currentCommissionRate:
        currentDeals.get(`${collaboratorId}:${proposal.productId}`)
          ?.approvedCommissionRate == null
          ? null
          : Number(
              currentDeals.get(`${collaboratorId}:${proposal.productId}`)
                .approvedCommissionRate,
            ),
    }));
  }

  async getShopProposals(userId: string, role: UserRole) {
    const proposals = await this.prisma.exclusiveDealProposal.findMany({
      where: {
        store: this.isSystemReviewer(role)
          ? { isDeleted: false }
          : managedStoreWhere(userId),
      },
      include: {
        scopeProducts: { select: { productId: true } },
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            collaboratorProfile: {
              select: { avatarUrl: true, kycStatus: true },
            },
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            customCommissionRate: true,
          },
        },
        store: {
          select: { id: true, name: true, defaultCommissionRate: true },
        },
        referralLink: {
          select: {
            id: true,
            shortCode: true,
            status: true,
            customCouponCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const currentDeals = await this.getCurrentApprovedDeals(
      proposals.map((proposal) => ({
        collaboratorId: proposal.collaboratorId,
        productId: proposal.productId,
      })),
    );
    return proposals.map((proposal) => ({
      ...proposal,
      vipVoucherCode: proposal.referralLink?.customCouponCode || null,
      proposedCommissionRate: Number(proposal.proposedCommissionRate),
      approvedCommissionRate:
        proposal.approvedCommissionRate === null
          ? null
          : Number(proposal.approvedCommissionRate),
      publicCommissionRate: 10,
      isCurrentDeal: proposal.status === 'APPROVED' && !proposal.closedAt && (!proposal.commitmentEndsAt || proposal.commitmentEndsAt > new Date()),
      currentCommissionRate:
        currentDeals.get(`${proposal.collaboratorId}:${proposal.productId}`)
          ?.approvedCommissionRate == null
          ? null
          : Number(
              currentDeals.get(
                `${proposal.collaboratorId}:${proposal.productId}`,
              ).approvedCommissionRate,
            ),
    }));
  }

  async getShopActivePartners(userId: string, role: UserRole) {
    // The set of accessible stores may change while the cached data is alive.
    const stores = await this.prisma.store.findMany({
      where: this.isSystemReviewer(role)
        ? { isDeleted: false }
        : managedStoreWhere(userId),
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const storeIds = stores.map((store) => store.id);
    const cacheKey = `affiliate:deals:active_partners:${userId}:${role}:${storeIds.join(',')}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const rawDeals = await this.prisma.exclusiveDealProposal.findMany({
      where: {
        storeId: { in: storeIds },
        status: ExclusiveDealStatus.APPROVED,
        closedAt: null,
      },
      include: {
        scopeProducts: { select: { productId: true } },
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            collaboratorProfile: {
              select: {
                avatarUrl: true,
                tier: { select: { name: true } },
                totalFollowers: true,
              },
            },
            socialChannels: {
              where: { isPrimary: true },
              select: {
                platformName: true,
                channelName: true,
                channelUrl: true,
                followerCount: true,
              },
              take: 1,
            },
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
          },
        },
        referralLink: {
          select: {
            shortCode: true,
            totalClicks: true,
            totalOrders: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Mỗi KOL chỉ có duy nhất 1 Deal độc quyền có hiệu lực trên cùng 1 sản phẩm (bản mới nhất)
    const uniqueMap = new Map<string, (typeof rawDeals)[0]>();
    for (const deal of rawDeals) {
      const key = `${deal.storeId}:${deal.collaboratorId}:${deal.scopeKey || "PRODUCT:" + deal.productId}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, deal);
      }
    }
    const deals = Array.from(uniqueMap.values());

    const results = await Promise.all(
      deals.map(async (deal) => {
        let progress: any = null;
        try {
          progress = await this.calculateProgress(deal);
        } catch {}

        const now = new Date();
        const isExpired = deal.commitmentEndsAt
          ? new Date(deal.commitmentEndsAt) < now
          : false;

        return {
          id: deal.id,
          collaboratorId: deal.collaboratorId,
          collaboratorName: deal.collaborator?.fullName || 'Nhà Sáng Tạo',
          collaboratorEmail: deal.collaborator?.email,
          collaboratorAvatar: deal.collaborator?.collaboratorProfile?.avatarUrl,
          collaboratorTier:
            deal.collaborator?.collaboratorProfile?.tier?.name || 'KOL VIP',
          primaryChannel: deal.collaborator?.socialChannels?.[0] || null,
          productId: deal.productId,
          productTitle: deal.product?.title,
          productImage: deal.product?.imageUrl,
          productPrice: Number(deal.product?.price || 0),
          dealCommissionRate: Number(
            deal.approvedCommissionRate || deal.proposedCommissionRate || 10,
          ),
          publicCommissionRate: 10,
          targetOrders: deal.targetOrders || 0,
          targetRevenue: deal.targetRevenue == null ? null : Number(deal.targetRevenue),
          scopeType: deal.scopeType,
          commitmentDays: deal.commitmentDays || 30,
          commitmentEndsAt: deal.commitmentEndsAt,
          isExpired,
          progress: progress || {
            completedOrders: 0,
            pendingOrders: 0,
            validRevenue: 0,
            targetOrders: deal.targetOrders || 0,
            status: isExpired ? 'EXPIRED' : 'IN_PROGRESS',
            percentComplete: 0,
          },
          referralLink: deal.referralLink
            ? {
                shortCode: deal.referralLink.shortCode,
                totalClicks: deal.referralLink.totalClicks,
                totalOrders: deal.referralLink.totalOrders,
              }
            : null,
        };
      }),
    );

    const output = {
      success: true,
      totalPartners: new Set(results.map((r) => r.collaboratorId)).size,
      totalActiveDeals: results.filter((r) => !r.isExpired).length,
      averageCommissionRate:
        results.length > 0
          ? Math.round(
              results.reduce((sum, r) => sum + r.dealCommissionRate, 0) /
                results.length,
            )
          : 10,
      deals: results,
    };

    await this.cache.set(cacheKey, output, 45);
    return output;
  }

  async createProposal(collaboratorId: string, dto: CreateExclusiveDealDto) {
    return this.createPendingProposal(collaboratorId, dto);
  }

  async inviteShopOffer(
    userId: string,
    role: UserRole,
    dto: InviteExclusiveDealDto,
  ) {
    if (role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException(
        'Chỉ quản lý gian hàng được gửi đề nghị VIP.',
      );
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false },
      select: { storeId: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    await this.assertStoreAccess(product.storeId, userId, role);
    return this.createPendingProposal(
      dto.collaboratorId,
      dto,
      userId,
      couponTerms(dto.couponTerms),
    );
  }

  private async createPendingProposal(
    collaboratorId: string,
    dto: CreateExclusiveDealDto,
    initiatedById?: string,
    terms?: ApproveExclusiveDealDto,
  ) {
    return createDealProposal(this.prisma, this.chatGateway, collaboratorId, dto, initiatedById, terms);
  }

  private decisionDependencies() {
    return {
      prisma: this.prisma,
      referralLinks: this.referralLinksService,
      chatGateway: this.chatGateway,
      cache: this.cache,
      voucherCode: (id: string, name: string, discount: number) =>
        this.vipVoucherCode(id, name, discount),
    };
  }

  async approveProposal(
    proposalId: string,
    userId: string,
    role: UserRole,
    dto: ApproveExclusiveDealDto = new ApproveExclusiveDealDto(),
  ) {
    return decideExclusiveDeal(
      this.decisionDependencies(),
      proposalId,
      userId,
      role,
      true,
      dto,
    );
  }

  async rejectProposal(
    proposalId: string,
    userId: string,
    role: UserRole,
    reason?: string,
  ) {
    return decideExclusiveDeal(
      this.decisionDependencies(),
      proposalId,
      userId,
      role,
      false,
      {},
      reason,
    );
  }

  async respondToOffer(
    proposalId: string,
    collaboratorId: string,
    accept: boolean,
    reason?: string,
  ) {
    return decideExclusiveDeal(
      this.decisionDependencies(),
      proposalId,
      collaboratorId,
      UserRole.COLLABORATOR,
      accept,
      {},
      reason,
    );
  }

  async listExceptions(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN) throw new ForbiddenException('Chỉ Admin được xem hàng đợi ngoại lệ.');
    return this.prisma.exclusiveDealProposal.findMany({ where: { status: 'PENDING_ADMIN_APPROVAL', closedAt: null }, include: { store: { select: { name: true } }, collaborator: { select: { fullName: true } }, product: { select: { title: true } }, scopeProducts: { include: { product: { select: { title: true } } } } }, orderBy: { recipientAcceptedAt: 'asc' }, take: 200 });
  }

  async reviewException(id: string, actorId: string, role: UserRole, approve: boolean, note: string) {
    return decideExclusiveDeal(this.decisionDependencies(), id, actorId, role, approve, {}, note, true);
  }

  async getMyDealStatus(collaboratorId: string) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId: collaboratorId },
      select: {
        sampleRequestsBlockedAt: true,
        sampleRequestsBlockReason: true,
        socialLinksJson: true,
      },
    });

    const meta = (profile?.socialLinksJson as any) || {};
    const dealViolations = meta.dealViolations || null;
    const cooldownUntil = dealViolations?.cooldownUntil
      ? new Date(dealViolations.cooldownUntil)
      : null;
    const now = new Date();
    const isBlocked = Boolean(cooldownUntil && cooldownUntil > now);
    const remainingDays = isBlocked
      ? Math.max(
          1,
          Math.ceil(
            (cooldownUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      isBlocked,
      violationsCount: Number(dealViolations?.count || 0),
      cooldownUntil: isBlocked ? cooldownUntil?.toISOString() : null,
      remainingDays,
      reason: dealViolations?.lastViolationReason || null,
      sampleRequestsBlocked: Boolean(profile?.sampleRequestsBlockedAt),
      sampleRequestsBlockReason: profile?.sampleRequestsBlockReason || null,
    };
  }

  async terminateDeal(
    proposalId: string,
    userId: string,
    role: UserRole,
    dto: TerminateExclusiveDealDto,
  ) {
    const proposal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id: proposalId },
      include: {
        store: { select: { id: true, ownerId: true, name: true } },
        product: { select: { id: true, title: true } },
        referralLink: {
          select: { id: true, shortCode: true, customCouponCode: true },
        },
      },
    });
    if (!proposal)
      throw new NotFoundException('Không tìm thấy deal độc quyền.');
    await this.assertStoreAccess(proposal.storeId, userId, role);

    if (proposal.status !== ExclusiveDealStatus.APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể kết thúc hoặc chế tài deal đang ở trạng thái đã duyệt.',
      );
    }

    if (proposal.closedAt)
      throw new BadRequestException('Deal đã được đóng trước đó.');
    const progress = await this.calculateProgress(proposal);
    if (!progress.canTerminate)
      throw new BadRequestException(
        'Chưa thể chế tài: Deal chưa hết kỳ đối soát, đã đạt KPI hoặc là Deal cũ chưa có KPI cấu trúc.',
      );

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Serialize competing sanctions for the same collaborator, including different deals.
        await tx.$queryRaw`SELECT id FROM collaborator_profiles WHERE user_id = ${proposal.collaboratorId}::uuid FOR UPDATE`;
        const fresh = await tx.exclusiveDealProposal.findUnique({
          where: { id: proposalId },
        });
        if (!fresh || fresh.closedAt)
          throw new BadRequestException('Deal đã được đóng trước đó.');
        const finalProgress = await this.calculateProgress(fresh, tx);
        if (!finalProgress.canTerminate)
          throw new BadRequestException(
            'Kết quả KPI đã thay đổi. Vui lòng tải lại.',
          );
        const claimed = await tx.exclusiveDealProposal.updateMany({
          where: {
            id: proposalId,
            closedAt: null,
            status: ExclusiveDealStatus.APPROVED,
          },
          data: {
            closedAt: new Date(),
            shopResponse: `[ĐÃ ĐÓNG DEAL / CHẾ TÀI]: ${dto.reason}`,
          },
        });
        if (claimed.count !== 1)
          throw new BadRequestException('Deal vừa được xử lý ở nơi khác.');

        if (proposal.scopeType && proposal.scopeType !== 'SINGLE_PRODUCT') await tx.referralLink.updateMany({ where: { dealResource: { proposalId } }, data: { status: 'BLOCKED', disabledBy: userId, disabledAt: new Date(), disabledReason: dto.reason } });
        // Deactivate VIP referral link so future orders revert to standard public rate
        if (proposal.referralLink?.id) {
          await tx.referralLink.update({
            where: { id: proposal.referralLink.id },
            data: {
              status: 'BLOCKED' as any,
              disabledReason: `Chủ Shop đóng deal độc quyền do không đạt cam kết: ${dto.reason}`,
              disabledBy: userId,
              disabledAt: new Date(),
            },
          });
        }

        if (proposal.referralLink?.customCouponCode)
          await tx.coupon.updateMany({
            where: {
              codeNormalized: proposal.referralLink.customCouponCode,
              storeId: proposal.storeId,
              status: CouponStatus.ACTIVE,
            },
            data: { status: CouponStatus.PAUSED },
          });

        // Update collaborator penalty level according to SCANMS 4-level sanction policy
        const profile = await tx.collaboratorProfile.findUnique({
          where: { userId: proposal.collaboratorId },
          select: {
            id: true,
            socialLinksJson: true,
            sampleRequestsBlockedAt: true,
          },
        });
        if (!profile?.id)
          throw new BadRequestException(
            'Thiếu hồ sơ KOL để ghi nhận kết quả xem xét. Chưa áp dụng chế tài.',
          );

        const meta = (profile?.socialLinksJson as any) || {};
        const prevCount = Number(meta.dealViolations?.count || 0);
        const newCount = prevCount + 1;
        // Level 3 sanctions: 1 week (1st), 2 weeks (2nd), 3 weeks (3rd), 4 weeks (4th+)
        const cooldownWeeks = Math.min(newCount, 4);
        const cooldownDays = cooldownWeeks * 7;
        const cooldownUntil = new Date(
          Date.now() + cooldownDays * 24 * 60 * 60 * 1000,
        );

        meta.dealViolations = {
          count: newCount,
          cooldownUntil: cooldownUntil.toISOString(),
          lastViolationReason: dto.reason,
          lastViolatedAt: new Date().toISOString(),
        };

        const updateData: any = {
          socialLinksJson: meta,
        };

        // Sample privileges are managed separately by an explicit Admin decision.

        if (profile?.id) {
          await tx.collaboratorProfile.update({
            where: { id: profile.id },
            data: updateData,
          });
        }

        // Append decision message in chat
        const card = {
          type: 'EXCLUSIVE_DEAL_TERMINATION',
          proposalId,
          productTitle: proposal.product.title,
          status: 'TERMINATED',
          reason: dto.reason,
          violationsCount: newCount,
          cooldownWeeks,
          cooldownUntil: cooldownUntil.toLocaleDateString('vi-VN'),
          sampleRequestsBlocked: Boolean(profile?.sampleRequestsBlockedAt),
          escalatedDispute: Boolean(dto.escalateDispute),
          message: `Chủ Shop đã đóng deal độc quyền do không đạt cam kết (${dto.reason}). Hoa hồng các đơn hàng mới quay về mức tiêu chuẩn. Hệ thống áp dụng chế tài: Tạm khóa quyền xin deal ${cooldownWeeks} tuần. Vi phạm hàng mẫu cần được báo cáo riêng để Admin xét duyệt.`,
          decidedAt: new Date().toISOString(),
        };

        const chatMessage = await tx.chatMessage.create({
          data: {
            conversationId: proposal.conversationId,
            senderId: userId,
            messageText: JSON.stringify(card),
          },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        });
        await tx.conversation.update({
          where: { id: proposal.conversationId },
          data: { lastMessageAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'EXCLUSIVE_DEAL_KPI_TERMINATED',
            details: {
              proposalId,
              reason: dto.reason,
              progress: JSON.parse(JSON.stringify(finalProgress)),
              violationsCount: newCount,
            },
          },
        });

        return {
          success: true,
          chatMessage,
          dealId: proposalId,
          violationsCount: newCount,
          cooldownWeeks,
          cooldownUntil: cooldownUntil.toISOString(),
          sampleRequestsBlocked: Boolean(profile?.sampleRequestsBlockedAt),
        };
      },
      { timeout: 15000 },
    );
    this.chatGateway.broadcastNewMessage(
      proposal.conversationId,
      result.chatMessage,
      proposal.collaboratorId,
    );
    const { chatMessage: _message, ...response } = result;
    await this.cache.delPrefix('affiliate:deals:active_partners:');
    return response;
  }

  async deleteProposal(proposalId: string, userId: string, role: UserRole) {
    const proposal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id: proposalId },
      include: {
        referralLink: { select: { id: true } },
        store: { select: { id: true, ownerId: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Không tìm thấy đề xuất Exclusive Deal.');
    }

    const isOwner = proposal.collaboratorId === userId;
    if (!isOwner) await this.assertStoreAccess(proposal.storeId, userId, role);
    if (proposal.status === ExclusiveDealStatus.APPROVED || proposal.closedAt) {
      throw new BadRequestException(
        'Không thể xoá lịch sử Deal đã duyệt. Dùng quy trình xem xét KPI để kết thúc Deal.',
      );
    }

    await this.prisma.$transaction(async tx => {
      await lockDealPair(tx, proposal.collaboratorId, 'store:' + proposal.storeId);
      const fresh = await tx.exclusiveDealProposal.findUniqueOrThrow({ where: { id: proposalId } });
      if (fresh.status === 'APPROVED' || fresh.closedAt) throw new BadRequestException('Approved agreements must retain their audit history.');
      await tx.exclusiveDealProposal.update({ where: { id: proposalId }, data: { status: 'REJECTED', closedAt: new Date(), shopResponse: 'Withdrawn by participant' } });
      await tx.auditLog.create({ data: { userId, action: 'EXCLUSIVE_DEAL_WITHDRAWN', details: { proposalId } } });
    });

    return {
      success: true,
      message: 'Đã xóa đề xuất Exclusive Deal thành công.',
      deletedId: proposalId,
    };
  }

  private async appendDecisionMessage(
    conversationId: string,
    senderId: string,
    recipientId: string,
    card: Record<string, unknown>,
  ) {
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId,
          messageText: JSON.stringify(card),
        },
        include: {
          sender: { select: { id: true, fullName: true, role: true } },
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      return created;
    });
    this.chatGateway.broadcastNewMessage(conversationId, message, recipientId);
  }
}

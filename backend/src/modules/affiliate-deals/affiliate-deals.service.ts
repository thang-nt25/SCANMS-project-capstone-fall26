import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExclusiveDealStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { CreateExclusiveDealDto } from './dto/create-exclusive-deal.dto';
import { TerminateExclusiveDealDto } from './dto/terminate-exclusive-deal.dto';

@Injectable()
export class AffiliateDealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly referralLinksService: ReferralLinksService,
  ) {}

  private isSystemReviewer(role: UserRole) {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;
  }

  private async assertStoreAccess(
    storeId: string,
    userId: string,
    role: UserRole,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, ownerId: true, name: true, deletedAt: true },
    });
    if (!store || store.deletedAt) {
      throw new NotFoundException('Không tìm thấy cửa hàng hoạt động.');
    }
    if (!this.isSystemReviewer(role) && store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xử lý đề xuất của Shop này.',
      );
    }
    return store;
  }

  private async getCurrentApprovedDeals(
    pairs: Array<{ collaboratorId: string; productId: string }>,
  ) {
    const uniquePairs = Array.from(
      new Map(
        pairs.map((pair) => [`${pair.collaboratorId}:${pair.productId}`, pair]),
      ).values(),
    );
    if (!uniquePairs.length) return new Map<string, any>();

    const deals = await this.prisma.exclusiveDealProposal.findMany({
      where: { status: ExclusiveDealStatus.APPROVED, OR: uniquePairs },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        collaboratorId: true,
        productId: true,
        approvedCommissionRate: true,
      },
    });
    const currentDeals = new Map<string, any>();
    for (const deal of deals) {
      const key = `${deal.collaboratorId}:${deal.productId}`;
      if (!currentDeals.has(key)) currentDeals.set(key, deal);
    }
    return currentDeals;
  }

  async getMyProposals(collaboratorId: string) {
    const proposals = await this.prisma.exclusiveDealProposal.findMany({
      where: { collaboratorId },
      include: {
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
        referralLink: { select: { id: true, shortCode: true, status: true } },
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
      proposedCommissionRate: Number(proposal.proposedCommissionRate),
      approvedCommissionRate:
        proposal.approvedCommissionRate === null
          ? null
          : Number(proposal.approvedCommissionRate),
      publicCommissionRate:
        proposal.product.customCommissionRate === null
          ? Number(proposal.store.defaultCommissionRate)
          : Number(proposal.product.customCommissionRate),
      shortUrl: proposal.referralLink
        ? `${process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/r/${proposal.referralLink.shortCode}`
        : null,
      isCurrentDeal:
        proposal.status === ExclusiveDealStatus.APPROVED &&
        currentDeals.get(`${collaboratorId}:${proposal.productId}`)?.id ===
          proposal.id,
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
      where: this.isSystemReviewer(role) ? {} : { store: { ownerId: userId } },
      include: {
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
        referralLink: { select: { id: true, shortCode: true, status: true } },
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
      proposedCommissionRate: Number(proposal.proposedCommissionRate),
      approvedCommissionRate:
        proposal.approvedCommissionRate === null
          ? null
          : Number(proposal.approvedCommissionRate),
      publicCommissionRate:
        proposal.product.customCommissionRate === null
          ? Number(proposal.store.defaultCommissionRate)
          : Number(proposal.product.customCommissionRate),
      isCurrentDeal:
        proposal.status === ExclusiveDealStatus.APPROVED &&
        currentDeals.get(`${proposal.collaboratorId}:${proposal.productId}`)
          ?.id === proposal.id,
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

  async createProposal(collaboratorId: string, dto: CreateExclusiveDealDto) {
    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: { collaboratorProfile: true },
    });
    if (
      !collaborator ||
      !collaborator.isActive ||
      collaborator.deletedAt ||
      collaborator.role !== UserRole.COLLABORATOR
    ) {
      throw new ForbiddenException(
        'Tài khoản KOL không đủ điều kiện gửi đề xuất.',
      );
    }
    if (collaborator.collaboratorProfile?.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException(
        'KOL cần xác thực KYC trước khi gửi đề xuất deal.',
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, moderationStatus: 'APPROVED' },
      include: { store: true },
    });
    if (
      !product ||
      product.deletedAt ||
      !product.isActive ||
      !product.isAffiliateEnabled ||
      !product.store ||
      product.store.deletedAt ||
      !product.store.isActive
    ) {
      throw new BadRequestException(
        'Sản phẩm hiện không nhận tiếp thị liên kết.',
      );
    }

    const publicRate =
      product.customCommissionRate === null
        ? Number(product.store.defaultCommissionRate)
        : Number(product.customCommissionRate);
    const proposedRate = Number(dto.proposedCommissionRate);
    if (
      !Number.isFinite(proposedRate) ||
      proposedRate <= 0 ||
      proposedRate > 100
    ) {
      throw new BadRequestException(
        'M\u1ee9c hoa h\u1ed3ng \u0111\u1ec1 xu\u1ea5t ph\u1ea3i l\u1edbn h\u01a1n 0% v\u00e0 kh\u00f4ng v\u01b0\u1ee3t qu\u00e1 100%.',
      );
    }

    const salesCommitment = dto.salesCommitment.trim();
    if (salesCommitment.length < 5) {
      throw new BadRequestException('Hãy mô tả cam kết doanh số rõ hơn.');
    }

    const dealStatus = await this.getMyDealStatus(collaboratorId);
    if (dealStatus.isBlocked) {
      throw new BadRequestException(
        `Bạn đang trong thời gian chế tài vi phạm cam kết (Lần ${dealStatus.violationsCount} - Khóa quyền xin deal còn ${dealStatus.remainingDays} ngày, đến ${new Date(dealStatus.cooldownUntil!).toLocaleDateString('vi-VN')}). Vui lòng hoàn thành cam kết trước đó.`,
      );
    }

    const [pendingProposal, currentDeal] = await Promise.all([
      this.prisma.exclusiveDealProposal.findFirst({
        where: {
          collaboratorId,
          productId: product.id,
          status: ExclusiveDealStatus.PENDING,
        },
        select: { id: true },
      }),
      this.prisma.exclusiveDealProposal.findFirst({
        where: {
          collaboratorId,
          productId: product.id,
          status: ExclusiveDealStatus.APPROVED,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, approvedCommissionRate: true },
      }),
    ]);
    if (pendingProposal) {
      throw new BadRequestException(
        'B\u1ea1n \u0111\u00e3 c\u00f3 \u0111\u1ec1 xu\u1ea5t \u0111ang ch\u1edd Shop ph\u1ea3n h\u1ed3i cho s\u1ea3n ph\u1ea9m n\u00e0y.',
      );
    }

    const currentRate =
      currentDeal?.approvedCommissionRate == null
        ? null
        : Number(currentDeal.approvedCommissionRate);
    const minimumExistingRate = Math.max(publicRate, currentRate ?? 0);
    if (proposedRate <= minimumExistingRate) {
      throw new BadRequestException(
        currentRate === null
          ? 'M\u1ee9c \u0111\u1ec1 xu\u1ea5t ph\u1ea3i cao h\u01a1n Open Offer hi\u1ec7n t\u1ea1i (' +
              publicRate +
              '%).'
          : 'M\u1ee9c \u0111\u1ec1 xu\u1ea5t ph\u1ea3i cao h\u01a1n Open Offer (' +
              publicRate +
              '%) v\u00e0 deal VIP \u0111ang \u00e1p d\u1ee5ng (' +
              currentRate +
              '%).',
      );
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: { storeId: product.storeId, collaboratorId },
      select: { id: true },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { storeId: product.storeId, collaboratorId },
        select: { id: true },
      });
    }

    const card = {
      type: 'EXCLUSIVE_DEAL_PROPOSAL',
      proposalId: '',
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl,
      storeId: product.storeId,
      storeName: product.store.name,
      publicCommissionRate: publicRate,
      currentCommissionRate: currentRate,
      isRevision: currentRate !== null,
      proposedCommissionRate: proposedRate,
      salesCommitment,
      status: ExclusiveDealStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    let result: any;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const proposal = await tx.exclusiveDealProposal.create({
          data: {
            collaboratorId,
            storeId: product.storeId,
            productId: product.id,
            conversationId: conversation.id,
            proposedCommissionRate: new Prisma.Decimal(proposedRate),
            salesCommitment,
          },
          include: {
            product: {
              select: { id: true, title: true, imageUrl: true, price: true },
            },
            store: { select: { id: true, name: true } },
          },
        });
        const chatMessage = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: collaboratorId,
            messageText: JSON.stringify({ ...card, proposalId: proposal.id }),
          },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
        return { proposal, chatMessage };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Bạn đã có đề xuất đang chờ hoặc deal đang hoạt động cho sản phẩm này.',
        );
      }
      throw error;
    }

    this.chatGateway.broadcastNewMessage(
      conversation.id,
      result.chatMessage,
      product.store.ownerId,
    );
    return {
      ...result.proposal,
      proposedCommissionRate: Number(result.proposal.proposedCommissionRate),
      conversationId: conversation.id,
    };
  }

  async approveProposal(proposalId: string, userId: string, role: UserRole) {
    const proposal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id: proposalId },
      include: {
        store: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            defaultCommissionRate: true,
          },
        },
        product: {
          select: { id: true, title: true, customCommissionRate: true },
        },
        referralLink: { select: { id: true, shortCode: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất deal.');
    await this.assertStoreAccess(proposal.storeId, userId, role);
    if (
      proposal.status === ExclusiveDealStatus.APPROVED &&
      proposal.referralLink
    ) {
      return {
        ...proposal,
        shortUrl: `${process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/r/${proposal.referralLink.shortCode}`,
      };
    }
    if (proposal.status !== ExclusiveDealStatus.PENDING) {
      throw new BadRequestException('Đề xuất này đã được xử lý trước đó.');
    }

    const currentPublicRate =
      proposal.product.customCommissionRate === null
        ? Number(proposal.store.defaultCommissionRate)
        : Number(proposal.product.customCommissionRate);
    const currentDeal = await this.prisma.exclusiveDealProposal.findFirst({
      where: {
        collaboratorId: proposal.collaboratorId,
        productId: proposal.productId,
        status: ExclusiveDealStatus.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, approvedCommissionRate: true },
    });
    const currentRate =
      currentDeal?.approvedCommissionRate == null
        ? null
        : Number(currentDeal.approvedCommissionRate);
    const minimumExistingRate = Math.max(currentPublicRate, currentRate ?? 0);
    if (Number(proposal.proposedCommissionRate) <= minimumExistingRate) {
      throw new BadRequestException(
        currentRate === null
          ? 'M\u1ee9c \u0111\u1ec1 xu\u1ea5t hi\u1ec7n kh\u00f4ng c\u00f2n cao h\u01a1n Open Offer (' +
              currentPublicRate +
              '%). H\u00e3y trao \u0111\u1ed5i l\u1ea1i v\u1edbi KOL.'
          : 'M\u1ee9c \u0111\u1ec1 xu\u1ea5t ph\u1ea3i cao h\u01a1n Open Offer (' +
              currentPublicRate +
              '%) v\u00e0 deal VIP \u0111ang \u00e1p d\u1ee5ng (' +
              currentRate +
              '%).',
      );
    }

    const claimed = await this.prisma.exclusiveDealProposal.updateMany({
      where: { id: proposalId, status: ExclusiveDealStatus.PENDING },
      data: {
        status: ExclusiveDealStatus.APPROVED,
        approvedCommissionRate: proposal.proposedCommissionRate,
        reviewerId: userId,
        reviewedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException(
        'Đề xuất vừa được xử lý ở nơi khác. Tải lại Chat.',
      );
    }

    let link: any;
    try {
      link = await this.referralLinksService.createReferralLink(
        proposal.collaboratorId,
        {
          productId: proposal.productId,
          exclusiveDealId: proposal.id,
          channel: 'TIKTOK',
          label: `Exclusive Deal: ${proposal.product.title}`,
        },
      );
    } catch (error) {
      await this.prisma.exclusiveDealProposal.updateMany({
        where: { id: proposalId, status: ExclusiveDealStatus.APPROVED },
        data: {
          status: ExclusiveDealStatus.PENDING,
          approvedCommissionRate: null,
          reviewerId: null,
          reviewedAt: null,
        },
      });
      throw error;
    }

    const card = {
      type: 'EXCLUSIVE_DEAL_DECISION',
      proposalId,
      productTitle: proposal.product.title,
      status: ExclusiveDealStatus.APPROVED,
      previousCommissionRate: currentRate,
      approvedCommissionRate: Number(proposal.proposedCommissionRate),
      message:
        currentRate === null
          ? 'M\u1ee9c VIP \u0111\u00e3 \u0111\u01b0\u1ee3c \u00e1p d\u1ee5ng cho \u0111\u01a1n h\u00e0ng m\u1edbi. Hoa h\u1ed3ng c\u1ee7a \u0111\u01a1n \u0111\u00e3 t\u1ea1o tr\u01b0\u1edbc \u0111\u00f3 \u0111\u01b0\u1ee3c gi\u1eef nguy\u00ean.'
          : 'M\u1ee9c VIP \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt t\u1eeb ' +
            currentRate +
            '% l\u00ean ' +
            Number(proposal.proposedCommissionRate) +
            '% cho \u0111\u01a1n h\u00e0ng m\u1edbi. Hoa h\u1ed3ng c\u1ee7a \u0111\u01a1n \u0111\u00e3 t\u1ea1o tr\u01b0\u1edbc \u0111\u00f3 \u0111\u01b0\u1ee3c gi\u1eef nguy\u00ean.',
      shortUrl: link.shortUrl,
      shortCode: link.shortCode,
      decidedAt: new Date().toISOString(),
    };
    await this.appendDecisionMessage(
      proposal.conversationId,
      userId,
      proposal.collaboratorId,
      card,
    );
    return {
      ...link,
      approvedCommissionRate: Number(proposal.proposedCommissionRate),
    };
  }

  async rejectProposal(
    proposalId: string,
    userId: string,
    role: UserRole,
    reason?: string,
  ) {
    const proposal = await this.prisma.exclusiveDealProposal.findUnique({
      where: { id: proposalId },
      include: {
        store: { select: { id: true } },
        product: { select: { title: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Không tìm thấy đề xuất deal.');
    await this.assertStoreAccess(proposal.storeId, userId, role);
    if (proposal.status !== ExclusiveDealStatus.PENDING) {
      throw new BadRequestException('Chỉ đề xuất đang chờ mới có thể từ chối.');
    }

    const response = reason?.trim() || null;
    const updated = await this.prisma.exclusiveDealProposal.updateMany({
      where: { id: proposalId, status: ExclusiveDealStatus.PENDING },
      data: {
        status: ExclusiveDealStatus.REJECTED,
        shopResponse: response,
        reviewerId: userId,
        reviewedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new BadRequestException(
        'Đề xuất vừa được xử lý ở nơi khác. Tải lại Chat.',
      );
    }

    await this.appendDecisionMessage(
      proposal.conversationId,
      userId,
      proposal.collaboratorId,
      {
        type: 'EXCLUSIVE_DEAL_DECISION',
        proposalId,
        productTitle: proposal.product.title,
        status: ExclusiveDealStatus.REJECTED,
        shopResponse: response,
        decidedAt: new Date().toISOString(),
      },
    );
    return {
      id: proposalId,
      status: ExclusiveDealStatus.REJECTED,
      shopResponse: response,
    };
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
        referralLink: { select: { id: true, shortCode: true } },
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

    // Deactivate VIP referral link so future orders revert to standard public rate
    if (proposal.referralLink?.id) {
      await this.prisma.referralLink.update({
        where: { id: proposal.referralLink.id },
        data: {
          status: 'BLOCKED' as any,
          disabledReason: `Chủ Shop đóng deal độc quyền do không đạt cam kết: ${dto.reason}`,
          disabledBy: userId,
          disabledAt: new Date(),
        },
      });
    }

    // Update proposal record
    await this.prisma.exclusiveDealProposal.update({
      where: { id: proposalId },
      data: {
        shopResponse: `[ĐÃ ĐÓNG DEAL / CHẾ TÀI]: ${dto.reason}`,
      },
    });

    // Update collaborator penalty level according to SCANMS 4-level sanction policy
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId: proposal.collaboratorId },
      select: { id: true, socialLinksJson: true },
    });

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

    // Level 3 (4th violation) or Level 4 dispute escalation locks sample requests quota to 0
    if (newCount >= 4 || dto.escalateDispute) {
      updateData.sampleRequestsBlockedAt = new Date();
      updateData.sampleRequestsBlockReason = `Vi phạm cam kết deal riêng lần ${newCount} (Khóa ${cooldownWeeks} tuần & hạn ngạch mẫu = 0)`;
    }

    if (profile?.id) {
      await this.prisma.collaboratorProfile.update({
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
      sampleRequestsBlocked: newCount >= 4 || Boolean(dto.escalateDispute),
      escalatedDispute: Boolean(dto.escalateDispute),
      message: `Chủ Shop đã đóng deal độc quyền do không đạt cam kết (${dto.reason}). Hoa hồng các đơn hàng mới quay về mức tiêu chuẩn. Hệ thống áp dụng chế tài: Tạm khóa quyền xin deal ${cooldownWeeks} tuần${newCount >= 4 ? ' và khóa hạn ngạch nhận mẫu thử' : ''}.`,
      decidedAt: new Date().toISOString(),
    };

    await this.appendDecisionMessage(
      proposal.conversationId,
      userId,
      proposal.collaboratorId,
      card,
    );

    return {
      success: true,
      dealId: proposalId,
      violationsCount: newCount,
      cooldownWeeks,
      cooldownUntil: cooldownUntil.toISOString(),
      sampleRequestsBlocked: newCount >= 4 || Boolean(dto.escalateDispute),
    };
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
    const isShopOwner = proposal.store.ownerId === userId;
    const isSysAdmin = this.isSystemReviewer(role);

    if (!isOwner && !isShopOwner && !isSysAdmin) {
      throw new ForbiddenException('Bạn không có quyền xóa đề xuất deal này.');
    }

    // Detach referral link so it reverts to standard public commission
    if (proposal.referralLink?.id) {
      await this.prisma.referralLink.update({
        where: { id: proposal.referralLink.id },
        data: {
          exclusiveDealId: null,
        },
      });
    }

    await this.prisma.exclusiveDealProposal.delete({
      where: { id: proposalId },
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

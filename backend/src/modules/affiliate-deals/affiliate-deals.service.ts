import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExclusiveDealStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { CreateExclusiveDealDto } from './dto/create-exclusive-deal.dto';

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
      throw new ForbiddenException('Bạn không có quyền xử lý đề xuất của Shop này.');
    }
    return store;
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
          select: { id: true, name: true, logoUrl: true, defaultCommissionRate: true },
        },
        referralLink: { select: { id: true, shortCode: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
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
    }));
  }

  async getShopProposals(userId: string, role: UserRole) {
    const proposals = await this.prisma.exclusiveDealProposal.findMany({
      where: this.isSystemReviewer(role)
        ? {}
        : { store: { ownerId: userId } },
      include: {
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            collaboratorProfile: { select: { avatarUrl: true, kycStatus: true } },
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
        store: { select: { id: true, name: true, defaultCommissionRate: true } },
        referralLink: { select: { id: true, shortCode: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
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
      throw new ForbiddenException('Tài khoản KOL không đủ điều kiện gửi đề xuất.');
    }
    if (collaborator.collaboratorProfile?.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException('KOL cần xác thực KYC trước khi gửi đề xuất deal.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
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
      throw new BadRequestException('Sản phẩm hiện không nhận tiếp thị liên kết.');
    }

    const publicRate =
      product.customCommissionRate === null
        ? Number(product.store.defaultCommissionRate)
        : Number(product.customCommissionRate);
    const proposedRate = Number(dto.proposedCommissionRate);
    if (!Number.isFinite(proposedRate) || proposedRate <= publicRate || proposedRate > 100) {
      throw new BadRequestException(
        `Mức đề xuất phải cao hơn Open Offer hiện tại (${publicRate}%) và không vượt quá 100%.`,
      );
    }

    const salesCommitment = dto.salesCommitment.trim();
    if (salesCommitment.length < 5) {
      throw new BadRequestException('Hãy mô tả cam kết doanh số rõ hơn.');
    }

    const existing = await this.prisma.exclusiveDealProposal.findFirst({
      where: {
        collaboratorId,
        productId: product.id,
        status: { in: [ExclusiveDealStatus.PENDING, ExclusiveDealStatus.APPROVED] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === ExclusiveDealStatus.PENDING
          ? 'Bạn đã có đề xuất đang chờ Shop phản hồi cho sản phẩm này.'
          : 'Bạn đã có deal riêng đang hoạt động cho sản phẩm này.',
      );
    }

    // Không dùng ChatService.getOrCreateConversation ở đây: hàm đó tự duyệt quan hệ
    // StoreCollaborator, còn Open Offer/deal không cần Shop duyệt quan hệ đối tác.
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
            conversationId: conversation!.id,
            proposedCommissionRate: new Prisma.Decimal(proposedRate),
            salesCommitment,
          },
          include: {
            product: { select: { id: true, title: true, imageUrl: true, price: true } },
            store: { select: { id: true, name: true } },
          },
        });
        const chatMessage = await tx.chatMessage.create({
          data: {
            conversationId: conversation!.id,
            senderId: collaboratorId,
            messageText: JSON.stringify({ ...card, proposalId: proposal.id }),
          },
          include: {
            sender: { select: { id: true, fullName: true, role: true } },
          },
        });
        await tx.conversation.update({
          where: { id: conversation!.id },
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
    if (proposal.status === ExclusiveDealStatus.APPROVED && proposal.referralLink) {
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
    if (Number(proposal.proposedCommissionRate) <= currentPublicRate) {
      throw new BadRequestException(
        `Mức Open Offer hiện tại đã là ${currentPublicRate}%. Hãy từ chối đề xuất cũ và trao đổi lại mức VIP với KOL.`,
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
      throw new BadRequestException('Đề xuất vừa được xử lý ở nơi khác. Tải lại Chat.');
    }

    let link: any;
    try {
      link = await this.referralLinksService.createReferralLink(
        proposal.collaboratorId,
        {
          productId: proposal.productId,
          exclusiveDealId: proposal.id,
          channel: 'TIKTOK' as any,
          label: `Exclusive Deal: ${proposal.product.title}`,
        } as any,
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
      approvedCommissionRate: Number(proposal.proposedCommissionRate),
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
    return { ...link, approvedCommissionRate: Number(proposal.proposedCommissionRate) };
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
      throw new BadRequestException('Đề xuất vừa được xử lý ở nơi khác. Tải lại Chat.');
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
    return { id: proposalId, status: ExclusiveDealStatus.REJECTED, shopResponse: response };
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

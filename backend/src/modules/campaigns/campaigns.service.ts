import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Optional,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateCampaignDto, InviteCollaboratorDto, InviteInChatDto } from './dto/campaign.dto';
import { CampaignParticipantStatus } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
  ) {}

  // ─── Shop: Tạo chiến dịch mới ────────────────────────────────────────
  async createCampaign(userId: string, dto: CreateCampaignDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId, isDeleted: false },
    });
    if (!store) {
      throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng nào.');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu hoặc kết thúc không hợp lệ.');
    }

    if (end <= start) {
      throw new BadRequestException('Thời điểm kết thúc phải diễn ra sau thời điểm bắt đầu.');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        storeId: store.id,
        name: dto.name.trim(),
        bonusCommissionRate: dto.bonusCommissionRate,
        startDate: start,
        endDate: end,
        isActive: true,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    // Ghi nhận AuditLog tạo chiến dịch
    await this._createAuditLog(
      userId,
      'CAMPAIGN_CREATED',
      {
        campaignId: campaign.id,
        campaignName: campaign.name,
        storeId: store.id,
        bonusCommissionRate: dto.bonusCommissionRate,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    );

    return campaign;
  }

  // ─── Shop: Lấy danh sách chiến dịch của cửa hàng ─────────────────────
  async getShopCampaigns(userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId, isDeleted: false },
    });
    if (!store) {
      throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng nào.');
    }

    return this.prisma.campaign.findMany({
      where: { storeId: store.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        participants: {
          include: {
            collaborator: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                collaboratorProfile: {
                  select: {
                    avatarUrl: true,
                    bio: true,
                    totalEarnedCommission: true,
                    totalOrdersReferred: true,
                    tier: {
                      select: {
                        name: true,
                        extraBonusPercentage: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Shop: Mời KOL vào chiến dịch (gửi thẻ mời VIP qua chat) ─────────
  async inviteCollaborator(
    userId: string,
    campaignId: string,
    dto: InviteCollaboratorDto,
  ) {
    // 1. Kiểm tra campaign thuộc về shop này
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, store: { ownerId: userId, isDeleted: false } },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Chiến dịch không tồn tại hoặc bạn không có quyền sở hữu.');
    }

    if (!campaign.isActive) {
      throw new BadRequestException('Chiến dịch này đã kết thúc hoặc đang tạm ngừng.');
    }

    const now = new Date();
    if (campaign.endDate && new Date(campaign.endDate) < now) {
      throw new BadRequestException('Chiến dịch này đã hết thời hạn áp dụng.');
    }

    // 2. Kiểm tra collaborator tồn tại & hợp lệ
    const collaborator = await this.prisma.user.findUnique({
      where: {
        id: dto.collaboratorId,
        role: 'COLLABORATOR',
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (!collaborator) {
      throw new NotFoundException('Không tìm thấy thông tin Cộng Tác Viên / KOL hợp lệ.');
    }

    // 3. Kiểm tra trạng thái mời trước đó
    const existing = await this.prisma.campaignParticipant.findUnique({
      where: {
        campaignId_collaboratorId: {
          campaignId,
          collaboratorId: dto.collaboratorId,
        },
      },
    });

    if (existing) {
      if (existing.status === CampaignParticipantStatus.INVITED) {
        throw new BadRequestException('KOL này đã nhận được thẻ mời VIP trước đó và đang chờ phản hồi.');
      }
      if (existing.status === CampaignParticipantStatus.ACCEPTED) {
        throw new BadRequestException('KOL này đã là thành viên chính thức của chiến dịch.');
      }
    }

    // 4. Tạo hoặc cập nhật bản ghi CampaignParticipant với status = INVITED
    const participant = await this.prisma.campaignParticipant.upsert({
      where: {
        campaignId_collaboratorId: {
          campaignId,
          collaboratorId: dto.collaboratorId,
        },
      },
      create: {
        campaignId,
        collaboratorId: dto.collaboratorId,
        status: CampaignParticipantStatus.INVITED,
      },
      update: {
        status: CampaignParticipantStatus.INVITED,
        joinedAt: null,
      },
    });

    // 5. Gửi thẻ mời VIP vào khung chat Socket.io + lưu Database
    const chatMessage = await this._sendCampaignInviteCard(
      userId,
      campaign,
      collaborator,
      participant.id,
      dto.conversationId,
      dto.personalMessage,
    );

    // 6. Ghi AuditLog & Notification
    await this._createAuditLog(
      userId,
      'CAMPAIGN_INVITE_SENT',
      {
        campaignId,
        campaignName: campaign.name,
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.fullName,
        participantId: participant.id,
        bonusCommissionRate: Number(campaign.bonusCommissionRate),
      },
    );

    await this._createNotification(
      collaborator.id,
      `🎯 Lời mời tham gia chiến dịch VIP: ${campaign.name}`,
      `Shop "${campaign.store.name}" vừa gửi thẻ mời VIP tham gia chiến dịch "${campaign.name}" với mức thưởng thêm +${Number(campaign.bonusCommissionRate)}% hoa hồng!`,
      'CAMPAIGN_INVITE',
      {
        campaignId,
        participantId: participant.id,
        storeId: campaign.storeId,
        chatMessageId: chatMessage.id,
      },
    );

    return {
      participant,
      campaign,
      chatMessage,
      message: `Đã gửi thẻ mời VIP chiến dịch "${campaign.name}" tới KOL thành công.`,
    };
  }

  // ─── Shop: Mời trực tiếp từ cuộc hội thoại Chat ──────────────────────
  async inviteInChat(
    userId: string,
    conversationId: string,
    dto: InviteInChatDto,
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        store: true,
        collaborator: true,
      },
    });

    if (!conv) {
      throw new NotFoundException('Cuộc hội thoại không tồn tại.');
    }

    if (conv.store.ownerId !== userId) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu của cửa hàng trong cuộc hội thoại này.');
    }

    return this.inviteCollaborator(userId, dto.campaignId, {
      collaboratorId: conv.collaboratorId,
      conversationId: conv.id,
      personalMessage: dto.personalMessage,
    });
  }

  // ─── Gửi thẻ mời VIP vào khung chat và broadcast Socket.io ────────────
  private async _sendCampaignInviteCard(
    shopUserId: string,
    campaign: any,
    collaborator: any,
    participantId: string,
    presetConversationId?: string,
    personalMessage?: string,
  ) {
    // Tìm hoặc tạo conversation giữa store và KOL
    let conversation = presetConversationId
      ? await this.prisma.conversation.findUnique({ where: { id: presetConversationId } })
      : await this.prisma.conversation.findFirst({
          where: {
            storeId: campaign.storeId,
            collaboratorId: collaborator.id,
          },
        });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          storeId: campaign.storeId,
          collaboratorId: collaborator.id,
        },
      });
    }

    // Cấu trúc payload Thẻ Mời VIP chuẩn định danh
    const cardPayload = JSON.stringify({
      type: 'CAMPAIGN_INVITE',
      participantId,
      campaignId: campaign.id,
      campaignName: campaign.name,
      bonusCommissionRate: Number(campaign.bonusCommissionRate),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      storeId: campaign.storeId,
      storeName: campaign.store?.name || 'Gian hàng đối tác',
      storeLogoUrl: campaign.store?.logoUrl || null,
      personalMessage: personalMessage?.trim() || null,
      invitedAt: new Date().toISOString(),
    });

    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: shopUserId,
        messageText: cardPayload,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Cập nhật timestamp cuộc hội thoại
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Realtime Broadcast qua Socket.io Gateway
    if (this.chatGateway) {
      try {
        this.chatGateway.broadcastNewMessage(
          conversation.id,
          chatMessage,
          collaborator.id,
        );
      } catch (wsErr) {
        this.logger.warn(`Không thể phát WebSocket cho Thẻ Mời VIP: ${wsErr}`);
      }
    }

    return chatMessage;
  }

  // ─── KOL: Lấy danh sách chiến dịch được mời ──────────────────────────
  async getMyInvitations(userId: string) {
    return this.prisma.campaignParticipant.findMany({
      where: { collaboratorId: userId },
      include: {
        campaign: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                defaultCommissionRate: true,
              },
            },
            campaignProducts: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── KOL: Chấp nhận lời mời ──────────────────────────────────────────
  async acceptInvitation(userId: string, participantId: string) {
    const participant = await this.prisma.campaignParticipant.findUnique({
      where: { id: participantId },
      include: {
        campaign: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Không tìm thấy thông tin lời mời chiến dịch.');
    }

    if (participant.collaboratorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xử lý lời mời của người khác.');
    }

    if (participant.status === CampaignParticipantStatus.ACCEPTED) {
      throw new BadRequestException('Bạn đã chấp nhận tham gia chiến dịch này trước đó.');
    }

    if (participant.status === CampaignParticipantStatus.REJECTED) {
      throw new BadRequestException('Lời mời này đã bị từ chối.');
    }

    const updated = await this.prisma.campaignParticipant.update({
      where: { id: participantId },
      data: {
        status: CampaignParticipantStatus.ACCEPTED,
        joinedAt: new Date(),
      },
      include: {
        campaign: {
          include: {
            store: true,
          },
        },
      },
    });

    // Thông báo phản hồi vào khung Chat
    await this._sendAcceptNotice(participant, userId);

    // Ghi AuditLog & Notification
    await this._createAuditLog(
      userId,
      'CAMPAIGN_INVITE_ACCEPTED',
      {
        campaignId: participant.campaignId,
        campaignName: participant.campaign.name,
        participantId: participant.id,
        collaboratorId: userId,
      },
    );

    await this._createNotification(
      participant.campaign.store.ownerId,
      `🎉 KOL đã chấp nhận tham gia chiến dịch: ${participant.campaign.name}`,
      `KOL vừa đồng ý tham gia chiến dịch "${participant.campaign.name}". Hãy chuẩn bị các sản phẩm mẫu và kịch bản để cùng bùng nổ doanh số!`,
      'CAMPAIGN_ACCEPTED',
      {
        campaignId: participant.campaignId,
        participantId: participant.id,
        collaboratorId: userId,
      },
    );

    return updated;
  }

  // ─── KOL: Từ chối lời mời ────────────────────────────────────────────
  async rejectInvitation(userId: string, participantId: string) {
    const participant = await this.prisma.campaignParticipant.findUnique({
      where: { id: participantId },
      include: {
        campaign: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Không tìm thấy thông tin lời mời chiến dịch.');
    }

    if (participant.collaboratorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xử lý lời mời của người khác.');
    }

    if (participant.status === CampaignParticipantStatus.ACCEPTED) {
      throw new BadRequestException('Không thể từ chối chiến dịch mà bạn đã đồng ý tham gia.');
    }

    if (participant.status === CampaignParticipantStatus.REJECTED) {
      throw new BadRequestException('Lời mời này đã ở trạng thái từ chối.');
    }

    const updated = await this.prisma.campaignParticipant.update({
      where: { id: participantId },
      data: {
        status: CampaignParticipantStatus.REJECTED,
      },
      include: {
        campaign: {
          include: {
            store: true,
          },
        },
      },
    });

    // Thông báo phản hồi vào khung Chat
    await this._sendRejectNotice(participant, userId);

    // Ghi AuditLog & Notification
    await this._createAuditLog(
      userId,
      'CAMPAIGN_INVITE_REJECTED',
      {
        campaignId: participant.campaignId,
        campaignName: participant.campaign.name,
        participantId: participant.id,
        collaboratorId: userId,
      },
    );

    await this._createNotification(
      participant.campaign.store.ownerId,
      `ℹ️ KOL từ chối tham gia chiến dịch: ${participant.campaign.name}`,
      `KOL đã từ chối tham gia chiến dịch "${participant.campaign.name}". Bạn có thể gửi lời mời tham gia các chiến dịch phù hợp hơn.`,
      'CAMPAIGN_REJECTED',
      {
        campaignId: participant.campaignId,
        participantId: participant.id,
        collaboratorId: userId,
      },
    );

    return updated;
  }

  // ─── Gửi thông báo KOL đã accept vào chat ────────────────────────────
  private async _sendAcceptNotice(participant: any, kolUserId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        storeId: participant.campaign.storeId,
        collaboratorId: kolUserId,
      },
    });
    if (!conversation) return;

    const cardPayload = JSON.stringify({
      type: 'CAMPAIGN_ACCEPTED',
      participantId: participant.id,
      campaignId: participant.campaignId,
      campaignName: participant.campaign.name,
      acceptedAt: new Date().toISOString(),
    });

    const chatMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: kolUserId,
        messageText: cardPayload,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (this.chatGateway) {
      try {
        this.chatGateway.broadcastNewMessage(
          conversation.id,
          chatMsg,
          participant.campaign.store.ownerId,
        );
      } catch (e) {
        this.logger.warn(`Lỗi phát socket thông báo accept: ${e}`);
      }
    }
  }

  // ─── Gửi thông báo KOL đã reject vào chat ─────────────────────────────
  private async _sendRejectNotice(participant: any, kolUserId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        storeId: participant.campaign.storeId,
        collaboratorId: kolUserId,
      },
    });
    if (!conversation) return;

    const cardPayload = JSON.stringify({
      type: 'CAMPAIGN_REJECTED',
      participantId: participant.id,
      campaignId: participant.campaignId,
      campaignName: participant.campaign.name,
      rejectedAt: new Date().toISOString(),
    });

    const chatMsg = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: kolUserId,
        messageText: cardPayload,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (this.chatGateway) {
      try {
        this.chatGateway.broadcastNewMessage(
          conversation.id,
          chatMsg,
          participant.campaign.store.ownerId,
        );
      } catch (e) {
        this.logger.warn(`Lỗi phát socket thông báo reject: ${e}`);
      }
    }
  }

  // ─── Public: Lấy chi tiết 1 chiến dịch ──────────────────────────────
  async getCampaignDetail(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            defaultCommissionRate: true,
          },
        },
        participants: {
          include: {
            collaborator: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        campaignProducts: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Chiến dịch không tồn tại.');
    return campaign;
  }

  // ─── Helper: Ghi nhật ký kiểm toán hệ thống (AuditLog) ───────────────
  private async _createAuditLog(userId: string, action: string, details: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          details,
        },
      });
    } catch (err) {
      this.logger.warn(`Ghi AuditLog thất bại (bỏ qua an toàn): ${err}`);
    }
  }

  // ─── Helper: Tạo thông báo Notification cho người dùng ───────────────
  private async _createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          data: data || {},
          isRead: false,
        },
      });
    } catch (err) {
      this.logger.warn(`Tạo Notification thất bại (bỏ qua an toàn): ${err}`);
    }
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateCampaignDto, InviteCollaboratorDto } from './dto/campaign.dto';
import { CampaignParticipantStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Shop: Tạo chiến dịch mới ────────────────────────────────────────
  async createCampaign(userId: string, dto: CreateCampaignDto) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId, isDeleted: false },
    });
    if (!store) throw new ForbiddenException('Bạn không có cửa hàng nào.');

    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    return this.prisma.campaign.create({
      data: {
        storeId: store.id,
        name: dto.name,
        bonusCommissionRate: dto.bonusCommissionRate,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: true,
      },
    });
  }

  // ─── Shop: Lấy danh sách chiến dịch của cửa hàng ─────────────────────
  async getShopCampaigns(userId: string) {
    const store = await this.prisma.store.findFirst({
      where: { ownerId: userId, isDeleted: false },
    });
    if (!store) throw new ForbiddenException('Bạn không có cửa hàng nào.');

    return this.prisma.campaign.findMany({
      where: { storeId: store.id },
      include: {
        participants: {
          include: {
            collaborator: {
              select: { id: true, fullName: true, email: true },
            },
          },
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
    // Kiểm tra campaign thuộc về shop này
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, store: { ownerId: userId } },
      include: { store: true },
    });
    if (!campaign)
      throw new NotFoundException(
        'Chiến dịch không tồn tại hoặc bạn không có quyền.',
      );
    if (!campaign.isActive)
      throw new BadRequestException(
        'Chiến dịch đã kết thúc hoặc không còn hoạt động.',
      );

    // Kiểm tra collaborator tồn tại
    const collaborator = await this.prisma.user.findUnique({
      where: {
        id: dto.collaboratorId,
        role: 'COLLABORATOR',
        isActive: true,
        isDeleted: false,
      },
    });
    if (!collaborator) throw new NotFoundException('KOL/CTV không tồn tại.');

    // Kiểm tra đã mời chưa
    const existing = await this.prisma.campaignParticipant.findUnique({
      where: {
        campaignId_collaboratorId: {
          campaignId,
          collaboratorId: dto.collaboratorId,
        },
      },
    });
    if (existing) {
      if (existing.status === 'INVITED')
        throw new BadRequestException('KOL này đã được mời rồi.');
      if (existing.status === 'ACCEPTED')
        throw new BadRequestException('KOL này đã tham gia chiến dịch.');
    }

    // Tạo bản ghi tham gia với status INVITED
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
        status: 'INVITED',
      },
      update: { status: 'INVITED', joinedAt: null },
    });

    // Gửi thẻ mời VIP qua chat (tạo/lấy conversation + gửi chat message đặc biệt)
    await this._sendCampaignInviteCard(userId, campaign, collaborator);

    return { participant, campaign };
  }

  // ─── Gửi thẻ mời VIP vào khung chat ──────────────────────────────────
  private async _sendCampaignInviteCard(
    shopUserId: string,
    campaign: any,
    collaborator: any,
  ) {
    // Tìm hoặc tạo conversation giữa store và KOL
    let conversation = await this.prisma.conversation.findFirst({
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

    // Gửi tin nhắn đặc biệt dạng JSON (thẻ mời VIP)
    const cardPayload = JSON.stringify({
      type: 'CAMPAIGN_INVITE',
      campaignId: campaign.id,
      campaignName: campaign.name,
      bonusCommissionRate: Number(campaign.bonusCommissionRate),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    });

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: shopUserId,
        messageText: cardPayload,
        isRead: false,
      },
    });

    // Cập nhật lastMessageAt của conversation
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // ─── KOL: Lấy danh sách chiến dịch được mời ──────────────────────────
  async getMyInvitations(userId: string) {
    return this.prisma.campaignParticipant.findMany({
      where: { collaboratorId: userId },
      include: {
        campaign: {
          include: {
            store: { select: { id: true, name: true, logoUrl: true } },
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
      include: { campaign: { include: { store: true } } },
    });
    if (!participant) throw new NotFoundException('Lời mời không tồn tại.');
    if (participant.collaboratorId !== userId)
      throw new ForbiddenException('Đây không phải lời mời của bạn.');
    if (participant.status !== 'INVITED')
      throw new BadRequestException('Lời mời này đã được xử lý rồi.');

    const updated = await this.prisma.campaignParticipant.update({
      where: { id: participantId },
      data: { status: 'ACCEPTED', joinedAt: new Date() },
    });

    // Thông báo ngược lại vào chat
    await this._sendAcceptNotice(participant, userId);

    return updated;
  }

  // ─── KOL: Từ chối lời mời ────────────────────────────────────────────
  async rejectInvitation(userId: string, participantId: string) {
    const participant = await this.prisma.campaignParticipant.findUnique({
      where: { id: participantId },
      include: { campaign: { include: { store: true } } },
    });
    if (!participant) throw new NotFoundException('Lời mời không tồn tại.');
    if (participant.collaboratorId !== userId)
      throw new ForbiddenException('Đây không phải lời mời của bạn.');
    if (participant.status !== 'INVITED')
      throw new BadRequestException('Lời mời này đã được xử lý rồi.');

    const updated = await this.prisma.campaignParticipant.update({
      where: { id: participantId },
      data: { status: 'REJECTED' },
    });

    // Thông báo từ chối vào chat
    await this._sendRejectNotice(participant, userId);

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
      campaignId: participant.campaignId,
      campaignName: participant.campaign.name,
    });

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: kolUserId,
        messageText: cardPayload,
        isRead: false,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
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
      campaignId: participant.campaignId,
      campaignName: participant.campaign.name,
    });

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: kolUserId,
        messageText: cardPayload,
        isRead: false,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  // ─── Public: Lấy chi tiết 1 chiến dịch ──────────────────────────────
  async getCampaignDetail(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        participants: {
          include: {
            collaborator: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Chiến dịch không tồn tại.');
    return campaign;
  }
}

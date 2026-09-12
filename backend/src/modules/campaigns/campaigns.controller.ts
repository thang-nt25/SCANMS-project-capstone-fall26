import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, InviteCollaboratorDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Shop: Tạo chiến dịch mới ─────────────────────────────────────────
  @Post()
  createCampaign(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(user.id, dto);
  }

  // ─── Shop: Lấy danh sách chiến dịch của mình ──────────────────────────
  @Get('shop')
  getShopCampaigns(@CurrentUser() user: any) {
    return this.campaignsService.getShopCampaigns(user.id);
  }

  // ─── Shop: Mời KOL vào chiến dịch (gửi thẻ mời VIP qua chat) ─────────
  @Post(':campaignId/invite')
  inviteCollaborator(
    @CurrentUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() dto: InviteCollaboratorDto,
  ) {
    return this.campaignsService.inviteCollaborator(user.id, campaignId, dto);
  }

  // ─── KOL: Xem danh sách lời mời của mình ─────────────────────────────
  @Get('my-invitations')
  getMyInvitations(@CurrentUser() user: any) {
    return this.campaignsService.getMyInvitations(user.id);
  }

  // ─── KOL: Chấp nhận lời mời ──────────────────────────────────────────
  @Patch('invitations/:participantId/accept')
  acceptInvitation(
    @CurrentUser() user: any,
    @Param('participantId') participantId: string,
  ) {
    return this.campaignsService.acceptInvitation(user.id, participantId);
  }

  // ─── KOL: Từ chối lời mời ────────────────────────────────────────────
  @Patch('invitations/:participantId/reject')
  rejectInvitation(
    @CurrentUser() user: any,
    @Param('participantId') participantId: string,
  ) {
    return this.campaignsService.rejectInvitation(user.id, participantId);
  }

  // ─── Public: Chi tiết chiến dịch ─────────────────────────────────────
  @Get(':campaignId')
  getCampaignDetail(@Param('campaignId') campaignId: string) {
    return this.campaignsService.getCampaignDetail(campaignId);
  }
}

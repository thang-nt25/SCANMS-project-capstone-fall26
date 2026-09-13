import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  InviteCollaboratorDto,
  InviteInChatDto,
} from './dto/campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('FR-27 — Exclusive Campaigns & Chat VIP Invitations')
@ApiBearerAuth()
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Shop: Tạo chiến dịch mới ─────────────────────────────────────────
  @Post()
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Shop: Tạo chiến dịch tiếp thị độc quyền mới',
    description: 'Tạo chiến dịch kèm tỷ lệ hoa hồng thưởng thêm (bonusCommissionRate) dành riêng cho KOLs.',
  })
  @ApiResponse({ status: 201, description: 'Chiến dịch đã được khởi tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ hoặc ngày kết thúc trước ngày bắt đầu.' })
  @ApiResponse({ status: 403, description: 'Không có quyền quản lý cửa hàng.' })
  createCampaign(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(user.id, dto);
  }

  // ─── Shop: Lấy danh sách chiến dịch của mình ──────────────────────────
  @Get('shop')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Shop: Lấy danh sách chiến dịch và người tham gia',
    description: 'Trả về toàn bộ chiến dịch của cửa hàng kèm danh sách KOLs đã mời/đã tham gia.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách chiến dịch của Shop.' })
  getShopCampaigns(@CurrentUser() user: any) {
    return this.campaignsService.getShopCampaigns(user.id);
  }

  // ─── Shop: Mời KOL vào chiến dịch (gửi thẻ mời VIP qua chat) ─────────
  @Post(':campaignId/invite')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Shop: Mời KOL vào chiến dịch qua Thẻ Mời VIP',
    description: 'Gửi thẻ mời VIP dạng tin nhắn tương tác trực tiếp vào cuộc hội thoại chat và broadcast Socket.io.',
  })
  @ApiParam({ name: 'campaignId', description: 'ID chiến dịch' })
  @ApiResponse({ status: 200, description: 'Thẻ mời VIP đã được gửi thành công.' })
  @ApiResponse({ status: 400, description: 'KOL đã được mời hoặc chiến dịch không còn hiệu lực.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chiến dịch hoặc KOL.' })
  inviteCollaborator(
    @CurrentUser() user: any,
    @Param('campaignId', new ParseUUIDPipe()) campaignId: string,
    @Body() dto: InviteCollaboratorDto,
  ) {
    return this.campaignsService.inviteCollaborator(user.id, campaignId, dto);
  }

  // ─── Shop: Mời KOL trực tiếp từ cuộc hội thoại Chat ──────────────────
  @Post('chat/:conversationId/invite')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Shop: Mời trực tiếp từ cuộc hội thoại Chat hiện tại',
    description: 'Tiện ích cho phép Chủ Shop chọn nhanh chiến dịch từ danh sách và gửi thẳng vào cuộc trò chuyện.',
  })
  @ApiParam({ name: 'conversationId', description: 'ID cuộc hội thoại chat' })
  @ApiResponse({ status: 200, description: 'Đã gửi thẻ mời VIP vào cuộc hội thoại.' })
  inviteInChat(
    @CurrentUser() user: any,
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
    @Body() dto: InviteInChatDto,
  ) {
    return this.campaignsService.inviteInChat(user.id, conversationId, dto);
  }

  // ─── KOL: Xem danh sách lời mời của mình ─────────────────────────────
  @Get('my-invitations')
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'KOL: Lấy danh sách các lời mời chiến dịch VIP',
    description: 'Trả về danh sách các chiến dịch mà KOL đã nhận được lời mời tham gia kèm trạng thái phản hồi.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách lời mời của KOL.' })
  getMyInvitations(@CurrentUser() user: any) {
    return this.campaignsService.getMyInvitations(user.id);
  }

  // ─── KOL: Chấp nhận lời mời ──────────────────────────────────────────
  @Patch('invitations/:participantId/accept')
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'KOL: Chấp nhận tham gia chiến dịch VIP',
    description: 'Chấp nhận lời mời, kích hoạt quyền nhận hoa hồng thưởng thêm và gửi thông báo phản hồi vào chat.',
  })
  @ApiParam({ name: 'participantId', description: 'ID bản ghi tham gia chiến dịch (CampaignParticipant)' })
  @ApiResponse({ status: 200, description: 'Đã chấp nhận tham gia chiến dịch thành công.' })
  @ApiResponse({ status: 400, description: 'Lời mời đã được xử lý trước đó.' })
  @ApiResponse({ status: 403, description: 'Không có quyền chấp nhận lời mời của người khác.' })
  acceptInvitation(
    @CurrentUser() user: any,
    @Param('participantId', new ParseUUIDPipe()) participantId: string,
  ) {
    return this.campaignsService.acceptInvitation(user.id, participantId);
  }

  // ─── KOL: Từ chối lời mời ────────────────────────────────────────────
  @Patch('invitations/:participantId/reject')
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'KOL: Từ chối tham gia chiến dịch VIP',
    description: 'Từ chối lời mời chiến dịch và thông báo phản hồi lịch sự tới Chủ Shop qua tin nhắn hội thoại.',
  })
  @ApiParam({ name: 'participantId', description: 'ID bản ghi tham gia chiến dịch' })
  @ApiResponse({ status: 200, description: 'Đã từ chối lời mời chiến dịch.' })
  @ApiResponse({ status: 400, description: 'Lời mời đã được xử lý trước đó.' })
  rejectInvitation(
    @CurrentUser() user: any,
    @Param('participantId', new ParseUUIDPipe()) participantId: string,
  ) {
    return this.campaignsService.rejectInvitation(user.id, participantId);
  }

  // ─── Public: Chi tiết chiến dịch ─────────────────────────────────────
  @Get(':campaignId')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết một chiến dịch',
    description: 'Xem thông tin gian hàng, sản phẩm trong chiến dịch và các KOL tham gia.',
  })
  @ApiParam({ name: 'campaignId', description: 'ID chiến dịch' })
  @ApiResponse({ status: 200, description: 'Chi tiết chiến dịch.' })
  @ApiResponse({ status: 404, description: 'Chiến dịch không tồn tại.' })
  getCampaignDetail(@Param('campaignId', new ParseUUIDPipe()) campaignId: string) {
    return this.campaignsService.getCampaignDetail(campaignId);
  }
}

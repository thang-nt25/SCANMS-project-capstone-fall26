import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { AffiliateDealsService } from './affiliate-deals.service';
import { CreateExclusiveDealDto } from './dto/create-exclusive-deal.dto';
import { CreateShopDealOfferDto } from './dto/create-shop-deal-offer.dto';
import { RejectExclusiveDealDto } from './dto/reject-exclusive-deal.dto';
import { TerminateExclusiveDealDto } from './dto/terminate-exclusive-deal.dto';
import { ApproveExclusiveDealDto } from './dto/approve-exclusive-deal.dto';
import { InviteExclusiveDealDto } from './dto/invite-exclusive-deal.dto';
import { ReviewExceptionDto } from './dto/review-exception.dto';

@ApiTags('Affiliate Offers & Exclusive Deals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('affiliate-deals')
export class AffiliateDealsController {
  constructor(private readonly service: AffiliateDealsService) {}

  @Get('exceptions')
  @Roles(UserRole.SYSTEM_ADMIN)
  exceptions(@CurrentUser('role') role: UserRole) {
    return this.service.listExceptions(role);
  }

  @Patch(':id/exception-review')
  @Roles(UserRole.SYSTEM_ADMIN)
  exceptionReview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @CurrentUser('role') role: UserRole, @Body() dto: ReviewExceptionDto) {
    return this.service.reviewException(id, actorId, role, dto.approve, dto.note);
  }

  @Get('mine')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({
    summary: 'KOL xem trạng thái các đề xuất deal riêng của mình',
  })
  getMine(@CurrentUser('id') userId: string) {
    return this.service.getMyProposals(userId);
  }

  @Get('my-status')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({
    summary: 'KOL kiểm tra trạng thái điều kiện nhận deal độc quyền & cooldown',
  })
  getMyStatus(@CurrentUser('id') userId: string) {
    return this.service.getMyDealStatus(userId);
  }

  @Post('proposals')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({
    summary: 'KOL gửi đề xuất mức VIP và cam kết doanh số cho Shop',
  })
  createProposal(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExclusiveDealDto,
  ) {
    return this.service.createProposal(userId, dto);
  }

  @Post('shop-offers')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({
    summary: 'Shop chủ động đề xuất Deal độc quyền cho KOL',
  })
  createShopOffer(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateShopDealOfferDto,
  ) {
    return this.service.createShopOffer(userId, role, dto);
  }

  @Get('shop')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Shop xem các đề xuất deal độc quyền gửi đến mình' })
  getShopProposals(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.getShopProposals(userId, role);
  }

  @Post('offers')
  @Roles(UserRole.SHOP_MANAGER)
  invite(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: InviteExclusiveDealDto,
  ) {
    return this.service.inviteShopOffer(userId, role, dto);
  }

  @Patch(':id/accept')
  @Roles(UserRole.COLLABORATOR)
  acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.respondToOffer(id, userId, true);
  }

  @Patch(':id/decline')
  @Roles(UserRole.COLLABORATOR)
  declineOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectExclusiveDealDto,
  ) {
    return this.service.respondToOffer(id, userId, false, dto.reason);
  }

  @Get('shop/active-partners')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({
    summary:
      'Shop xem danh sách các KOL đang có Deal độc quyền hiệu lực và tiến độ KPI',
  })
  getShopActivePartners(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.getShopActivePartners(userId, role);
  }

  @Get(':id/progress')
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  getProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.getProgress(id, userId, role);
  }

  @Get(':id')
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  getState(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.getProposalState(id, userId, role);
  }

  @Patch(':id/approve')
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({
    summary: 'Shop chấp thuận deal và tự tạo link VIP riêng cho KOL',
  })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ApproveExclusiveDealDto,
  ) {
    return this.service.approveProposal(id, userId, role, dto);
  }

  @Patch(':id/reject')
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Shop từ chối đề xuất deal và phản hồi qua Chat' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: RejectExclusiveDealDto,
  ) {
    return this.service.rejectProposal(id, userId, role, dto.reason);
  }

  @Post(':id/terminate')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({
    summary:
      'Shop đóng deal độc quyền khi KOL không đạt cam kết và áp dụng chế tài 4 cấp độ',
  })
  terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: TerminateExclusiveDealDto,
  ) {
    return this.service.terminateDeal(id, userId, role, dto);
  }

  @Delete(':id')
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  @ApiOperation({
    summary:
      'KOL hoặc Shop gỡ bỏ hoặc hủy đề xuất Exclusive Deal khi không còn dùng hoặc hết hạn',
  })
  deleteProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.deleteProposal(id, userId, role);
  }
}

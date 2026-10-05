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
import { RejectExclusiveDealDto } from './dto/reject-exclusive-deal.dto';
import { TerminateExclusiveDealDto } from './dto/terminate-exclusive-deal.dto';

@ApiTags('Affiliate Offers & Exclusive Deals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('affiliate-deals')
export class AffiliateDealsController {
  constructor(private readonly service: AffiliateDealsService) {}

  @Get('mine')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({ summary: 'KOL xem trạng thái các đề xuất deal riêng của mình' })
  getMine(@CurrentUser('id') userId: string) {
    return this.service.getMyProposals(userId);
  }

  @Get('my-status')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({ summary: 'KOL kiểm tra trạng thái điều kiện nhận deal độc quyền & cooldown' })
  getMyStatus(@CurrentUser('id') userId: string) {
    return this.service.getMyDealStatus(userId);
  }

  @Post('proposals')
  @Roles(UserRole.COLLABORATOR)
  @ApiOperation({ summary: 'KOL gửi đề xuất mức VIP và cam kết doanh số cho Shop' })
  createProposal(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExclusiveDealDto,
  ) {
    return this.service.createProposal(userId, dto);
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

  @Patch(':id/approve')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Shop chấp thuận deal và tự tạo link VIP riêng cho KOL' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.approveProposal(id, userId, role);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
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
  @ApiOperation({ summary: 'Shop đóng deal độc quyền khi KOL không đạt cam kết và áp dụng chế tài 4 cấp độ' })
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
  @ApiOperation({ summary: 'KOL hoặc Shop gỡ bỏ hoặc hủy đề xuất Exclusive Deal khi không còn dùng hoặc hết hạn' })
  deleteProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.deleteProposal(id, userId, role);
  }
}

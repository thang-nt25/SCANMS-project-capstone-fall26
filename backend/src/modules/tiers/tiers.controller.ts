import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TiersService } from './tiers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Collaborator Tiers')
@Controller('tiers')
export class TiersController {
  constructor(private readonly tiersService: TiersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy bảng danh mục 4 cấp bậc KOL (Đồng, Bạc, Vàng, Kim Cương)',
  })
  async getAllTiers() {
    return this.tiersService.getAllTiers();
  }

  @Get('my-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'KOL xem cấp bậc hiện tại, doanh số hoàn thành và tiến độ thăng hạng',
  })
  async getMyTierStatus(@CurrentUser('id') userId: string) {
    return this.tiersService.getMyTierStatus(userId);
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SHOP_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Kích hoạt động cơ quét doanh số và tự động thăng hạng cho toàn bộ KOL',
  })
  async evaluateTiers() {
    return this.tiersService.evaluateAllCollaborators();
  }
}

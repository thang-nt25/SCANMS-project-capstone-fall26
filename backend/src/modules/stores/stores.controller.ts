import { Controller, Get, Put, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Store Settings')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('public/id/:storeId')
  getPublicStoreById(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.storesService.getPublicStoreById(storeId);
  }

  @Get('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  getFollowStatus(@Param('storeId', ParseUUIDPipe) storeId: string, @CurrentUser('id') userId: string) {
    return this.storesService.getFollowStatus(storeId, userId);
  }

  @Post('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  follow(@Param('storeId', ParseUUIDPipe) storeId: string, @CurrentUser('id') userId: string) {
    return this.storesService.setFollow(storeId, userId, true);
  }

  @Delete('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('storeId', ParseUUIDPipe) storeId: string, @CurrentUser('id') userId: string) {
    return this.storesService.setFollow(storeId, userId, false);
  }

  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chủ Shop lấy thông tin cấu hình gian hàng của mình',
  })
  async getMyStore(@CurrentUser('id') ownerId: string) {
    return this.storesService.getMyStore(ownerId);
  }

  @Put('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Chủ Shop cập nhật cấu hình gian hàng và thông tin đối soát của Shop mình',
  })
  async updateMyStore(
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateMyStore(ownerId, dto);
  }

  @Get('marketplace')
  @ApiOperation({
    summary: 'Lấy toàn bộ gian hàng đang hoạt động trên sàn để KOL khám phá và kết nối',
  })
  async getMarketplaceStores() {
    return this.storesService.getMarketplaceStores();
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Lấy thông tin công khai của cửa hàng theo Slug' })
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }
}

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { StorePresenceService } from './store-presence.service';

@ApiTags('Store Settings')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService, private readonly presence: StorePresenceService) {}

  @Post('my-store/presence')
  @UseGuards(JwtAuthGuard)
  heartbeat(@CurrentUser('id') userId: string) {
    return this.presence.heartbeat(userId);
  }

  @Get('public/id/:storeId/presence')
  getPresence(@Param('storeId') storeId: string) {
    return this.presence.getPublicPresence(storeId);
  }

  @Get('public/id/:storeId')
  getPublicStoreById(@Param('storeId') storeId: string) {
    return this.storesService.getPublicStoreById(storeId);
  }

  @Get('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  getFollowStatus(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.getFollowStatus(storeId, userId);
  }

  @Post('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  follow(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.setFollow(storeId, userId, true);
  }

  @Delete('public/id/:storeId/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
  ) {
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

  @Get('all-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy toàn bộ cửa hàng trực thuộc để quản trị và phân quyền' })
  async getAllStoresAdmin() {
    return this.storesService.getAllStoresAdmin();
  }

  @Get('marketplace')
  @ApiOperation({
    summary:
      'Lấy toàn bộ gian hàng đang hoạt động trên sàn để KOL khám phá và kết nối',
  })
  async getMarketplaceStores() {
    return this.storesService.getMarketplaceStores();
  }

  @Get('public/placements')
  @ApiOperation({ summary: 'Vị trí gian hàng tài trợ đã xác nhận và còn hiệu lực' })
  getSponsoredPlacements() {
    return this.storesService.getSponsoredPlacements();
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Lấy thông tin công khai của cửa hàng theo Slug' })
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }
}

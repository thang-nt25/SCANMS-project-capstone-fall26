import {
  Controller,
  Get,
  Put,
  Body,
  Param,
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

@ApiTags('Store Settings')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop lấy thông tin cấu hình gian hàng của mình' })
  async getMyStore(@CurrentUser('id') ownerId: string) {
    return this.storesService.getMyStore(ownerId);
  }

  @Put('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Chủ Shop cập nhật cấu hình gian hàng (Hạn mức rút tiền, thời hạn cookie, % hoa hồng mặc định)',
  })
  async updateMyStore(
    @CurrentUser('id') ownerId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateMyStore(ownerId, dto);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Lấy thông tin công khai của cửa hàng theo Slug' })
  async getStoreBySlug(@Param('slug') slug: string) {
    return this.storesService.getStoreBySlug(slug);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import {
  ApplyKolUpgradeDto,
  ApplyShopUpgradeDto,
  ReviewUpgradeApplicationDto,
} from './dto/apply-upgrade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('KYC & Role Upgrade')
@ApiBearerAuth()
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Xem thông tin hồ sơ KYC của chính mình' })
  async getMyKyc(@CurrentUser('id') userId: string) {
    return this.kycService.getMyKyc(userId);
  }

  @Put('submit')
  @ApiOperation({
    summary: 'KOL nộp thông tin CCCD, Mã số thuế và Tài khoản ngân hàng',
  })
  async submitKyc(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitKycDto,
  ) {
    return this.kycService.submitKyc(userId, dto);
  }

  @Post('upgrade/kol')
  @ApiOperation({ summary: 'Khách Hàng nộp đơn đăng ký nâng cấp thành KOL' })
  async applyKolUpgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyKolUpgradeDto,
  ) {
    return this.kycService.applyKolUpgrade(userId, dto);
  }

  @Post('upgrade/shop')
  @ApiOperation({ summary: 'Khách Hàng nộp đơn đăng ký mở Gian Hàng (Shop)' })
  async applyShopUpgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyShopUpgradeDto,
  ) {
    return this.kycService.applyShopUpgrade(userId, dto);
  }

  @Get('upgrade/my-status')
  @ApiOperation({ summary: 'Khách Hàng xem trạng thái các đơn xin nâng cấp' })
  async getMyUpgradeStatus(@CurrentUser('id') userId: string) {
    return this.kycService.getMyUpgradeStatus(userId);
  }

  @Get('admin/pending')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin / Shop xem danh sách hồ sơ KYC cần duyệt' })
  async getPendingKyc() {
    return this.kycService.getPendingKycList();
  }

  @Get('admin/applications')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin xem toàn bộ hồ sơ xin nâng cấp (KOL và Gian Hàng)' })
  async getUpgradeApplications() {
    return this.kycService.getUpgradeApplications();
  }

  @Patch('admin/:id/review')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin duyệt hoặc từ chối hồ sơ KYC cũ' })
  async reviewKyc(@Param('id') profileId: string, @Body() dto: ReviewKycDto) {
    return this.kycService.reviewKyc(profileId, dto);
  }

  @Patch('admin/kol/:id/review')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin duyệt đơn nâng cấp KOL' })
  async reviewKolApplication(
    @Param('id') profileId: string,
    @Body() dto: ReviewUpgradeApplicationDto,
  ) {
    return this.kycService.reviewKolApplication(profileId, dto);
  }

  @Patch('admin/shop/:id/review')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin duyệt đơn nâng cấp Gian Hàng (Shop)' })
  async reviewShopApplication(
    @Param('id') storeId: string,
    @Body() dto: ReviewUpgradeApplicationDto,
  ) {
    return this.kycService.reviewShopApplication(storeId, dto);
  }
}

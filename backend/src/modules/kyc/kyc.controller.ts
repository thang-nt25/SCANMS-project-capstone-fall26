import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('KYC Verification')
@ApiBearerAuth()
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('profile')
  @ApiOperation({ summary: 'KOL xem thông tin hồ sơ KYC của chính mình' })
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

  @Get('admin/pending')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin / Shop xem danh sách hồ sơ KYC cần duyệt' })
  async getPendingKyc() {
    return this.kycService.getPendingKycList();
  }

  @Patch('admin/:id/review')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiOperation({ summary: 'Admin / Shop duyệt hoặc từ chối hồ sơ KYC' })
  async reviewKyc(@Param('id') profileId: string, @Body() dto: ReviewKycDto) {
    return this.kycService.reviewKyc(profileId, dto);
  }
}

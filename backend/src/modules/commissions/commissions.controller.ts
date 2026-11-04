import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Commissions & Escrow')
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post('orders/:orderId/referral-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  reviewReferral(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { outcome: string; reason: string },
  ) {
    return this.commissionsService.reviewReferral(
      orderId,
      user,
      body.outcome,
      body.reason,
    );
  }

  @Get('escrow-info')
  @ApiOperation({
    summary: 'Lấy chính sách Escrow 7 ngày lịch',
    description:
      'Bảo chứng 7 ngày lịch từ lúc giao hàng; không cộng ngày lễ. Khiếu nại hoặc thẩm định tự mua tiếp tục giữ tiền.',
  })
  getEscrowPolicyInfo(@Query('sampleDate') sampleDate?: string) {
    return this.commissionsService.getEscrowPolicyInfo(sampleDate);
  }

  @Get('orders/:orderId/escrow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chi tiết đếm ngược Escrow của một đơn hàng',
    description:
      'Phân biệt đang bảo chứng, tạm giữ, đủ điều kiện giải tỏa, đã giải tỏa và đã thu hồi.',
  })
  async getOrderEscrowDetails(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const details = await this.commissionsService.getOrderEscrowDetails(
      orderId,
      user,
    );
    if (!details) {
      throw new NotFoundException(
        'Không tìm thấy bản ghi hoa hồng / Escrow cho đơn hàng này',
      );
    }
    return details;
  }
}

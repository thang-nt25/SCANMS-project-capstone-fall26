import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { QueryWithdrawalsDto } from './dto/query-withdrawals.dto';
import { PayoutsService } from './payouts.service';

@ApiTags('Payout Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLABORATOR)
@Controller('wallets/withdrawals')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  @ApiOperation({ summary: 'FR-22: Yêu cầu rút tiền từ ví khả dụng' })
  @ApiResponse({
    status: 201,
    description: 'Tạo payout request PENDING thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Số tiền, số dư hoặc hồ sơ ngân hàng không hợp lệ',
  })
  createWithdrawal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.payoutsService.createWithdrawal(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'FR-22: Lịch sử yêu cầu rút tiền của chính KOL' })
  getMyWithdrawals(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryWithdrawalsDto,
  ) {
    return this.payoutsService.getMyWithdrawals(user.id, query);
  }
}

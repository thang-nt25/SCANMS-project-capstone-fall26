import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { WalletSummaryService } from './wallet-summary.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLABORATOR)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly summaryService: WalletSummaryService) {}

  @Get('me')
  @ApiOperation({ summary: 'FR-22: Lấy số dư và điều kiện rút tiền của KOL' })
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getMyWallet(user.id);
  }

  @Get('me/ledger')
  @ApiOperation({ summary: 'FR-23: Lịch sử sổ cái tài chính của chính KOL' })
  getMyLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLedgerDto,
  ) {
    return this.summaryService.getMyLedger(user.id, query);
  }
}

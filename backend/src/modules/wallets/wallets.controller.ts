import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { WalletSummaryService } from './wallet-summary.service';
import { WalletsService } from './wallets.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';

class TopUpDemoDto {
  amount: number;
}

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly summaryService: WalletSummaryService,
    private readonly walletsService: WalletsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy số dư ví và trạng thái của người dùng (Customer, KOL, Shop)' })
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getMyWallet(user.id);
  }

  @Post('top-up-demo')
  @ApiOperation({ summary: 'Nạp tiền thử nghiệm Sandbox vào Ví SCANMS' })
  topUpDemo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TopUpDemoDto,
  ) {
    const amount = Number(body?.amount || 0);
    return this.walletsService.topUpDemo(user.id, amount);
  }

  @Put('me/bank-account')
  @ApiOperation({ summary: 'Cập nhật tài khoản ngân hàng nhận tiền của KOL' })
  updateBankAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { bankName: string; bankAccountNumber: string; bankAccountName: string },
  ) {
    return this.summaryService.updateBankAccount(user.id, body);
  }

  @Delete('me/bank-account')
  @ApiOperation({ summary: 'Ngừng sử dụng tài khoản nhận tiền của KOL' })
  disconnectBankAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.disconnectBankAccount(user.id);
  }

  @Get('me/ledger')
  @ApiOperation({ summary: 'Lịch sử sổ cái biến động số dư ví' })
  getMyLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryLedgerDto,
  ) {
    return this.summaryService.getMyLedger(user.id, query);
  }
}

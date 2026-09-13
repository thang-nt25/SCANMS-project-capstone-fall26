import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import {
  ApprovePayoutDto,
  ExportPayoutBatchDto,
  QueryMerchantPayoutsDto,
  RejectPayoutDto,
} from './dto/manage-payout.dto';
import { QueryWithdrawalsDto } from './dto/query-withdrawals.dto';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';

@ApiTags('Merchant Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_MANAGER)
@Controller('stores/:storeId/payouts')
export class MerchantPayoutsController {
  constructor(
    private readonly payouts: MerchantPayoutsService,
    private readonly batches: PayoutBatchesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMerchantPayoutsDto,
  ) {
    return this.payouts.listPayouts(storeId, user.id, query);
  }

  @Patch(':payoutId/approve')
  @ApiOperation({
    summary: 'FR-24: Xác nhận đã chuyển khoản, bắt buộc bill và mã giao dịch',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bill', 'bankRefCode'],
      properties: {
        bill: { type: 'string', format: 'binary' },
        bankRefCode: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('bill'))
  approve(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @Param('payoutId', new ParseUUIDPipe({ version: '4' })) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApprovePayoutDto,
    @UploadedFile() bill: Express.Multer.File,
  ) {
    return this.payouts.approvePayout(storeId, user.id, payoutId, dto, bill);
  }

  @Patch(':payoutId/reject')
  reject(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @Param('payoutId', new ParseUUIDPipe({ version: '4' })) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectPayoutDto,
  ) {
    return this.payouts.rejectPayout(storeId, user.id, payoutId, dto);
  }

  @Get(':payoutId/bill')
  @Header('Cache-Control', 'no-store')
  bill(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @Param('payoutId', new ParseUUIDPipe({ version: '4' })) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payouts.getBill(storeId, user.id, payoutId);
  }

  @Get('batches')
  @Header('Cache-Control', 'no-store')
  listBatches(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryWithdrawalsDto,
  ) {
    return this.batches.listBatches(storeId, user.id, query);
  }

  @Post('export-vietqr')
  @ApiOperation({
    summary: 'FR-24: Tạo lô, đánh dấu PROCESSING và tải Excel VietQR',
  })
  async exportBatch(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExportPayoutBatchDto,
    @Res() response: Response,
  ) {
    this.sendWorkbook(
      response,
      await this.batches.exportBatch(storeId, user.id, dto),
    );
  }

  @Get('batches/:batchId/download')
  async downloadBatch(
    @Param('storeId', new ParseUUIDPipe({ version: '4' })) storeId: string,
    @Param('batchId', new ParseUUIDPipe({ version: '4' })) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    this.sendWorkbook(
      response,
      await this.batches.downloadBatch(storeId, user.id, batchId),
    );
  }

  private sendWorkbook(
    response: Response,
    file: { batchId: string; filename: string; buffer: Buffer },
  ) {
    response.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Payout-Batch-Id': file.batchId,
    });
    response.send(file.buffer);
  }
}

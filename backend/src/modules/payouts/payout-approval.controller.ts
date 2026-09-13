import {
  Body,
  Controller,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../../core/database/prisma.service';
import { ReceiptApprovalDto } from './dto/manage-payout.dto';
import { MerchantPayoutsService } from './merchant-payouts.service';

@ApiTags('Merchant Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_MANAGER)
@Controller('payouts')
export class PayoutApprovalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: MerchantPayoutsService,
  ) {}

  @Post(':payoutId/approve')
  @Header('Cache-Control', 'no-store')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bill'],
      properties: {
        bill: { type: 'string', format: 'binary' },
        note: { type: 'string', maxLength: 500 },
        bankRefCode: { type: 'string', maxLength: 100 },
      },
    },
  })
  @UseInterceptors(FileInterceptor('bill'))
  async approve(
    @Param('payoutId', new ParseUUIDPipe({ version: '4' })) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReceiptApprovalDto,
    @UploadedFile() bill: Express.Multer.File,
  ) {
    // Resolve the shop from the owned payout, never from client-supplied identity.
    const request = await this.prisma.payoutRequest.findFirst({
      where: { id: payoutId, store: { ownerId: user.id, isDeleted: false } },
      select: { storeId: true },
    });
    if (!request?.storeId)
      throw new NotFoundException('Payout không tồn tại hoặc không thuộc shop');
    const approved = await this.payouts.approvePayout(
      request.storeId,
      user.id,
      payoutId,
      dto,
      bill,
    );
    return {
      ...approved,
      payoutId: approved.id,
      approvedAt: approved.processedAt,
    };
  }
}

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { CustomerWithdrawalsService } from './customer-withdrawals.service';
import {
  CreateCustomerWithdrawalDto,
  CustomerManualApprovalDto,
  CustomerWithdrawalRejectionDto,
  QueryCustomerWithdrawalsDto,
} from './dto/customer-withdrawal.dto';

@Controller('customer/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CustomerWithdrawalsController {
  constructor(private readonly service: CustomerWithdrawalsService) {}
  @Post() create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerWithdrawalDto,
  ) {
    return this.service.create(user, dto);
  }
  @Get() @Header('Cache-Control', 'no-store') list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCustomerWithdrawalsDto,
  ) {
    return this.service.list(user, query);
  }
  @Get(':id/proof') @Header('Cache-Control', 'no-store') proof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.proof(user, id);
  }
}

@Controller('admin/customer-withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
export class AdminCustomerWithdrawalsController {
  constructor(private readonly service: CustomerWithdrawalsService) {}
  @Get() @Header('Cache-Control', 'no-store') list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryCustomerWithdrawalsDto,
  ) {
    return this.service.list(user, query, true);
  }
  @Post(':id/approve') @UseInterceptors(FileInterceptor('proof')) approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerManualApprovalDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.approve(user, id, dto, file);
  }
  @Post(':id/reject') reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CustomerWithdrawalRejectionDto,
  ) {
    return this.service.reject(user, id, dto.reason);
  }
  @Get(':id/proof') @Header('Cache-Control', 'no-store') proof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.proof(user, id);
  }
}

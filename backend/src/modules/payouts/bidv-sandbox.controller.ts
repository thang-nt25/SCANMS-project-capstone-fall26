import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { BidvSandboxService } from './bidv-sandbox.service';

export class StartBidvSandboxDto {
  @IsUUID('4') runId: string;
}
export class InquireBidvSandboxDto {
  @IsUUID('4') operationId: string;
  @IsIn(['IDEMPOTENCY_KEY', 'INTERACTION_ID']) rootSource: 'IDEMPOTENCY_KEY' | 'INTERACTION_ID';
}

@ApiTags('BIDV Sandbox')
@ApiBearerAuth()
@Controller('admin/payouts/bidv-sandbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
export class BidvSandboxController {
  constructor(private readonly sandbox: BidvSandboxService) {}

  @Get('configuration')
  @Header('Cache-Control', 'no-store')
  configuration() { return this.sandbox.availability(); }

  @Get('runs')
  @Header('Cache-Control', 'no-store')
  history() { return this.sandbox.history(); }

  @Get('runs/:id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id', ParseUUIDPipe) id: string) { return this.sandbox.get(id); }

  @Post('runs')
  @Header('Cache-Control', 'no-store')
  transfer(@Body() dto: StartBidvSandboxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sandbox.transfer(dto.runId, user.id);
  }

  @Post('runs/:id/inquiry')
  @Header('Cache-Control', 'no-store')
  inquire(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InquireBidvSandboxDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sandbox.inquire(id, dto.operationId, dto.rootSource, user.id);
  }
}

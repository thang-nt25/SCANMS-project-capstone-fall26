import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { InviteStoreCollaboratorDto } from './dto/invite-store-collaborator.dto';
import { StoreCollaboratorsService } from './store-collaborators.service';
import { RequestStoreCooperationDto } from './dto/request-store-cooperation.dto';

@Controller('store-collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreCollaboratorsController {
  constructor(private readonly service: StoreCollaboratorsService) {}

  @Post('request')
  @Roles(UserRole.COLLABORATOR)
  request(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RequestStoreCooperationDto,
  ) {
    return this.service.requestCooperation(req.user!.id, dto.storeId, dto.note);
  }

  @Patch(':id/shop-approve')
  @Roles(UserRole.SHOP_MANAGER)
  approveRequest(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.reviewRequest(req.user!.id, id, true);
  }

  @Patch(':id/shop-reject')
  @Roles(UserRole.SHOP_MANAGER)
  rejectRequest(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.reviewRequest(req.user!.id, id, false);
  }

  @Get('shop')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  getShopTeam(
    @Req() req: AuthenticatedRequest,
    @Query('storeId') storeId?: string,
  ) {
    return this.service.getShopTeam(req.user!.id, storeId);
  }

  @Post('invite')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  invite(
    @Req() req: AuthenticatedRequest,
    @Body() dto: InviteStoreCollaboratorDto,
  ) {
    return this.service.invite(req.user!.id, dto);
  }

  @Get('my-invitations')
  @Roles(UserRole.COLLABORATOR)
  getMyInvitations(@Req() req: AuthenticatedRequest) {
    return this.service.getMyInvitations(req.user!.id);
  }

  @Patch(':id/accept')
  @Roles(UserRole.COLLABORATOR)
  accept(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.respond(req.user!.id, id, true);
  }

  @Patch(':id/reject')
  @Roles(UserRole.COLLABORATOR)
  reject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.respond(req.user!.id, id, false);
  }
}

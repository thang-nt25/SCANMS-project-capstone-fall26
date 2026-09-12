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

@Controller('store-collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoreCollaboratorsController {
  constructor(private readonly service: StoreCollaboratorsService) {}

  @Get('shop')
  @Roles(UserRole.SHOP_MANAGER)
  getShopTeam(
    @Req() req: AuthenticatedRequest,
    @Query('storeId') storeId?: string,
  ) {
    return this.service.getShopTeam(req.user!.id, storeId);
  }

  @Post('invite')
  @Roles(UserRole.SHOP_MANAGER)
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

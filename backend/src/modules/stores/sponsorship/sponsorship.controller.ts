import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SponsorshipService } from './sponsorship.service';
import {
  CancelSponsorshipDto,
  RequestSponsorshipDto,
  ReviewSponsorshipDto,
  SponsorshipListDto,
} from './sponsorship.dto';

@ApiTags('Gian hàng tài trợ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sponsored-placements')
export class SponsorshipController {
  constructor(private readonly service: SponsorshipService) {}

  @Get()
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  list(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: SponsorshipListDto,
  ) {
    return this.service.list(userId, role, query);
  }

  @Post()
  @Roles(UserRole.SHOP_MANAGER)
  request(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestSponsorshipDto,
  ) {
    return this.service.request(userId, dto);
  }

  @Patch(':id/review')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ReviewSponsorshipDto,
  ) {
    return this.service.review(id, userId, role, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CancelSponsorshipDto,
  ) {
    return this.service.cancel(id, userId, role, dto.note);
  }
}

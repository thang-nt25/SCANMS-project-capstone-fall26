import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PricingService } from './pricing.service';
import {
  CreatePricePromotionDto,
  ReviewPricePromotionDto,
  SetFloorPriceDto,
} from './dto/pricing.dto';

@Controller('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
export class PricingController {
  constructor(private readonly service: PricingService) {}
  @Get('catalog') catalog(
    @CurrentUser('id') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.catalog(id, role);
  }
  @Get('promotions') list(
    @CurrentUser('id') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.service.list(id, role);
  }
  @Put('products/:id/floor')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  floor(
    @CurrentUser('id') actor: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFloorPriceDto,
  ) {
    return this.service.setFloor(actor, role, id, dto);
  }
  @Post('promotions')
  @Roles(UserRole.SHOP_MANAGER)
  create(
    @CurrentUser('id') actor: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreatePricePromotionDto,
  ) {
    return this.service.create(actor, role, dto);
  }
  @Patch('promotions/:id/review')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  review(
    @CurrentUser('id') actor: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPricePromotionDto,
  ) {
    return this.service.review(actor, role, id, dto);
  }
  @Patch('promotions/:id/cancel')
  cancel(
    @CurrentUser('id') actor: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(actor, role, id);
  }
}

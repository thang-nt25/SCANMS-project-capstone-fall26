import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import {
  StoreMonthlyRewardsService,
  rewardMonth,
} from './store-monthly-rewards.service';
import {
  CreateMonthlyRewardDto,
  ReviewMonthlyRewardDto,
} from './dto/monthly-reward.dto';

@Controller('monthly-rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SHOP_MANAGER,
  UserRole.SYSTEM_MANAGER,
  UserRole.SYSTEM_ADMIN,
  UserRole.COLLABORATOR,
)
export class StoreMonthlyRewardsController {
  constructor(private readonly rewards: StoreMonthlyRewardsService) {}
  @Get('stores/:storeId/policies')
  @Roles(UserRole.SHOP_MANAGER)
  policyHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('page') page?: string,
  ) {
    return this.rewards.policyHistory(user, storeId, page === undefined ? 1 : Number(page));
  }
  @Get() list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.rewards.list(user, month || rewardMonth(), storeId);
  }
  @Post('stores/:storeId')
  @Roles(UserRole.SHOP_MANAGER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: CreateMonthlyRewardDto,
  ) {
    return this.rewards.create(user, storeId, dto);
  }
  @Get('policies/:id/my-orders')
  @Roles(UserRole.COLLABORATOR)
  myOrders(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rewards.myPolicyOrders(user, id);
  }
  @Post('policies/:id/review')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewMonthlyRewardDto,
  ) {
    return this.rewards.reviewPolicy(user, id, dto);
  }
  @Post('policies/:id/request/:kolId')
  @Roles(UserRole.SHOP_MANAGER)
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('kolId', ParseUUIDPipe) kolId: string,
  ) {
    return this.rewards.request(user, id, kolId);
  }
  @Post('grants/:id/review')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  grant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewMonthlyRewardDto,
  ) {
    return this.rewards.reviewGrant(user, id, dto);
  }
}

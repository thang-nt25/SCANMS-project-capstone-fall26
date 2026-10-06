import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ClaimLiveSessionDto,
  CreateLiveSessionDto,
  GenerateLiveLinkCodeDto,
  RespondLiveSessionDto,
  UpdateLiveSessionStateDto,
} from './dto/create-live-session.dto';
import { LiveSessionsService } from './live-sessions.service';

@Controller('live-sessions')
export class LiveSessionsController {
  constructor(private readonly service: LiveSessionsService) {}

  @Get('public/list')
  getPublicLiveList() {
    return this.service.getPublicLiveList();
  }

  @Get('public/detail/:identifier')
  getPublicSessionByIdentifier(@Param('identifier') identifier: string) {
    return this.service.getPublicSessionByIdentifier(identifier);
  }

  @Get('public/:identifier/stats')
  getPublicSessionStats(@Param('identifier') identifier: string) {
    return this.service.getSessionStats(identifier);
  }

  @Post('public/:identifier/interaction')
  recordInteraction(
    @Param('identifier') identifier: string,
    @Body() body: { action: 'HEARTBEAT' | 'LIKE' | 'LEAVE'; clientId: string; count?: number },
  ) {
    return this.service.recordInteraction(identifier, body);
  }

  @Get('products/active')
  getProductSessions(@Query('productIds') productIds?: string) {
    return this.service.getPublicSessionsForProducts(productIds);
  }

  @Get('products/:productId/active')
  getProductSession(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.service.getPublicSessionForProduct(productId);
  }

  @Post(':id/claim')
  claim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimLiveSessionDto,
    @Req() req: any,
  ) {
    return this.service.claim(id, dto, req.user?.id || req.user?.sub);
  }

  @Get('shop/catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  getShopCatalog(@CurrentUser('id') userId: string, @Query('storeId') storeId: string) {
    return this.service.getShopCatalog(userId, storeId);
  }

  @Post('shop/link-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  generateLinkCode(@CurrentUser('id') userId: string, @Body() dto: GenerateLiveLinkCodeDto) {
    return this.service.generateLinkCode(userId, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  getAdminSessions() {
    return this.service.getAdminSessions();
  }

  @Get('shop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  getShopSessions(@CurrentUser('id') userId: string, @Query('storeId') storeId: string) {
    return this.service.getShopSessions(userId, storeId);
  }

  @Post('shop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLiveSessionDto) {
    return this.service.create(userId, dto);
  }

  @Patch('shop/:id/state')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  updateState(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveSessionStateDto,
  ) {
    return this.service.updateState(userId, id, dto);
  }

  @Get('shop/:id/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  getReport(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getReport(userId, id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR)
  getMySessions(@CurrentUser('id') creatorId: string) {
    return this.service.getMySessions(creatorId);
  }

  @Patch('my/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR)
  respond(
    @CurrentUser('id') creatorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondLiveSessionDto,
  ) {
    return this.service.respond(creatorId, id, dto);
  }
}

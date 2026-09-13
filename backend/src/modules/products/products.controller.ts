import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ModerateProductReviewDto } from './dto/moderate-product-review.dto';

@ApiTags('Products Management')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('landing/:idOrSlug')
  @ApiOperation({
    summary: 'Lấy dữ liệu Landing Page công khai cho khách mua hàng (FR-15)',
  })
  @ApiParam({
    name: 'idOrSlug',
    description: 'UUID hoặc SKU của sản phẩm',
    example: 'TECH-001',
  })
  async getLandingAlias(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req?: Request,
  ) {
    const attrCookie =
      req?.cookies?.['scanms_attr'] || req?.cookies?.['scanms_attribution'];
    return this.productsService.getLandingPageData(idOrSlug, attrCookie);
  }

  @Get(':idOrSlug/landing')
  @ApiOperation({
    summary: 'Lấy dữ liệu Landing Page công khai cho khách mua hàng (FR-15 chuẩn REST)',
  })
  @ApiParam({
    name: 'idOrSlug',
    description: 'UUID hoặc SKU của sản phẩm',
    example: 'TECH-001',
  })
  async getLanding(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req?: Request,
  ) {
    const attrCookie =
      req?.cookies?.['scanms_attr'] || req?.cookies?.['scanms_attribution'];
    return this.productsService.getLandingPageData(idOrSlug, attrCookie);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_MANAGER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy danh sách sản phẩm (Phân trang, tìm kiếm SKU/Tên, lọc Category)',
  })
  async findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.productsService.findAll(query, { id: userId, role });
  }

  @Get('reviews/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách review chờ Shop/Admin kiểm duyệt' })
  async listReviewsForModeration(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.productsService.listReviewsForModeration(userId, role);
  }

  @Patch('reviews/:reviewId/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Shop/Admin duyệt, từ chối hoặc ẩn review' })
  async moderateReview(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('reviewId') reviewId: string,
    @Body() dto: ModerateProductReviewDto,
  ) {
    return this.productsService.moderateReview(userId, role, reviewId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_MANAGER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm và media liên quan' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.productsService.findOne(id, { id: userId, role });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop hoặc Quản trị viên đăng sản phẩm mới' })
  async create(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(ownerId, role, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop hoặc Quản trị viên cập nhật thông tin & hoa hồng sản phẩm' })
  async update(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(ownerId, role, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop hoặc Quản trị viên xóa mềm sản phẩm (Bảo toàn lịch sử đơn)' })
  async softDelete(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
  ) {
    return this.productsService.softDelete(ownerId, role, id);
  }

  @Patch('bulk-commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cài đặt % hoa hồng hàng loạt cho nhiều sản phẩm' })
  async bulkCommission(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Body('productIds') productIds: string[],
    @Body('commissionRate') commissionRate: number,
  ) {
    return this.productsService.bulkUpdateCommission(
      ownerId,
      role,
      productIds,
      commissionRate,
    );
  }
}

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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Products Management')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách sản phẩm (Phân trang, tìm kiếm SKU/Tên, lọc Category)',
  })
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm và media liên quan' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop đăng sản phẩm mới' })
  async create(
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(ownerId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop cập nhật thông tin & hoa hồng sản phẩm' })
  async update(
    @CurrentUser('id') ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop xóa mềm sản phẩm (Bảo toàn lịch sử đơn)' })
  async softDelete(
    @CurrentUser('id') ownerId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.softDelete(ownerId, id);
  }

  @Patch('bulk-commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cài đặt % hoa hồng hàng loạt cho nhiều sản phẩm' })
  async bulkCommission(
    @CurrentUser('id') ownerId: string,
    @Body('productIds') productIds: string[],
    @Body('commissionRate') commissionRate: number,
  ) {
    return this.productsService.bulkUpdateCommission(
      ownerId,
      productIds,
      commissionRate,
    );
  }
}

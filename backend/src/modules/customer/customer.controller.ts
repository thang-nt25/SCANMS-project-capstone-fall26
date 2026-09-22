import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { ChangeCustomerPasswordDto } from './dto/change-password.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { CustomerOrdersQueryDto } from './dto/customer-orders-query.dto';

@ApiTags('Customer Portal (Dành Cho Khách Hàng)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ==========================================
  // 1. HỒ SƠ & THỐNG KÊ
  // ==========================================
  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản và chỉ số mua sắm của khách hàng' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.customerService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin họ tên, số điện thoại khách hàng' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerService.updateProfile(userId, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeCustomerPasswordDto,
  ) {
    return this.customerService.changePassword(userId, dto);
  }

  // ==========================================
  // 2. ĐƠN MUA CỦA TÔI
  // ==========================================
  @Get('orders')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng đã mua (hỗ trợ lọc trạng thái, tìm kiếm)' })
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query() query: CustomerOrdersQueryDto,
  ) {
    return this.customerService.getOrders(userId, query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng đã mua của khách' })
  async getOrderDetails(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.customerService.getOrderDetails(userId, orderId);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Khách hàng tự hủy đơn hàng khi đơn đang ở trạng thái Chờ xác nhận' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body('reason') reason?: string,
  ) {
    return this.customerService.cancelOrder(userId, orderId, reason);
  }

  // ==========================================
  // 3. SỔ ĐỊA CHỈ NHẬN HÀNG
  // ==========================================
  @Get('addresses')
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ nhận hàng đã lưu' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.customerService.getAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Thêm địa chỉ nhận hàng mới' })
  async createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerService.createAddress(userId, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ nhận hàng' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customerService.updateAddress(userId, addressId, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Xóa địa chỉ nhận hàng' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return this.customerService.deleteAddress(userId, addressId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Thiết lập địa chỉ nhận hàng mặc định' })
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return this.customerService.setDefaultAddress(userId, addressId);
  }

  // ==========================================
  // 4. SẢN PHẨM YÊU THÍCH (WISHLIST)
  // ==========================================
  @Get('wishlist')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm yêu thích' })
  async getWishlist(@CurrentUser('id') userId: string) {
    return this.customerService.getWishlist(userId);
  }

  @Post('wishlist/:productId/toggle')
  @ApiOperation({ summary: 'Thêm/bỏ sản phẩm yêu thích (Toggle)' })
  async toggleWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.customerService.toggleWishlist(userId, productId);
  }

  @Post('wishlist/:productId')
  @ApiOperation({ summary: 'Thêm/bỏ sản phẩm yêu thích (Toggle alias)' })
  async addWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.customerService.toggleWishlist(userId, productId);
  }

  @Delete('wishlist/:productId')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  async removeWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.customerService.removeFromWishlist(userId, productId);
  }
}

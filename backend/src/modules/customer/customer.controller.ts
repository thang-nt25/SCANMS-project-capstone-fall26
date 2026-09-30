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
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { ChangeCustomerPasswordDto } from './dto/change-password.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { SetPasswordWithOtpDto, VerifyPasswordOtpDto } from './dto/set-password-otp.dto';
import { VerifyCustomerIdentityDto } from './dto/verify-identity.dto';
import { SyncCustomerCartDto } from './dto/sync-cart.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
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
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản bằng mật khẩu hiện tại' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeCustomerPasswordDto,
  ) {
    return this.customerService.changePassword(userId, dto);
  }

  @Post('send-password-otp')
  @ApiOperation({ summary: 'Gửi mã OTP xác minh qua Email để đổi hoặc thêm mật khẩu mới (Chuẩn Shopee)' })
  async sendPasswordOtp(
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.customerService.sendPasswordSecurityOtp(userId, {
      ipAddress: ip,
      userAgent: userAgent || 'Trình duyệt Web',
    });
  }

  @Post('verify-password-otp')
  @ApiOperation({ summary: 'Xác thực mã OTP gửi qua Email' })
  async verifyPasswordOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPasswordOtpDto,
  ) {
    return this.customerService.verifyPasswordSecurityOtp(userId, dto.otp);
  }

  @Post('set-password-with-otp')
  @ApiOperation({ summary: 'Thiết lập mật khẩu mới sau khi xác thực OTP thành công (Dành cho tài khoản Google hoặc đổi mật khẩu bảo mật)' })
  async setPasswordWithOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: SetPasswordWithOtpDto,
  ) {
    return this.customerService.setPasswordWithOtp(userId, dto);
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

  @Post('orders/:id/return')
  @ApiOperation({ summary: 'Khách hàng gửi yêu cầu Trả hàng / Hoàn tiền' })
  async requestReturnOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: { reason: string; notes?: string; proofImages?: string[]; proofVideos?: string[] },
  ) {
    return this.customerService.requestReturnOrder(userId, orderId, dto);
  }

  // ==========================================
  // 3. XÁC NHẬN, ĐỔI TRẢ, ĐÁNH GIÁ & GIỎ HÀNG
  // ==========================================
  @Post('orders/:id/confirm-receipt')
  @ApiOperation({ summary: 'Khách xác nhận đã nhận hàng để chuyển đơn sang COMPLETED' })
  async confirmReceipt(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.customerService.confirmReceipt(userId, orderId);
  }

  @Get('orders/:id/return-request')
  @ApiOperation({ summary: 'Xem yêu cầu đổi trả/hoàn tiền của đơn hàng' })
  async getReturnRequest(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.customerService.getReturnRequest(userId, orderId);
  }

  @Post('orders/:id/return-request')
  @ApiOperation({ summary: 'Gửi yêu cầu đổi trả trong 14 ngày, bắt buộc ảnh và video mở hộp' })
  async createReturnRequest(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.customerService.createReturnRequest(userId, orderId, dto);
  }

  @Post('orders/:id/reviews')
  @ApiOperation({ summary: 'Đánh giá sản phẩm từ đơn COMPLETED đã xác minh' })
  async createVerifiedReview(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateCustomerReviewDto,
  ) {
    return this.customerService.createVerifiedReview(userId, orderId, dto);
  }

  @Get('cart')
  @ApiOperation({ summary: 'Tải giỏ hàng tập trung của tài khoản từ PostgreSQL' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.customerService.getCart(userId);
  }

  @Put('cart')
  @ApiOperation({ summary: 'Đồng bộ toàn bộ giỏ hàng của tài khoản vào PostgreSQL' })
  async syncCart(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncCustomerCartDto,
  ) {
    return this.customerService.syncCart(userId, dto);
  }

  // ==========================================
  // 4. SỔ ĐỊA CHỈ NHẬN HÀNG
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
  // 5. SẢN PHẨM YÊU THÍCH (WISHLIST)
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

  // ==========================================
  // 5. XÁC MINH CCCD THÔNG TIN CÁ NHÂN (CHUẨN SHOPEE)
  // ==========================================
  @Get('identity')
  @ApiOperation({ summary: 'Lấy thông tin xác minh CCCD của khách hàng (Chuẩn Shopee)' })
  async getIdentity(@CurrentUser('id') userId: string) {
    return this.customerService.getCustomerIdentity(userId);
  }

  @Post('identity')
  @ApiOperation({ summary: 'Xác minh và lưu thông tin CCCD cá nhân (Chuẩn Shopee)' })
  async verifyIdentity(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyCustomerIdentityDto,
  ) {
    return this.customerService.verifyCustomerIdentity(userId, dto);
  }
}


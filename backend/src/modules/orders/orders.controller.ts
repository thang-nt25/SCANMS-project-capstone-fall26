import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { CancelOrderDto, GuestCancelOrderDto } from './dto/cancel-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders & Fulfillment')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Đặt hàng mới (Guest Storefront hoặc Khách hàng trực tuyến)',
    description:
      'Nhận diện mã Coupon hoặc Link rút gọn của KOL, tự động lưu thông tin đơn hàng, tính chiết khấu và phân bổ hoa hồng vào ví chờ.',
  })
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    const cookieAttr =
      req?.cookies?.['scanms_attr'] ||
      req?.cookies?.['scanms_attribution'];
    const cookieRef =
      req?.cookies?.['scanms_referral_link'] ||
      req?.cookies?.['referral_code'] ||
      req?.cookies?.['scanms_ref'];
    if (cookieRef && !dto.cookieRefCode) {
      dto.cookieRefCode = cookieRef;
    }

    const rawIp =
      (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || '';

    return this.ordersService.createOrder(dto, {
      cookieAttr,
      ip: rawIp,
      userAgent,
    });
  }

  @Get('track')
  @ApiOperation({
    summary:
      'FR-17: Tra cứu tiến trình đơn hàng công khai bằng SĐT hoặc Mã đơn',
    description:
      'Khách mua hàng nhập số điện thoại hoặc mã đơn hàng để tra cứu lộ trình vận chuyển: Đã tiếp nhận -> Đang đóng gói -> Đang giao GHN/GHTK -> Giao thành công.',
  })
  async trackOrder(@Query() query: TrackOrderQueryDto) {
    return this.ordersService.trackOrderByPhoneOrSn(query);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'FR-18: Gửi đánh giá & review 5 sao sau khi nhận hàng thành công',
    description:
      'Khách hàng gửi số sao (1-5★) và nhận xét cho sản phẩm trong đơn đã giao (DELIVERED hoặc COMPLETED).',
  })
  async addReview(
    @Param('id') orderId: string,
    @Body() dto: CreateOrderReviewDto,
  ) {
    return this.ordersService.addOrderReview(orderId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hủy đơn hàng an toàn (Chủ Shop, Admin hoặc Người mua sở hữu đơn)',
    description:
      'Chuyển trạng thái đơn sang CANCELLED, hoàn lại lượt và ngân sách cho mã giảm giá, thu hồi hoa hồng trong ví chờ.',
  })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền hủy đơn hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async cancelOrder(
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.cancelOrder(orderId, dto, user);
  }

  @Post(':id/guest-cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Khách mua hàng vãng lai yêu cầu hủy đơn an toàn (Token + SĐT + Rate Limit)',
    description:
      'Yêu cầu cung cấp Cancellation Token (được cấp khi tạo đơn) kết hợp số điện thoại đặt hàng và giới hạn tần suất chống brute-force.',
  })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Đơn hàng không ở trạng thái PENDING hoặc thông tin không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Mã token hoặc số điện thoại xác minh không chính xác',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @ApiResponse({ status: 429, description: 'Quá nhiều lần thử hủy đơn' })
  async guestCancelOrder(
    @Param('id') orderId: string,
    @Body() dto: GuestCancelOrderDto,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    const clientIp = (req.headers['x-forwarded-for'] as string) || ip;
    return this.ordersService.guestCancelOrder(orderId, dto, clientIp);
  }
}

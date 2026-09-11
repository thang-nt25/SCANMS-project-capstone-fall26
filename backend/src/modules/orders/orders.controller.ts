import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { OrderWebhookDto } from './dto/order-webhook.dto';

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
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-19: Tiếp nhận đơn hàng từ sàn thương mại điện tử',
    description:
      'Chuẩn hóa và lưu đơn hàng từ Shopee, TikTok Shop hoặc Shopify theo cơ chế idempotent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đơn đã được tiếp nhận hoặc đã tồn tại',
  })
  @ApiResponse({ status: 400, description: 'Payload webhook không hợp lệ' })
  async receiveWebhook(@Body() dto: OrderWebhookDto) {
    return this.ordersService.receiveWebhook(dto);
  }

  @Get('track')
  @ApiOperation({
    summary: 'FR-17: Tra cứu tiến trình đơn hàng công khai bằng SĐT hoặc Mã đơn',
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
}

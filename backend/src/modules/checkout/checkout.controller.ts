import {
  Controller,
  Post,
  Body,
  Req,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrdersService } from '../orders/orders.service';
import { PayosPaymentService } from '../orders/payos-payment.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Checkout & Orders')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly ordersService: OrdersService, private readonly payosPaymentService: PayosPaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Tạo đơn hàng thanh toán (Checkout) và tự động ghi nhận Cookie Attribution',
  })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công' })
  async checkout(@Body() dto: CreateOrderDto, @Req() req: Request, @CurrentUser('id') userId: string) {
    // Đọc cookie attribution HttpOnly (scanms_attr chuẩn FR-13 hoặc fallback)
    const attributionCookie =
      req.cookies?.['scanms_attr'] ||
      req.cookies?.['scanms_attribution'] ||
      (req.headers['x-attribution-token'] as string) ||
      undefined;

    dto.customerId = userId;
    if (dto.paymentMethod === 'PAYOS') this.payosPaymentService.assertReady();
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    await this.ordersService.checkCreateOrderRateLimit(ip, dto.customerPhone);
    const legacyCookieRef = req.cookies?.scanms_referral_link || req.cookies?.referral_code || req.cookies?.scanms_ref;
    if (legacyCookieRef && !dto.cookieRefCode) dto.cookieRefCode = legacyCookieRef;
    return this.ordersService.createOrder(dto, { cookieAttr: attributionCookie, legacyCookieRef, ip, userAgent: req.get('user-agent') || '' });
  }
}

import {
  Controller,
  Post,
  Body,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Checkout & Orders')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Tạo đơn hàng thanh toán (Checkout) và tự động ghi nhận Cookie Attribution',
  })
  @ApiResponse({ status: 201, description: 'Tạo đơn hàng thành công' })
  async checkout(@Body() dto: CreateOrderDto, @Req() req: Request) {
    // Đọc cookie attribution HttpOnly hoặc header dự phòng
    const attributionCookie =
      req.cookies?.['scanms_attribution'] ||
      (req.headers['x-attribution-token'] as string) ||
      undefined;

    return await this.checkoutService.processCheckout(dto, attributionCookie);
  }
}

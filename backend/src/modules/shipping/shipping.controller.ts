import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GhnService } from './ghn.service';
import { CreateGhnOrderDto, CalculateShippingFeeDto } from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Shipping & GHN Logistics')
@Controller('shipping/ghn')
export class ShippingController {
  constructor(private readonly ghnService: GhnService) {}

  @ApiOperation({
    summary: 'Tạo vận đơn GHN Express chính thức (hoặc GHN Smart Sandbox)',
    description: 'Gọi trực tiếp GHN API để sinh mã vận đơn, tính cước phí và chuyển đơn hàng sang trạng thái SHIPPING.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @Post('create-order/:orderId')
  async createGhnOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CreateGhnOrderDto,
    @Req() req: any,
  ) {
    const storeId = req.user?.storeId;
    return this.ghnService.createShippingOrder(orderId, dto, storeId);
  }

  @ApiOperation({
    summary: 'Tính phí giao hàng nhanh GHN',
  })
  @Post('fee')
  @HttpCode(HttpStatus.OK)
  async calculateFee(@Body() dto: CalculateShippingFeeDto) {
    return this.ghnService.calculateShippingFee(dto);
  }

  @ApiOperation({
    summary: 'Tra cứu hành trình vận chuyển GHN',
  })
  @Get('track/:orderCode')
  async trackOrder(@Param('orderCode') orderCode: string) {
    return this.ghnService.trackOrder(orderCode);
  }

  @ApiOperation({
    summary: 'Lấy token in phiếu giao hàng chuẩn A6 của GHN',
  })
  @Get('print-token/:orderCode')
  async getPrintToken(@Param('orderCode') orderCode: string) {
    return this.ghnService.generatePrintToken([orderCode]);
  }

  @ApiOperation({
    summary: 'Webhook nhận thông báo trạng thái giao hàng từ GHN Express',
  })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleGhnWebhook(@Body() body: any) {
    return this.ghnService.handleGhnWebhook(body);
  }
}

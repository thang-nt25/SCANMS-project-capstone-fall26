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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GhnService } from './ghn.service';
import { CreateGhnOrderDto, CalculateShippingFeeDto, QuoteShippingAddressDto } from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@ApiTags('Shipping & GHN Logistics')
@Controller('shipping/ghn')
export class ShippingController {
  constructor(
    private readonly ghnService: GhnService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('provinces')
  getProvinces() { return this.ghnService.getProvinces(); }

  @Get('districts/:provinceId')
  getDistricts(@Param('provinceId', ParseIntPipe) provinceId: number) {
    return this.ghnService.getDistricts(provinceId);
  }

  @Get('wards/:districtId')
  getWards(@Param('districtId', ParseIntPipe) districtId: number) {
    return this.ghnService.getWards(districtId);
  }

  @ApiOperation({
    summary: 'Tạo vận đơn GHN Express chính thức (hoặc GHN Smart Sandbox)',
    description:
      'Gọi trực tiếp GHN API để sinh mã vận đơn, tính cước phí và chuyển đơn hàng sang trạng thái SHIPPING.',
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
    const userId = req.user?.id || req.user?.sub;
    let storeId: string | undefined;
    if (req.user?.role === UserRole.SHOP_MANAGER) {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: userId, deletedAt: null },
        select: { id: true },
      });
      if (!store) throw new ForbiddenException('Tài khoản không quản lý gian hàng.');
      storeId = store.id;
    }
    return this.ghnService.createShippingOrder(orderId, dto, storeId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('create-sample/:requestId')
  async createSampleGhnOrder(@Param('requestId') requestId: string, @Req() req: any) {
    return this.ghnService.createSampleShippingOrder(requestId, req.user?.id || req.user?.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR)
  @Post('sync-sample/:requestId')
  async syncSampleDelivery(@Param('requestId') requestId: string, @Req() req: any) {
    return this.ghnService.syncSampleDelivery(requestId, req.user?.id || req.user?.sub);
  }

  @ApiOperation({
    summary: 'Tính phí giao hàng nhanh GHN',
  })
  @Post('fee')
  @HttpCode(HttpStatus.OK)
  async calculateFee(@Body() dto: CalculateShippingFeeDto) {
    return this.ghnService.calculateShippingFee(dto);
  }

  @Post('quote-address')
  @HttpCode(HttpStatus.OK)
  async quoteAddress(@Body() dto: QuoteShippingAddressDto) {
    return this.ghnService.quoteAddress(dto.address, dto.weight, dto.insuranceValue, dto.storeId);
  }

  @ApiOperation({
    summary: 'Tra cứu hành trình vận chuyển GHN',
  })
  @Get('track/:orderCode')
  async trackOrder(@Param('orderCode') orderCode: string) {
    const { ghnRawDetail, ...publicTracking } = await this.ghnService.trackOrder(orderCode);
    return publicTracking;
  }

  @ApiOperation({
    summary: 'Lấy token in phiếu giao hàng chuẩn A6 của GHN',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @Get('print-token/:orderCode')
  async getPrintToken(@Param('orderCode') orderCode: string, @Req() req: any) {
    if (req.user?.role === UserRole.SHOP_MANAGER) {
      const userId = req.user?.id || req.user?.sub;
      const [order, sample] = await Promise.all([
        this.prisma.order.findFirst({
          where: { rawPayload: { path: ['ghnOrderCode'], equals: orderCode }, store: { ownerId: userId } },
          select: { id: true },
        }),
        this.prisma.sampleProductRequest.findFirst({
          where: { trackingNumber: orderCode, product: { store: { ownerId: userId } } },
          select: { id: true },
        }),
      ]);
      if (!order && !sample) throw new ForbiddenException('Mã vận đơn không thuộc Shop của bạn.');
    }
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

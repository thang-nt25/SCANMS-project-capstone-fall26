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
  ParseUUIDPipe,
  Headers,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GhnService } from './ghn.service';
import { CreateGhnOrderDto, CreateSampleGhnOrderDto, CalculateShippingFeeDto, QuoteShippingAddressDto, GhnEnvironment } from './dto/shipping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { managedStoreWhere } from '../../common/policies/store-access.policy';

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
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, store: managedStoreWhere(userId) },
        select: { storeId: true },
      });
      if (!order) throw new ForbiddenException('Tài khoản không quản lý gian hàng của đơn này.');
      storeId = order.storeId;
    }
    return this.ghnService.createShippingOrder(orderId, dto, storeId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @Post('simulation/:orderId/start')
  async startCustomerSimulation(@Param('orderId', new ParseUUIDPipe()) orderId: string, @Req() req: any) {
    const storeId = await this.simulationStoreId(req);
    return this.ghnService.startCustomerSimulation(orderId, storeId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @Post('simulation/:orderId/complete')
  async completeCustomerSimulation(@Param('orderId', new ParseUUIDPipe()) orderId: string, @Req() req: any) {
    const storeId = await this.simulationStoreId(req);
    return this.ghnService.completeCustomerSimulation(orderId, req.user?.id || req.user?.sub, storeId);
  }

  private async simulationStoreId(req: any): Promise<string | undefined> {
    if (req.user?.role !== UserRole.SHOP_MANAGER) return undefined;
    const store = await this.prisma.store.findFirst({
      where: { ownerId: req.user?.id || req.user?.sub, deletedAt: null }, select: { id: true },
    });
    if (!store) throw new ForbiddenException('Tài khoản không quản lý gian hàng.');
    return store.id;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('create-sample/:requestId')
  async createSampleGhnOrder(@Param('requestId') requestId: string, @Req() req: any, @Body() dto: CreateSampleGhnOrderDto) {
    return this.ghnService.createSampleShippingOrder(requestId, req.user?.id || req.user?.sub, dto.environment);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.COLLABORATOR)
  @Get('sandbox-sample/:orderCode')
  sandboxSampleState(@Param('orderCode') code: string, @Req() req: any) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('sandbox-sample/:orderCode/start')
  sandboxSampleStart(@Param('orderCode') code: string, @Req() req: any) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub, 'start');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('sandbox-sample/:orderCode/pay-shipping')
  sandboxSamplePayShipping(@Param('orderCode') code: string, @Req() req: any) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub, 'pay-shipping');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('sandbox-sample/:orderCode/receive')
  sandboxSampleReceive(@Param('orderCode') code: string, @Req() req: any) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub, 'receive');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER)
  @Post('sandbox-sample/:orderCode/expire')
  sandboxSampleExpire(@Param('orderCode') code: string, @Req() req: any) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub, 'expire');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR)
  @Post('sandbox-sample/:orderCode/video')
  sandboxSampleVideo(@Param('orderCode') code: string, @Req() req: any, @Body('videoUrl') videoUrl: string, @Body('title') title?: string, @Body('caption') caption?: string) {
    return this.ghnService.sandboxSampleState(code, req.user?.id || req.user?.sub, 'video', videoUrl, { title, caption });
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
    if (dto.items) return this.ghnService.quoteCart(dto.storeId, dto.address, dto.items);
    return this.ghnService.quoteAddress(dto.address, dto.weight, dto.insuranceValue, dto.storeId);
  }

  @ApiOperation({
    summary: 'Tra cứu hành trình vận chuyển GHN',
  })
  @Get('track/:orderCode')
  async trackOrder(@Param('orderCode') orderCode: string, @Query('environment') environment?: GhnEnvironment) {
    if (environment && !Object.values(GhnEnvironment).includes(environment)) throw new ForbiddenException('Môi trường GHN không hợp lệ.');
    const { ghnRawDetail, ...publicTracking } = await this.ghnService.trackOrder(orderCode, environment);
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
  async handleGhnWebhook(@Body() body: any, @Headers('x-ghn-webhook-secret') secret?: string) {
    return this.ghnService.handleGhnWebhook(body, secret);
  }
}

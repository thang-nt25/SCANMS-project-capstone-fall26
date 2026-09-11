import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { OrderWebhookDto } from './dto/order-webhook.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ManualOrdersService } from './manual-orders.service';
import type { OrderManagerIdentity } from './manual-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ExcelOrderImportService,
  MAX_EXCEL_FILE_SIZE_BYTES,
} from './excel-order-import.service';
import { ImportOrdersDto } from './dto/import-orders.dto';

@ApiTags('Orders & Fulfillment')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly manualOrdersService: ManualOrdersService,
    private readonly excelOrderImportService: ExcelOrderImportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Đặt hàng mới (Guest Storefront hoặc Khách hàng trực tuyến)',
    description:
      'Nhận diện mã Coupon hoặc Link rút gọn của KOL và lưu đơn hàng. Hoa hồng được chuyển vào ví chờ sau khi giao hàng thành công.',
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

  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FR-20: Tạo đơn hàng thủ công' })
  @ApiResponse({ status: 201, description: 'Tạo đơn thủ công thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đơn hàng không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Mã đơn hàng đã tồn tại' })
  async createManualOrder(
    @CurrentUser() manager: OrderManagerIdentity,
    @Body() dto: CreateManualOrderDto,
  ) {
    return this.manualOrdersService.createManualOrder(manager, dto);
  }

  @Post('import-excel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_EXCEL_FILE_SIZE_BYTES },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'FR-20: Import danh sách đơn hàng từ Excel' })
  @ApiResponse({
    status: 200,
    description: 'Trả kết quả import theo từng dòng',
  })
  @ApiResponse({ status: 400, description: 'File hoặc dữ liệu không hợp lệ' })
  async importExcelOrders(
    @CurrentUser() manager: OrderManagerIdentity,
    @Body() dto: ImportOrdersDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.excelOrderImportService.importOrders(manager, dto, file);
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
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Headers,
  ParseUUIDPipe,
  Res,
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
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderCreatedResponseDto,
  PublicOrderDetailResponseDto,
  PaymentWebhookDto,
} from './dto/order-response.dto';
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
import { ManualOrderDiscountDto } from './dto/manual-order-discount.dto';
import {
  CancelOrderDto,
  GuestCancelOrderDto,
  RequestCancellationOtpDto,
} from './dto/cancel-order.dto';
import {
  ReviewMediaService,
  MAX_REVIEW_UPLOAD_BYTES,
} from './review-media.service';
import { UploadReviewMediaDto } from './dto/upload-review-media.dto';
import {
  UpdateOrderFulfillmentDto,
  QueryStoreOrdersDto,
} from './dto/fulfillment-order.dto';

function readCookie(req: Request, names: string[]): string | undefined {
  const cookies: unknown = req.cookies;
  if (!cookies || typeof cookies !== 'object') return undefined;
  for (const name of names) {
    const value: unknown = (cookies as Record<string, unknown>)[name];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

@ApiTags('Orders & Fulfillment')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly manualOrdersService: ManualOrdersService,
    private readonly excelOrderImportService: ExcelOrderImportService,
    private readonly reviewMediaService: ReviewMediaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Đặt hàng mới (Guest Storefront hoặc Khách hàng trực tuyến)',
    description:
      'Nhận diện mã Coupon hoặc Link rút gọn của KOL và lưu đơn hàng. Hoa hồng được chuyển vào ví chờ sau khi giao hàng thành công.',
  })
  @ApiResponse({
    status: 201,
    description: 'Đặt hàng thành công',
    type: OrderCreatedResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({
    status: 409,
    description:
      'IDEMPOTENCY_CONFLICT: Khóa đặt hàng đã tồn tại nhưng payload bị sửa đổi',
  })
  @ApiResponse({
    status: 422,
    description: 'Sản phẩm hoặc phân loại đã hết hàng',
  })
  @ApiResponse({
    status: 429,
    description: 'Quá nhiều yêu cầu tạo đơn trong 1 phút',
  })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ kèm requestId' })
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await this.ordersService.checkCreateOrderRateLimit(rawIp, dto.customerPhone);

    const cookieAttr = readCookie(req, ['scanms_attr', 'scanms_attribution']);
    const legacyCookieRef = readCookie(req, [
      'scanms_referral_link',
      'referral_code',
      'scanms_ref',
    ]);
    if (legacyCookieRef && !dto.cookieRefCode) {
      dto.cookieRefCode = legacyCookieRef;
    }

    const userAgent = req.get('user-agent') || '';

    return this.ordersService.createOrder(dto, {
      cookieAttr,
      legacyCookieRef,
      ip: rawIp,
      userAgent,
    });
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
  async receiveWebhook(
    @Body() dto: OrderWebhookDto,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    return this.ordersService.receiveWebhook(dto, secret);
  }

  @Post('payment-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'FR-16: Tiếp nhận webhook đối soát thanh toán VietQR từ cổng thanh toán/ngân hàng',
    description:
      'Xác thực chữ ký HMAC-SHA256, kiểm tra số tiền và cập nhật trạng thái đơn sang PAID kèm ghi nhận AuditLog nguyên tử.',
  })
  @ApiResponse({ status: 200, description: 'Đối soát thanh toán thành công' })
  @ApiResponse({ status: 400, description: 'Số tiền hoặc đơn hàng không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chữ ký webhook không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async reconcilePayment(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-payment-webhook-secret') secretHeader?: string,
    @Headers('x-webhook-signature') signatureHeader?: string,
    @Headers('x-signature') altSignatureHeader?: string,
    @Req() req?: Request,
  ) {
    const signatureOrSecret = signatureHeader || altSignatureHeader || secretHeader;
    const rawBody = (req as any)?.rawBody;
    return this.ordersService.reconcilePayment(dto, signatureOrSecret, rawBody);
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

  @Post('manual/discount')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FR-20: Kiểm tra mã giảm giá cho đơn thủ công' })
  async quoteManualDiscount(
    @CurrentUser() manager: OrderManagerIdentity,
    @Body() dto: ManualOrderDiscountDto,
  ) {
    return this.manualOrdersService.quoteDiscount(manager, dto);
  }

  @Get('import-excel/template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FR-20: Tải file Excel mẫu' })
  async downloadOrderTemplate(@Res() response: Response) {
    const buffer = await this.excelOrderImportService.createTemplate();
    response.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="scanms-order-import-template.xlsx"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.send(buffer);
  }

  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy danh sách đơn hàng thực tế của Gian hàng (Fulfillment & Tracking)',
    description:
      'Trả về danh sách đơn hàng thực tế từ database kèm sản phẩm, người mua, hoa hồng KOL, mã vận đơn bưu cục',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách đơn hàng thành công' })
  async getMyStoreOrders(
    @CurrentUser() manager: OrderManagerIdentity,
    @Query() query: QueryStoreOrdersDto,
  ) {
    return this.ordersService.getMyStoreOrders(manager.id, manager.role, query);
  }

  @Patch(':id/fulfillment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật trạng thái giao hàng & mã vận đơn bưu cục cho đơn hàng',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái đơn hàng thành công' })
  async updateOrderFulfillment(
    @CurrentUser() manager: OrderManagerIdentity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderFulfillmentDto,
  ) {
    return this.ordersService.updateOrderFulfillment(id, manager.id, manager.role, dto);
  }

  @Get('track')
  @ApiOperation({
    summary:
      'FR-17: Tra cứu tiến trình đơn hàng công khai bằng SĐT hoặc Mã đơn',
    description:
      'Khách mua hàng nhập số điện thoại hoặc mã đơn hàng để tra cứu lộ trình vận chuyển: Đã tiếp nhận -> Đang đóng gói -> Đang giao GHN/GHTK -> Giao thành công.',
  })
  async trackOrder(@Query() query: TrackOrderQueryDto, @Ip() ip: string) {
    await this.ordersService.checkPublicOrderRateLimit(ip);
    return this.ordersService.trackOrderByPhoneOrSn(query);
  }

  @Post(':id/review/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_REVIEW_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'FR-18: Upload ảnh/video sau xác minh đơn hàng' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'productId', 'reviewToken'],
      properties: {
        file: { type: 'string', format: 'binary' },
        productId: { type: 'string', format: 'uuid' },
        reviewToken: { type: 'string' },
      },
    },
  })
  async uploadReviewMedia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: UploadReviewMediaDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Ip() ip: string,
  ) {
    await this.ordersService.checkPublicOrderRateLimit(ip);
    return this.reviewMediaService.upload(orderId, dto, file);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'FR-18: Gửi đánh giá & review 5 sao sau khi nhận hàng thành công',
    description:
      'Khách hàng gửi số sao (1-5★) và nhận xét cho sản phẩm trong đơn đã giao (DELIVERED hoặc COMPLETED).',
  })
  async addReview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: CreateOrderReviewDto,
    @Ip() ip: string,
  ) {
    await this.ordersService.checkPublicOrderRateLimit(ip);
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
    @CurrentUser() user: OrderManagerIdentity,
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
    description:
      'Đơn hàng không ở trạng thái PENDING hoặc thông tin không hợp lệ',
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
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ip;
    return this.ordersService.guestCancelOrder(orderId, dto, clientIp);
  }

  @Get('public/:publicCode')
  @ApiOperation({
    summary:
      'FR-16 & FR-17: Tra cứu chi tiết đơn hàng cho khách vãng lai (Mã đơn + SĐT/Token)',
    description:
      'Chỉ trả thông tin cần thiết và che PII khách hàng, không lộ hoa hồng hay thông tin nội bộ.',
  })
  @ApiResponse({ status: 200, description: 'Thông tin đơn hàng an toàn' })
  @ApiResponse({
    status: 403,
    description: 'Chưa xác thực đúng số điện thoại hoặc mã token',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getPublicOrder(
    @Param('publicCode') publicCode: string,
    @Query('phone') phone?: string,
    @Query('token') token?: string,
    @Ip() ip?: string,
  ) {
    await this.ordersService.checkPublicOrderRateLimit(ip || '127.0.0.1');
    return this.ordersService.getPublicOrderDetail(publicCode, phone, token);
  }

  @Post('public/:publicCode/request-cancellation-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-16: Yêu cầu mã OTP hủy đơn hàng công khai',
    description:
      'Gửi mã OTP 6 chữ số đến số điện thoại đặt hàng để khách xác thực hủy đơn khi không còn cancellationToken.',
  })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được tạo và gửi thành công' })
  @ApiResponse({ status: 400, description: 'Thông tin hoặc trạng thái đơn không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Số điện thoại không khớp' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @ApiResponse({ status: 429, description: 'Quá nhiều yêu cầu gửi OTP' })
  async requestCancellationOtp(
    @Param('publicCode') publicCode: string,
    @Body() dto: RequestCancellationOtpDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ip;
    return this.ordersService.requestCancellationOtp(publicCode, dto, clientIp);
  }

  @Post('public/:publicCode/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'FR-16: Khách vãng lai hủy đơn hàng qua mã đơn công khai',
    description:
      'Hủy đơn an toàn bằng mã đơn công khai kết hợp token hoặc số điện thoại và OTP',
  })
  async publicCancelOrder(
    @Param('publicCode') publicCode: string,
    @Body() dto: GuestCancelOrderDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || ip;
    return this.ordersService.guestCancelOrder(publicCode, dto, clientIp);
  }
}



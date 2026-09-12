import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Ip,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApproveCouponDto } from './dto/approve-coupon.dto';
import { RejectCouponDto } from './dto/reject-coupon.dto';
import { BlockCouponDto } from './dto/block-coupon.dto';
import { UpdateCouponPolicyDto } from './dto/update-policy.dto';
import { SoftDeleteCouponDto } from './dto/soft-delete-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';

// =========================================================================
// 1. PUBLIC CHECKOUT CONTROLLER (GUEST & LOGGED IN)
// =========================================================================
@ApiTags('Public - Coupons (FR-12)')
@Controller('coupons')
export class PublicCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra mã giảm giá tại Giỏ hàng/Checkout (Section 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết giảm giá và các sản phẩm đủ điều kiện áp dụng',
  })
  @ApiResponse({
    status: 400,
    description: 'Mã không tồn tại, hết hạn, không đủ điều kiện hoặc vi phạm chính sách cộng dồn',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mã giảm giá tương ứng',
  })
  @ApiResponse({
    status: 429,
    description: 'Vượt quá tần suất kiểm tra mã giảm giá (Rate Limit)',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ nội bộ',
  })
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @Ip() ipAddress: string,
    @Req() req: any,
  ) {
    const sessionId = req.headers['x-session-id'] as string;
    const clientIp = (req.headers['x-forwarded-for'] as string) || ipAddress;
    const userId = req.user?.id;
    const result = await this.service.validateCoupon(
      dto,
      clientIp,
      sessionId,
      userId,
    );

    // Filter out internal collaboratorId from public response (Section 4.4, 20 & 35)
    const { collaboratorId, ...publicResult } = result;
    return publicResult;
  }
}

// =========================================================================
// 2. KOL / CTV CONTROLLER (FR-12)
// =========================================================================
@ApiTags('Collaborator - Coupons (FR-12)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLABORATOR)
@Controller('collaborator/coupons')
export class CollaboratorCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post()
  @ApiOperation({
    summary: 'KOL đề xuất mã giảm giá riêng mới cho Shop hợp tác (Section 6)',
  })
  @ApiResponse({ status: 201, description: 'Đề xuất mã thành công (PENDING_APPROVAL)' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc Shop chưa có chính sách hoa hồng hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực hoặc token hết hạn' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (yêu cầu COLLABORATOR)' })
  @ApiResponse({ status: 409, description: 'Mã coupon đã tồn tại trong hệ thống' })
  @ApiResponse({ status: 429, description: 'Tần suất đề xuất quá nhanh (Rate Limit)' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async proposeCoupon(
    @CurrentUser('id') collaboratorId: string,
    @Body() dto: CreateCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.proposeCoupon(collaboratorId, dto, ipAddress);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách mã giảm giá của tôi kèm số liệu sử dụng (Section 38)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách coupon kèm tổng hợp doanh thu và hoa hồng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async getMyCoupons(
    @CurrentUser('id') collaboratorId: string,
    @Query() query: QueryCouponsDto,
  ) {
    return this.service.getMyCoupons(collaboratorId, query);
  }

  @Get('eligible-stores')
  @ApiOperation({
    summary: 'Lấy danh sách các Gian hàng KOL đã được APPROVED để tạo coupon (FR-12)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách gian hàng hợp lệ' })
  async getEligibleStores(@CurrentUser('id') collaboratorId: string) {
    return this.service.getEligibleStores(collaboratorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết mã giảm giá của tôi' })
  @ApiParam({ name: 'id', description: 'ID của coupon' })
  @ApiResponse({ status: 200, description: 'Chi tiết coupon' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async getCouponDetail(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
  ) {
    return this.service.getCouponDetailForKol(collaboratorId, id);
  }

  @Patch(':id/pause')
  @ApiOperation({
    summary: 'Tạm ngưng hoặc tiếp tục sử dụng mã giảm giá (Section 4.1)',
  })
  @ApiParam({ name: 'id', description: 'ID của coupon' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái tạm dừng thành công kèm cảnh báo đơn đang xử lý nếu có' })
  @ApiResponse({ status: 400, description: 'Trạng thái coupon không cho phép tạm ngưng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập coupon này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async togglePause(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ) {
    return this.service.togglePauseCoupon(collaboratorId, id, ipAddress);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa mềm mã giảm giá của tôi (Section 33)',
  })
  @ApiParam({ name: 'id', description: 'ID của coupon' })
  @ApiResponse({ status: 200, description: 'Xóa mềm coupon thành công' })
  @ApiResponse({ status: 400, description: 'Chỉ có thể xóa coupon ở trạng thái PENDING_APPROVAL hoặc REJECTED' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa coupon này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async deleteCoupon(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
    @Body() dto: SoftDeleteCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.softDeleteCoupon(collaboratorId, id, dto, ipAddress);
  }
}

// =========================================================================
// 3. SHOP CONTROLLER (FR-12)
// =========================================================================
@ApiTags('Store - Coupons (FR-12)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
@Controller('stores/:storeId/coupons')
export class StoreCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách coupon của Gian hàng (Chờ duyệt và Đang áp dụng) (Section 39)',
  })
  @ApiParam({ name: 'storeId', description: 'ID gian hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách coupon của gian hàng' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền quản lý gian hàng này' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async getStoreCoupons(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() query: QueryCouponsDto,
  ) {
    return this.service.getStoreCoupons(storeId, userId, role, query);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Chủ shop phê duyệt và cấu hình chính sách ưu đãi cho coupon (Section 6 & 7)',
  })
  @ApiParam({ name: 'storeId', description: 'ID gian hàng' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Phê duyệt coupon thành công và kích hoạt ACTIVE' })
  @ApiResponse({ status: 400, description: 'Dữ liệu chính sách không hợp lệ hoặc tổng tỷ lệ tài trợ khác 100%' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên gian hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon hoặc gian hàng' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async approveCoupon(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ApproveCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.approveCoupon(storeId, id, userId, role, dto, ipAddress);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Chủ shop từ chối yêu cầu coupon (Bắt buộc nhập lý do) (Section 4.2)',
  })
  @ApiParam({ name: 'storeId', description: 'ID gian hàng' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Từ chối yêu cầu coupon thành công' })
  @ApiResponse({ status: 400, description: 'Lý do từ chối không hợp lệ hoặc trạng thái không phải PENDING' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên gian hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async rejectCoupon(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: RejectCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.rejectCoupon(storeId, id, userId, role, dto, ipAddress);
  }

  @Patch(':id/policy')
  @ApiOperation({
    summary: 'Cập nhật chính sách giảm giá, thời hạn, ngân sách của coupon (Section 4.2)',
  })
  @ApiParam({ name: 'storeId', description: 'ID gian hàng' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Cập nhật chính sách coupon thành công' })
  @ApiResponse({ status: 400, description: 'Thông tin cập nhật không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên gian hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async updatePolicy(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateCouponPolicyDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.updateCouponPolicy(storeId, id, userId, role, dto, ipAddress);
  }

  @Patch(':id/block')
  @ApiOperation({
    summary: 'Khóa hoặc tạm dừng coupon của Shop (Bắt buộc nhập lý do) (Section 4.2)',
  })
  @ApiParam({ name: 'storeId', description: 'ID gian hàng' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Khóa coupon thành công' })
  @ApiResponse({ status: 400, description: 'Lý do khóa không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác trên gian hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async blockCoupon(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: BlockCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.blockCoupon(storeId, id, userId, role, dto, ipAddress);
  }
}

// =========================================================================
// 4. ADMIN CONTROLLER (FR-12)
// =========================================================================
@ApiTags('Admin - Coupons (FR-12)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin tra cứu danh sách toàn bộ coupon trong hệ thống (Section 4.3)' })
  @ApiResponse({ status: 200, description: 'Danh sách coupon toàn hệ thống' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Yêu cầu quyền SYSTEM_ADMIN hoặc SYSTEM_MANAGER' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async getAdminCoupons(@Query() query: QueryCouponsDto) {
    return this.service.getAdminCoupons(query);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Admin khóa coupon gian lận hoặc vi phạm quy định (Section 4.3)' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Khóa coupon thành công' })
  @ApiResponse({ status: 400, description: 'Lý do khóa không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Yêu cầu quyền SYSTEM_ADMIN hoặc SYSTEM_MANAGER' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async blockCoupon(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: BlockCouponDto,
    @Ip() ipAddress: string,
  ) {
    return this.service.adminBlockCoupon(id, adminId, dto, ipAddress);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Admin mở khóa coupon (Section 4.3)' })
  @ApiParam({ name: 'id', description: 'ID coupon' })
  @ApiResponse({ status: 200, description: 'Mở khóa coupon thành công và khôi phục trạng thái ACTIVE' })
  @ApiResponse({ status: 400, description: 'Coupon chưa bị khóa hoặc không thể mở khóa' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Yêu cầu quyền SYSTEM_ADMIN hoặc SYSTEM_MANAGER' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
  @ApiResponse({ status: 500, description: 'Lỗi máy chủ nội bộ' })
  async unblockCoupon(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Ip() ipAddress: string,
  ) {
    return this.service.adminUnblockCoupon(id, adminId, ipAddress);
  }
}

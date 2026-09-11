import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommissionRulesService } from './commission-rules.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { UpdateRuleStatusDto } from './dto/update-rule-status.dto';
import { PreviewCommissionRuleDto } from './dto/preview-commission-rule.dto';
import { SettleMonthlyBonusDto } from './dto/settle-monthly-bonus.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import {
  CommissionRuleResponseDto,
  BonusPreviewResultDto,
} from './dto/commission-rule-response.dto';
import { StoreOwnerGuard } from './guards/store-owner.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('commission-rules')
@ApiBearerAuth('JWT-auth')
@Controller('stores/:storeId/commission-rules')
@UseGuards(StoreOwnerGuard)
export class CommissionRulesController {
  constructor(
    private readonly commissionRulesService: CommissionRulesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách các mốc thưởng doanh số tháng của cửa hàng',
    description:
      'Trả về danh sách mốc thưởng còn hiệu lực của Shop, sắp xếp theo doanh số tối thiểu tăng dần.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách mốc thưởng thành công',
    type: [CommissionRuleResponseDto],
  })
  async findAll(@Param('storeId', ParseUUIDPipe) storeId: string) {
    return this.commissionRulesService.findAll(storeId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Lịch sử chốt thưởng doanh số tháng của cửa hàng',
    description:
      'Xem danh sách kết quả chốt thưởng của các KOL kèm snapshot mốc thưởng đã áp dụng.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiQuery({
    name: 'yearMonth',
    required: false,
    example: '2026-09',
    description: 'Lọc theo kỳ tháng (YYYY-MM)',
  })
  async getSettlementHistory(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    return this.commissionRulesService.getSettlementHistory(storeId, yearMonth);
  }

  @Get('kol-progress/:collaboratorId')
  @ApiOperation({
    summary: 'Xem tiến độ doanh số và mốc thưởng của KOL trong tháng',
    description:
      'Hiển thị doanh số hiện tại, mốc đã đạt, tiền thưởng dự kiến và số tiền còn thiếu để đạt mốc tiếp theo.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'collaboratorId', description: 'ID định danh của KOL (UUID)' })
  @ApiQuery({
    name: 'yearMonth',
    required: false,
    example: '2026-09',
    description: 'Kỳ tháng cần xem (mặc định tháng hiện tại)',
  })
  async getKolProgress(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    return this.commissionRulesService.getKolProgress(
      storeId,
      collaboratorId,
      yearMonth,
    );
  }

  @Get('kol-revenue/:collaboratorId')
  @ApiOperation({
    summary: 'Xem doanh số tháng thực tế của một KOL từ đơn hàng',
    description:
      'Quét các đơn hàng hoàn thành (COMPLETED) của KOL trong tháng chỉ định và tính tổng doanh số hợp lệ (đã trừ hoàn tiền).',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({
    name: 'collaboratorId',
    description: 'ID định danh của KOL (UUID)',
  })
  @ApiQuery({
    name: 'yearMonth',
    required: true,
    example: '2026-09',
    description: 'Kỳ tháng cần tính (YYYY-MM)',
  })
  async getKolRevenue(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @Query('yearMonth') yearMonth: string,
  ) {
    return this.commissionRulesService.calculateValidMonthlyRevenue(
      storeId,
      collaboratorId,
      yearMonth,
    );
  }

  @Get(':ruleId')
  @ApiOperation({
    summary: 'Xem chi tiết một mốc thưởng doanh số tháng',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'ruleId', description: 'ID định danh của mốc thưởng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết mốc thưởng',
    type: CommissionRuleResponseDto,
  })
  async findOne(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.commissionRulesService.findOne(storeId, ruleId);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo mốc thưởng doanh số tháng mới',
    description:
      'Thêm mốc thưởng cho Shop. Kiểm tra trùng ngưỡng, kiểm tra thứ tự hợp lý và ghi audit log trong cùng transaction.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo mốc thưởng thành công',
    type: CommissionRuleResponseDto,
  })
  async create(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: CreateCommissionRuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.create(
      storeId,
      dto,
      user?.id,
      ipAddress,
    );
  }

  @Patch(':ruleId')
  @ApiOperation({
    summary: 'Cập nhật mốc thưởng doanh số tháng',
    description:
      'Chỉnh sửa thông tin mốc thưởng. Kiểm tra tính hợp lệ và ghi audit log.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'ruleId', description: 'ID định danh của mốc thưởng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật mốc thưởng thành công',
    type: CommissionRuleResponseDto,
  })
  async update(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateCommissionRuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.update(
      storeId,
      ruleId,
      dto,
      user?.id,
      ipAddress,
    );
  }

  @Patch(':ruleId/status')
  @ApiOperation({
    summary: 'Kích hoạt hoặc tạm ngừng áp dụng một mốc thưởng',
    description:
      'Chuyển đổi trạng thái isActive giữa true (đang áp dụng) và false (tạm ngừng).',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'ruleId', description: 'ID định danh của mốc thưởng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái thành công',
  })
  async updateStatus(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateRuleStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.updateStatus(
      storeId,
      ruleId,
      dto.isActive,
      user?.id,
      ipAddress,
    );
  }

  @Post(':ruleId/restore')
  @ApiOperation({
    summary: 'Khôi phục mốc thưởng đã bị xóa mềm',
    description: 'Khôi phục lại mốc thưởng nếu không bị xung đột với mốc hiện tại.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'ruleId', description: 'ID định danh của mốc thưởng (UUID)' })
  async restore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.restore(
      storeId,
      ruleId,
      user?.id,
      ipAddress,
    );
  }

  @Delete(':ruleId')
  @ApiOperation({
    summary: 'Xóa mềm mốc thưởng doanh số tháng',
    description:
      'Đánh dấu mốc thưởng đã xóa (isDeleted = true, deletedAt = now()), không xóa vật lý để bảo toàn lịch sử.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'ruleId', description: 'ID định danh của mốc thưởng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Xóa mềm thành công',
  })
  async remove(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.remove(
      storeId,
      ruleId,
      user?.id,
      ipAddress,
    );
  }

  @Post('preview')
  @ApiOperation({
    summary: 'Mô phỏng tính thưởng doanh số tháng theo công thức lũy tiến từng khoảng',
    description:
      'Tính toán chi tiết thưởng KPI cố định và thưởng phần vượt lũy tiến từng khoảng doanh số. Không phát sinh ghi nợ ví.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Kết quả mô phỏng tính thưởng lũy tiến',
    type: BonusPreviewResultDto,
  })
  async previewBonus(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: PreviewCommissionRuleDto,
  ) {
    const revenueToSimulate = dto.monthlyRevenue || dto.revenue || '0';
    return this.commissionRulesService.previewBonus(
      storeId,
      revenueToSimulate,
    );
  }

  @Post('settle')
  @ApiOperation({
    summary: 'Chốt tính thưởng doanh số tháng cho một KOL (Trạng thái: PENDING, Chống tính trùng lặp - Idempotent)',
    description:
      'Tổng hợp doanh số đơn hàng COMPLETED (đã trừ hoàn tiền), tính thưởng lũy tiến, lưu snapshot kết quả. Nếu kỳ đã chốt thì giữ nguyên kết quả.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Kết quả chốt thưởng tháng',
  })
  async settleMonthlyBonus(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: SettleMonthlyBonusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.settleMonthlyBonus(
      storeId,
      dto.collaboratorId,
      dto.yearMonth,
      user?.id,
      ipAddress,
      dto.allowUnfinishedMonth,
    );
  }

  @Patch('settlements/:settlementId/approve')
  @ApiOperation({
    summary: 'Duyệt kỳ thưởng tháng (Chuyển trạng thái từ PENDING sang APPROVED)',
    description: 'Chủ Shop duyệt kỳ thưởng đã tính toán để chuẩn bị chi trả vào ví.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'settlementId', description: 'ID kết quả chốt thưởng (UUID)' })
  async approveSettlement(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.approveSettlement(
      storeId,
      settlementId,
      user?.id,
      ipAddress,
    );
  }

  @Post('settlements/:settlementId/payout')
  @ApiOperation({
    summary: 'Chi trả tiền thưởng vào Ví KOL (Chuyển APPROVED sang PAID + cộng Wallet + Sổ cái Ledger)',
    description: 'Cộng tiền thưởng đã duyệt vào ví khả dụng của KOL, ghi Sổ cái tài chính FinancialLedger.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  @ApiParam({ name: 'settlementId', description: 'ID kết quả chốt thưởng (UUID)' })
  async payoutSettlement(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.payoutSettlement(
      storeId,
      settlementId,
      user?.id,
      ipAddress,
    );
  }

  @Post('adjustments/refund')
  @ApiOperation({
    summary: 'Xử lý hoàn tiền đơn hàng và tạo khoản điều chỉnh âm (BonusAdjustment) nếu đã chốt thưởng',
    description:
      'Ghi nhận hoàn tiền. Nếu đơn thuộc kỳ đã chốt thưởng, tính lại tiền thưởng đúng và tự động tạo khoản khấu trừ âm cho kỳ tiếp theo.',
  })
  @ApiParam({ name: 'storeId', description: 'ID định danh của cửa hàng (UUID)' })
  async handleRefundAdjustment(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Body() dto: RefundOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.commissionRulesService.handleRefundAdjustment(
      storeId,
      dto.orderId,
      dto.refundAmount,
      dto.reason,
      user?.id,
      ipAddress,
    );
  }
}

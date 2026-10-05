import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SampleRequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SamplesService } from './samples.service';
import {
  AdminResolveSampleRequestDto,
  CreateSampleRequestDto,
  RejectSampleRequestDto,
  ReportSampleDeliveryIssueDto,
  ShipSampleRequestDto,
  SubmitSampleVideoDto,
} from './dto/sample-request.dto';

@ApiTags('Sample Requests (FR-26)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sample-requests')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  // ---- KOL endpoints ----

  @Post()
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Tạo yêu cầu xin sản phẩm mẫu dùng thử' })
  createRequest(@Body() dto: CreateSampleRequestDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.createRequest(userId, dto);
  }

  @Get('my')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Lấy danh sách yêu cầu xin mẫu của tôi' })
  getMyRequests(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getMyRequests(userId);
  }

  @Get('my/eligibility')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Kiểm tra quyền xin mẫu và kênh mạng xã hội đã liên kết' })
  getMyEligibility(@Request() req: any) {
    return this.samplesService.getMyEligibility(req.user?.id || req.user?.sub);
  }

  @Patch(':id/cancel')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Hủy yêu cầu khi Shop chưa duyệt' })
  cancelRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.samplesService.cancelRequest(id, req.user?.id || req.user?.sub);
  }

  @Patch(':id/receive')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Xác nhận đã nhận mẫu và bắt đầu hạn nộp video 14 ngày' })
  confirmReceived(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.samplesService.confirmReceived(id, req.user?.id || req.user?.sub);
  }

  @Post(':id/video')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Nộp link video gắn với yêu cầu mẫu này' })
  submitVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSampleVideoDto,
    @Request() req: any,
  ) {
    return this.samplesService.submitVideo(id, req.user?.id || req.user?.sub, dto);
  }

  @Patch(':id/delivery-issue')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Báo sự cố giao nhận mẫu' })
  reportDeliveryIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportSampleDeliveryIssueDto,
    @Request() req: any,
  ) {
    return this.samplesService.reportDeliveryIssue(id, req.user?.id || req.user?.sub, dto);
  }

  // ---- Shop endpoints ----

  @Get('shop')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Lấy tất cả yêu cầu xin mẫu của cửa hàng' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SampleRequestStatus,
    description: 'Lọc theo trạng thái',
  })
  getShopRequests(
    @Request() req: any,
    @Query('status') status?: SampleRequestStatus,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getRequestsForShop(userId, status);
  }

  @Get('shop/stats')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Thống kê số lượng yêu cầu theo trạng thái' })
  getShopStats(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getShopStats(userId);
  }

  @Patch(':id/approve')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Duyệt yêu cầu xin mẫu' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  approveRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.approveRequest(id, userId);
  }

  @Patch(':id/reject')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Từ chối yêu cầu kèm lý do' })
  rejectRequestWithReason(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSampleRequestDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.rejectRequest(id, userId, dto.rejectedReason);
  }

  @Get('admin')
  @Roles('SYSTEM_MANAGER', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: '[Admin] Tra cứu toàn bộ yêu cầu mẫu và lịch sử xử lý' })
  getAdminRequests(@Query('status') status?: SampleRequestStatus) {
    return this.samplesService.getAdminRequests(status);
  }

  @Get('admin/blocked')
  @Roles('SYSTEM_MANAGER', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: '[Admin] Danh sách KOL bị khóa quyền xin mẫu' })
  getBlockedCollaborators() {
    return this.samplesService.getBlockedCollaborators();
  }

  @Patch('admin/:id/resolve')
  @Roles('SYSTEM_MANAGER', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: '[Admin] Gia hạn hạn video hoặc miễn nghĩa vụ mẫu có ghi lý do' })
  resolveRequestAsAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminResolveSampleRequestDto,
    @Request() req: any,
  ) {
    return this.samplesService.resolveRequestAsAdmin(id, req.user?.id || req.user?.sub, dto);
  }

  @Patch('admin/:collaboratorId/unblock')
  @Roles('SYSTEM_ADMIN', 'SYSTEM_MANAGER')
  @ApiOperation({ summary: '[Admin] Mở khóa quyền xin mẫu của KOL' })
  unblockCollaborator(
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    return this.samplesService.unblockCollaborator(
      collaboratorId,
      req.user?.id || req.user?.sub,
      body?.reason,
    );
  }

  @Patch(':id/ship')
  @Roles('SHOP_MANAGER')
  @ApiOperation({
    summary: '[Shop] Nhập mã vận đơn GHTK/GHN và chuyển trạng thái SHIPPED',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  shipRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipSampleRequestDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.shipRequest(id, userId, dto);
  }

  // ---- Shared ----

  @Get(':id')
  @Roles('COLLABORATOR', 'SHOP_MANAGER', 'SYSTEM_MANAGER', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: '[KOL/Shop] Xem chi tiết một yêu cầu' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getRequestById(id, userId, req.user?.role);
  }
}

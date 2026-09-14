import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  DashboardAnalyticsQueryDto,
  TopBreakdownQueryDto,
} from './dto/dashboard-analytics.dto';

@ApiTags('FR-28 — Realtime Sales & Performance Analytics')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ─── 1. Tổng quan chỉ số KPI thời gian thực ──────────────────────────
  @Get('realtime/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy tổng quan KPI thời gian thực (Clicks, Đơn, CR%, Doanh thu, Hoa hồng, VIP Bonus)',
    description: 'Trả về các chỉ số hiệu suất tổng hợp kèm so sánh % tăng trưởng với kỳ trước.',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu KPI tổng quan trả về thành công.' })
  getRealtimeOverview(
    @CurrentUser() user: any,
    @Query() dto: DashboardAnalyticsQueryDto,
  ) {
    return this.dashboardService.getRealtimeOverview(user.id, user.role, dto);
  }

  // ─── 2. Chuỗi thời gian biểu đồ Recharts (Hourly / Daily) ────────────
  @Get('realtime/timeseries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy dữ liệu chuỗi thời gian vẽ biểu đồ (Clicks, Đơn hàng, Doanh thu, Hoa hồng)',
    description: 'Tự động chia theo giờ (khi xem Hôm nay) hoặc theo ngày (7D, 30D, Custom range).',
  })
  @ApiResponse({ status: 200, description: 'Danh sách điểm dữ liệu chuỗi thời gian.' })
  getTimeSeries(
    @CurrentUser() user: any,
    @Query() dto: DashboardAnalyticsQueryDto,
  ) {
    return this.dashboardService.getTimeSeriesMetrics(user.id, user.role, dto);
  }

  // ─── 3. Top sản phẩm bán chạy nhất ──────────────────────────────────
  @Get('realtime/top-products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bảng xếp hạng Top sản phẩm bán chạy và mang lại doanh số cao nhất',
  })
  @ApiResponse({ status: 200, description: 'Danh sách Top sản phẩm xếp hạng theo doanh thu/số lượng.' })
  getTopProducts(
    @CurrentUser() user: any,
    @Query() dto: TopBreakdownQueryDto,
  ) {
    return this.dashboardService.getTopProductsBreakdown(user.id, user.role, dto);
  }

  // ─── 4. Top kênh mạng xã hội hiệu quả nhất ──────────────────────────
  @Get('realtime/top-channels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phân rã hiệu quả theo kênh mạng xã hội (TikTok, Facebook, YouTube, Zalo, v.v.)',
  })
  @ApiResponse({ status: 200, description: 'Tỷ trọng lưu lượng và tỷ lệ chuyển đổi theo kênh.' })
  getTopChannels(
    @CurrentUser() user: any,
    @Query() dto: TopBreakdownQueryDto,
  ) {
    return this.dashboardService.getTopChannelsBreakdown(user.id, user.role, dto);
  }

  // ─── 5. Phễu chuyển đổi (Conversion Funnel) ──────────────────────────
  @Get('realtime/funnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phễu chuyển đổi 3 giai đoạn: Lượt Click ➔ Đơn khởi tạo ➔ Đơn thành công',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu các tầng phễu chuyển đổi.' })
  getConversionFunnel(
    @CurrentUser() user: any,
    @Query() dto: DashboardAnalyticsQueryDto,
  ) {
    return this.dashboardService.getConversionFunnel(user.id, user.role, dto);
  }

  // ─── 6. Hiệu suất chiến dịch độc quyền VIP (FR-27 Integration) ───────
  @Get('realtime/campaigns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thống kê hiệu quả các chiến dịch tiếp thị độc quyền VIP',
  })
  @ApiResponse({ status: 200, description: 'Danh sách chiến dịch kèm số đơn và hoa hồng thưởng phát sinh.' })
  getCampaignPerformance(
    @CurrentUser() user: any,
    @Query() dto: DashboardAnalyticsQueryDto,
  ) {
    return this.dashboardService.getCampaignPerformanceMetrics(user.id, user.role, dto);
  }

  // ─── Cũ (Backward compatibility) ─────────────────────────────────────
  @Get('shop')
  getShopDashboard(@CurrentUser() user: any, @Query('days') days?: string) {
    return this.dashboardService.getShopDashboard(
      user.id,
      days ? parseInt(days) : 30,
    );
  }

  @Get('kol')
  getKolDashboard(@CurrentUser() user: any, @Query('days') days?: string) {
    return this.dashboardService.getKolDashboard(
      user.id,
      days ? parseInt(days) : 30,
    );
  }
}

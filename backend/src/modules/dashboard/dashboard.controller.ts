import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Shop dashboard — doanh thu, đơn, clicks, CR% theo ngày
  @Get('shop')
  getShopDashboard(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.getShopDashboard(user.id, days ? parseInt(days) : 30);
  }

  // KOL dashboard — hoa hồng, clicks, đơn theo ngày
  @Get('kol')
  getKolDashboard(
    @CurrentUser() user: any,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.getKolDashboard(user.id, days ? parseInt(days) : 30);
  }
}

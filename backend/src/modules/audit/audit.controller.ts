import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import {
  QueryAuditLogsDto,
  ExportAuditLogsDto,
} from './dto/audit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Audit Logs - Nhật ký kiểm toán & Giám sát an ninh (FR-32)')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Truy vấn danh sách Audit Logs phân trang và đa tiêu chí
   * GET /api/audit-logs
   */
  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER, UserRole.SHOP_MANAGER)
  @ApiOperation({
    summary: 'Tra cứu danh sách nhật ký kiểm toán hệ thống (FR-32)',
    description:
      'Lọc đa chiều theo hành động, thời gian, người dùng, từ khóa IP/Email/Action, hỗ trợ phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách audit logs kèm thông tin phân trang' })
  async getAuditLogs(
    @Query() query: QueryAuditLogsDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.auditService.getAuditLogs(query, currentUser);
  }

  /**
   * Thống kê KPI tổng quan về hoạt động kiểm toán
   * GET /api/audit-logs/stats
   */
  @Get('stats')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER, UserRole.SHOP_MANAGER)
  @ApiOperation({
    summary: 'Lấy số liệu thống kê tổng quan Audit Logs',
    description: 'Thống kê tổng số sự kiện, sự kiện hôm nay, tỷ lệ phân bổ theo nhóm nghiệp vụ.',
  })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['24h', '7d', '30d', 'all'] })
  async getAuditStats(
    @Query('timeframe') timeframe: '24h' | '7d' | '30d' | 'all' = '30d',
  ) {
    return this.auditService.getAuditStats(timeframe);
  }

  /**
   * Lấy danh mục các mã hành động (Action Codes) trong hệ thống
   * GET /api/audit-logs/actions
   */
  @Get('actions')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER, UserRole.SHOP_MANAGER)
  @ApiOperation({
    summary: 'Lấy danh mục mã hành động kiểm toán (Action Codes)',
    description: 'Cung cấp danh sách metadata phân loại, độ nghiêm trọng và tên tiếng Việt.',
  })
  getAvailableActions() {
    return this.auditService.getAvailableActions();
  }

  /**
   * Xuất danh sách nhật ký kiểm toán ra file CSV
   * GET /api/audit-logs/export
   */
  @Get('export')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER, UserRole.SHOP_MANAGER)
  @ApiOperation({
    summary: 'Xuất dữ liệu kiểm toán ra file CSV',
    description: 'Tải xuống file CSV chuẩn UTF-8 chứa toàn bộ dữ liệu kiểm toán theo bộ lọc.',
  })
  async exportAuditLogs(
    @Query() query: ExportAuditLogsDto,
    @Res() res: Response,
  ) {
    const result = await this.auditService.exportAuditLogsCsv(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    return res.status(HttpStatus.OK).send(result.csvContent);
  }

  /**
   * Xem chi tiết 1 sự kiện kiểm toán theo ID
   * GET /api/audit-logs/:id
   */
  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER, UserRole.SHOP_MANAGER)
  @ApiOperation({
    summary: 'Xem chi tiết 1 bản ghi kiểm toán theo ID',
    description: 'Bóc tách dữ liệu chi tiết JSON Before/After và đối tượng tác động.',
  })
  @ApiParam({ name: 'id', description: 'UUID của bản ghi AuditLog' })
  async getAuditLogById(@Param('id') id: string) {
    return this.auditService.getAuditLogById(id);
  }
}

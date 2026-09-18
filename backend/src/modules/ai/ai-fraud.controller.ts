import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AiFraudService } from './ai-fraud.service';
import {
  FraudScanQueryDto,
  FraudActionDto,
  FraudIncidentDto,
  FraudScanSummaryDto,
} from './dto/ai-fraud.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('AI - Fraud Sentinel & Anomaly Detection (FR-31)')
@ApiBearerAuth()
@Controller('ai/fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiFraudController {
  constructor(private readonly aiFraudService: AiFraudService) {}

  /**
   * Quét toàn diện lưu lượng traffic và phát hiện các sự vụ bất thường
   * GET /api/ai/fraud/scan
   */
  @Get('scan')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    UserRole.SHOP_MANAGER,
    UserRole.COLLABORATOR,
  )
  async scanTraffic(
    @Query() query: FraudScanQueryDto,
    @Req() req: any,
  ): Promise<FraudScanSummaryDto> {
    return this.aiFraudService.scanTraffic(query, req.user);
  }

  /**
   * Lấy danh sách các sự vụ nghi vấn gian lận
   * GET /api/ai/fraud/incidents
   */
  @Get('incidents')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    UserRole.SHOP_MANAGER,
    UserRole.COLLABORATOR,
  )
  async getIncidents(
    @Query() query: FraudScanQueryDto,
    @Req() req: any,
  ): Promise<FraudIncidentDto[]> {
    return this.aiFraudService.getIncidents(query, req.user);
  }

  /**
   * Xem chi tiết phân tích của 1 sự vụ
   * GET /api/ai/fraud/incidents/:id
   */
  @Get('incidents/:id')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    UserRole.SHOP_MANAGER,
    UserRole.COLLABORATOR,
  )
  async getIncidentById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<FraudIncidentDto> {
    return this.aiFraudService.getIncidentById(id, req.user);
  }

  /**
   * Phân tích chuyên sâu chỉ số rủi ro của 1 KOL cụ thể
   * GET /api/ai/fraud/kol/:collaboratorId/analysis
   */
  @Get('kol/:collaboratorId/analysis')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    UserRole.SHOP_MANAGER,
    UserRole.COLLABORATOR,
  )
  async analyzeCollaborator(
    @Param('collaboratorId') collaboratorId: string,
    @Req() req: any,
  ): Promise<FraudIncidentDto> {
    return this.aiFraudService.analyzeCollaboratorFraud(collaboratorId, req.user);
  }

  /**
   * Thực hiện hành động xử lý sự vụ (Đóng băng hoa hồng, tạm ngưng link, bỏ qua)
   * POST /api/ai/fraud/incidents/:id/action
   */
  @Post('incidents/:id/action')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
    UserRole.SHOP_MANAGER,
  )
  async takeAction(
    @Param('id') id: string,
    @Body() actionDto: FraudActionDto,
    @Req() req: any,
  ) {
    return this.aiFraudService.takeActionOnIncident(id, actionDto, req.user);
  }
}

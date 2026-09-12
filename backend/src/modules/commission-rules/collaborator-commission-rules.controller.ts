import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommissionRulesService } from './commission-rules.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('collaborator-bonus')
@ApiBearerAuth('JWT-auth')
@Controller('collaborator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLABORATOR)
export class CollaboratorCommissionRulesController {
  constructor(
    private readonly commissionRulesService: CommissionRulesService,
  ) {}

  @Get('stores')
  @ApiOperation({
    summary: 'Lấy danh sách các cửa hàng có chính sách mốc thưởng doanh số',
    description:
      'Dành cho KOL chọn Shop. Mặc định lọc theo các Shop KOL có quan hệ hợp tác (đơn hàng, chiến dịch, link tiếp thị, hàng mẫu, thưởng tháng). Thêm discovery=true nếu muốn khám phá tất cả các Shop công khai.',
  })
  @ApiQuery({
    name: 'discovery',
    required: false,
    description:
      'Nếu true, trả về toàn bộ Shop công khai có chính sách mốc thưởng; nếu false, lọc theo Shop KOL đã tham gia/liên kết.',
  })
  async getCollaboratorStores(
    @Req() req: AuthenticatedRequest,
    @Query('discovery') discovery?: string,
  ) {
    if (!req.user?.id || req.user.role !== UserRole.COLLABORATOR) {
      throw new UnauthorizedException('Yêu cầu tài khoản xác thực hợp lệ');
    }
    const isDiscovery = discovery === 'true' || discovery === '1';
    return this.commissionRulesService.getCollaboratorStores(
      req.user.id,
      isDiscovery,
    );
  }

  @Get('stores/:storeId/bonus-progress')
  @ApiOperation({
    summary:
      'KOL tự xem tiến độ doanh số và mốc thưởng của chính mình tại một Shop',
    description:
      'Lấy ID của KOL trực tiếp từ JWT token (không cho phép giả mạo ID người khác). Hiển thị doanh số hợp lệ, mốc đã đạt, tiền thưởng dự kiến, các mốc tiếp theo và trạng thái kỳ thưởng.',
  })
  @ApiParam({
    name: 'storeId',
    description: 'ID định danh của cửa hàng (UUID)',
  })
  @ApiQuery({
    name: 'yearMonth',
    required: false,
    example: '2026-09',
    description: 'Kỳ tháng cần xem (YYYY-MM), mặc định là tháng hiện tại',
  })
  async getMyBonusProgress(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Req() req: AuthenticatedRequest,
    @Query('yearMonth') yearMonth?: string,
  ) {
    if (!req.user?.id || req.user.role !== UserRole.COLLABORATOR) {
      throw new UnauthorizedException(
        'Yêu cầu tài khoản xác thực vai trò COLLABORATOR',
      );
    }
    const collaboratorId = req.user.id;
    return this.commissionRulesService.getKolProgress(
      storeId,
      collaboratorId,
      yearMonth,
    );
  }

  @Get('bonus-history')
  @ApiOperation({
    summary: 'KOL tự xem lịch sử nhận thưởng doanh số của chính mình',
    description:
      'Lấy toàn bộ lịch sử các kỳ đã chốt thưởng, đã duyệt hoặc đã chi trả vào ví của KOL từ JWT token.',
  })
  @ApiQuery({
    name: 'storeId',
    required: false,
    description: 'Lọc theo cửa hàng cụ thể (UUID)',
  })
  @ApiQuery({
    name: 'yearMonth',
    required: false,
    example: '2026-09',
    description: 'Lọc theo kỳ tháng (YYYY-MM)',
  })
  async getMyBonusHistory(
    @Req() req: AuthenticatedRequest,
    @Query('storeId') storeId?: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    if (!req.user?.id || req.user.role !== UserRole.COLLABORATOR) {
      throw new UnauthorizedException(
        'Yêu cầu tài khoản xác thực vai trò COLLABORATOR',
      );
    }
    const collaboratorId = req.user.id;
    return this.commissionRulesService.getKolSettlementHistory(
      collaboratorId,
      storeId,
      yearMonth,
    );
  }
}

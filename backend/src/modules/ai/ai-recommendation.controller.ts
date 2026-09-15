import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AiRecommendationService } from './ai-recommendation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  RecommendKolsQueryDto,
  AiRecommendationResponseDto,
  MatchAnalysisRequestDto,
} from './dto/ai-recommendation.dto';

@ApiTags('FR-30 — AI Smart KOL Recommendation & Matching Engine')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiRecommendationController {
  constructor(
    private readonly aiRecommendationService: AiRecommendationService,
  ) {}

  // ─── 1. Gợi ý Top KOLs theo sản phẩm cụ thể ───────────────────────────
  @Get('recommend-kols/:productId')
  @Roles(
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI Gợi ý Top KOLs phù hợp nhất cho 1 sản phẩm cụ thể',
    description:
      'Thuật toán AI phân tích độ trùng khớp ngành hàng, tỷ lệ chuyển đổi CR%, cấp bậc và phân khúc giá để chấm điểm Match Score (0 - 100%).',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID của sản phẩm cần tìm KOLs tương thích',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách Top KOLs gợi ý kèm điểm tương thích và lời giải thích AI.',
    type: AiRecommendationResponseDto,
  })
  getRecommendationsForProduct(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query() query: RecommendKolsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.aiRecommendationService.getRecommendedKols(
      { ...query, productId },
      user.id,
      user.role,
    );
  }

  // ─── 2. Gợi ý KOLs theo bộ lọc tùy chỉnh ──────────────────────────────
  @Get('recommend-kols')
  @Roles(
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI Gợi ý KOLs theo danh mục ngành hàng, phân khúc giá và cấp bậc',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách KOLs được xếp hạng theo điểm tương thích.',
    type: AiRecommendationResponseDto,
  })
  getGeneralRecommendations(
    @Query() query: RecommendKolsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.aiRecommendationService.getRecommendedKols(
      query,
      user.id,
      user.role,
    );
  }

  // ─── 3. Phân tích chi tiết mức độ tương thích 1-1 ────────────────────
  @Post('match-analysis')
  @Roles(
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SYSTEM_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Phân tích chi tiết mức độ tương thích giữa 1 Sản phẩm và 1 KOL cụ thể',
    description:
      'Trả về biểu đồ radar 4 chiều và khuyến nghị hành động hợp tác cho Shop.',
  })
  analyzeMatch(@Body() dto: MatchAnalysisRequestDto) {
    return this.aiRecommendationService.analyzeMatch(dto);
  }
}

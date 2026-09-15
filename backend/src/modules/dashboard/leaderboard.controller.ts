import {
  Controller,
  Get,
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
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LeaderboardQueryDto,
  LeaderboardFullResponseDto,
  LeaderboardPodiumDto,
  MyRankStatusDto,
} from './dto/leaderboard.dto';

@ApiTags('FR-29 — Gamified Creator Leaderboard & Podium')
@ApiBearerAuth()
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // ─── 1. Bảng xếp hạng đầy đủ (Podium + Top 4-20 + My Rank) ────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy Bảng vinh danh Leaderboard đầy đủ (Podium Top 3, Bảng xếp hạng Top 4-20 & Vị trí của tôi)',
    description: 'Hỗ trợ lọc theo Doanh thu GMV, Lượng đơn hàng, Tỷ lệ chốt đơn CR%, Hoa hồng, Tháng/Năm hoặc Phạm vi Gian Hàng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu bảng xếp hạng trả về thành công.',
    type: LeaderboardFullResponseDto,
  })
  getLeaderboard(
    @CurrentUser() user: any,
    @Query() dto: LeaderboardQueryDto,
  ) {
    return this.leaderboardService.getLeaderboard(user.id, user.role, dto);
  }

  // ─── 2. Bục vinh danh Top 1-2-3 (Podium) ──────────────────────────────
  @Get('podium')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách 3 Creators xuất sắc nhất đứng trên bục vinh danh Podium',
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu Bục vinh danh Top 3 (Quán quân, Á quân 1, Á quân 2).',
    type: LeaderboardPodiumDto,
  })
  getPodium(@Query() dto: LeaderboardQueryDto) {
    return this.leaderboardService.getPodiumTop3(dto);
  }

  // ─── 3. Vị trí xếp hạng cá nhân của tôi (My Rank) ────────────────────
  @Get('my-rank')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy vị trí xếp hạng và khoảng cách doanh thu đến Top 10 của Creator đang đăng nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin thứ hạng cá nhân, biến động rankDelta và mục tiêu lên hạng.',
    type: MyRankStatusDto,
  })
  getMyRank(
    @CurrentUser() user: any,
    @Query() dto: LeaderboardQueryDto,
  ) {
    return this.leaderboardService.getMyRankStatus(user.id, user.role, dto);
  }

  // ─── 4. Hồ sơ vinh danh chi tiết của Creator (Creator Hall of Fame) ────
  @Get('creator/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xem hồ sơ vinh danh chi tiết của một Creator bất kỳ trên bảng xếp hạng',
    description: 'Trả về thống kê trọn đời, danh hiệu huy hiệu, mạng xã hội và top sản phẩm bán chạy nhất.',
  })
  @ApiParam({ name: 'id', description: 'ID tài khoản Creator / KOL' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết hồ sơ vinh danh Creator.',
  })
  getCreatorProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.leaderboardService.getCreatorHallOfFameProfile(id);
  }
}

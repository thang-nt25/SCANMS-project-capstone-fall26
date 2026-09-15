import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum LeaderboardMetricType {
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  CONVERSION_RATE = 'CONVERSION_RATE',
  COMMISSION = 'COMMISSION',
}

export enum LeaderboardTimeRange {
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  ALL_TIME = 'all_time',
  CUSTOM = 'custom',
}

export enum LeaderboardScope {
  GLOBAL = 'GLOBAL',
  STORE = 'STORE',
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    description: 'Tiêu chí xếp hạng (REVENUE: Doanh thu GMV, ORDERS: Lượng đơn, CONVERSION_RATE: Tỷ lệ chốt, COMMISSION: Hoa hồng)',
    enum: LeaderboardMetricType,
    default: LeaderboardMetricType.REVENUE,
    example: LeaderboardMetricType.REVENUE,
  })
  @IsOptional()
  @IsEnum(LeaderboardMetricType)
  metric?: LeaderboardMetricType = LeaderboardMetricType.REVENUE;

  @ApiPropertyOptional({
    description: 'Khoảng thời gian xếp hạng (this_month, last_month, this_quarter, all_time, custom)',
    enum: LeaderboardTimeRange,
    default: LeaderboardTimeRange.THIS_MONTH,
    example: LeaderboardTimeRange.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(LeaderboardTimeRange)
  timeRange?: LeaderboardTimeRange = LeaderboardTimeRange.THIS_MONTH;

  @ApiPropertyOptional({
    description: 'Tháng cần xem dữ liệu (1 - 12)',
    example: 9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Năm cần xem dữ liệu (VD: 2026)',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2035)
  year?: number;

  @ApiPropertyOptional({
    description: 'Phạm vi xếp hạng (GLOBAL: Toàn sàn, STORE: Thuộc gian hàng cụ thể)',
    enum: LeaderboardScope,
    default: LeaderboardScope.GLOBAL,
    example: LeaderboardScope.GLOBAL,
  })
  @IsOptional()
  @IsEnum(LeaderboardScope)
  scope?: LeaderboardScope = LeaderboardScope.GLOBAL;

  @ApiPropertyOptional({
    description: 'Lọc theo Store ID cụ thể (Nếu xem trong phạm vi gian hàng)',
    example: '55555555-2929-4000-8000-000000000005',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục sản phẩm (VD: Mỹ phẩm, Công nghệ, Thời trang)',
    example: 'Mỹ phẩm & Làm đẹp',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Số lượng Creator lấy ra (Mặc định 10 cho Top 10, tối đa 50)',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(50)
  limit?: number = 10;
}

export class LeaderboardItemDto {
  @ApiProperty({ description: 'Thứ hạng xếp hạng (1, 2, 3...)', example: 1 })
  rank: number;

  @ApiProperty({ description: 'Biến động thứ hạng so với kỳ trước (+2, -1, 0, NEW)', example: 2 })
  rankDelta: number;

  @ApiProperty({ description: 'ID của Collaborator / KOL', example: '33333333-2929-4000-8000-000000000003' })
  collaboratorId: string;

  @ApiProperty({ description: 'Họ và tên Creator', example: 'Nguyễn Thành Thắng' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Ảnh đại diện Avatar URL', example: 'https://scanms.vn/avatar-thang.png' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Tên handle MXH chính', example: '@thangsetup • TikTok' })
  primaryChannelHandle?: string;

  @ApiPropertyOptional({ description: 'Nền tảng chính (TIKTOK, FACEBOOK, YOUTUBE, INSTAGRAM)', example: 'TIKTOK' })
  primaryPlatform?: string;

  @ApiProperty({ description: 'Cấp bậc danh hiệu (DIAMOND, GOLD, SILVER, BRONZE)', example: 'DIAMOND' })
  tierName: string;

  @ApiProperty({ description: 'Tổng doanh thu GMV tạo ra trong kỳ (VNĐ)', example: 142850000 })
  grossRevenue: number;

  @ApiProperty({ description: 'Số lượng đơn hàng thành công', example: 320 })
  totalOrders: number;

  @ApiProperty({ description: 'Tổng lượt click ghi nhận', example: 5420 })
  totalClicks: number;

  @ApiProperty({ description: 'Tỷ lệ chốt đơn % (Conversion Rate)', example: 5.9 })
  conversionRate: number;

  @ApiProperty({ description: 'Tổng hoa hồng thực nhận trong kỳ (VNĐ)', example: 21427500 })
  totalCommission: number;

  @ApiPropertyOptional({ description: 'Phần thưởng nóng theo thể lệ (VNĐ)', example: 5000000 })
  bonusPrizeAmount?: number;

  @ApiPropertyOptional({ description: 'Huy hiệu vinh danh (VD: Top 1 Doanh Số Tháng, Vua Chốt Đơn)', example: '🏆 Quán Quân Doanh Số Tháng 9' })
  badgeTitle?: string;

  @ApiProperty({ description: 'Có phải là tài khoản của người dùng đang xem không', example: false })
  isCurrentUser: boolean;
}

export class LeaderboardPodiumDto {
  @ApiProperty({ description: 'Hạng 1 - Quán Quân (Gold/Diamond Trophy)', type: LeaderboardItemDto })
  rank1: LeaderboardItemDto | null;

  @ApiProperty({ description: 'Hạng 2 - Á Quân 1 (Silver Medal)', type: LeaderboardItemDto })
  rank2: LeaderboardItemDto | null;

  @ApiProperty({ description: 'Hạng 3 - Á Quân 2 (Bronze Shield)', type: LeaderboardItemDto })
  rank3: LeaderboardItemDto | null;
}

export class MyRankStatusDto {
  @ApiProperty({ description: 'Vị trí thứ hạng hiện tại của tôi', example: 12 })
  myRank: number;

  @ApiProperty({ description: 'Biến động thứ hạng (+3, -1, 0)', example: 3 })
  rankDelta: number;

  @ApiProperty({ description: 'Tổng doanh thu GMV của tôi trong kỳ (VNĐ)', example: 28450000 })
  myRevenue: number;

  @ApiProperty({ description: 'Tổng số đơn hàng của tôi trong kỳ', example: 64 })
  myOrders: number;

  @ApiProperty({ description: 'Khoảng cách doanh thu để vào Top 10 (VNĐ)', example: 6550000 })
  gapToTop10Revenue: number;

  @ApiProperty({ description: 'Khoảng cách doanh thu để lên hạng kế tiếp (VNĐ)', example: 1200000 })
  gapToNextRankRevenue: number;

  @ApiProperty({ description: 'Kỳ xếp hạng đang áp dụng', example: 'Tháng 9/2026' })
  currentPeriodLabel: string;
}

export class LeaderboardFullResponseDto {
  @ApiProperty({ description: 'Tiêu chí xếp hạng', example: 'REVENUE' })
  metric: LeaderboardMetricType;

  @ApiProperty({ description: 'Nhãn kỳ xếp hạng', example: 'Tháng 9/2026' })
  periodLabel: string;

  @ApiProperty({ description: 'Thời điểm cập nhật số liệu', example: '2026-09-15T09:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Dữ liệu Bục Vinh Danh Top 3', type: LeaderboardPodiumDto })
  podium: LeaderboardPodiumDto;

  @ApiProperty({ description: 'Danh sách Top 4 đến 20', type: [LeaderboardItemDto] })
  rankings: LeaderboardItemDto[];

  @ApiPropertyOptional({ description: 'Thông tin thứ hạng của người dùng hiện tại', type: MyRankStatusDto })
  myRankStatus?: MyRankStatusDto;

  @ApiProperty({ description: 'Tổng số Creators tham gia xếp hạng', example: 148 })
  totalParticipants: number;
}

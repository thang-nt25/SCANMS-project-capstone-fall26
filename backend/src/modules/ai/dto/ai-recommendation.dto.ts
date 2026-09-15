import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export enum PriceRangeFilter {
  ALL = 'ALL',
  UNDER_200K = 'UNDER_200K',
  FROM_200K_TO_500K = 'FROM_200K_TO_500K',
  FROM_500K_TO_1M = 'FROM_500K_TO_1M',
  OVER_1M = 'OVER_1M',
}

export class RecommendKolsQueryDto {
  @ApiPropertyOptional({
    description: 'ID sản phẩm của Shop cần tìm KOLs phù hợp nhất',
    example: '77777777-3030-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục ngành hàng (VD: Mỹ phẩm & Làm đẹp, Công nghệ, Thời trang)',
    example: 'Mỹ phẩm & Làm đẹp',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo phân khúc giá sản phẩm',
    enum: PriceRangeFilter,
    default: PriceRangeFilter.ALL,
    example: PriceRangeFilter.ALL,
  })
  @IsOptional()
  @IsEnum(PriceRangeFilter)
  priceRange?: PriceRangeFilter = PriceRangeFilter.ALL;

  @ApiPropertyOptional({
    description: 'Cấp bậc tối thiểu của KOL (BRONZE, SILVER, GOLD, PLATINUM, DIAMOND)',
    example: 'GOLD',
  })
  @IsOptional()
  @IsString()
  minTier?: string;

  @ApiPropertyOptional({
    description: 'Tỷ lệ chốt đơn tối thiểu (Conversion Rate CR% tối thiểu, VD: 3.0)',
    example: 3.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minConversionRate?: number;

  @ApiPropertyOptional({
    description: 'Số lượng KOLs gợi ý cần lấy ra (Mặc định 5, tối đa 20)',
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}

export class ScoreBreakdownDto {
  @ApiProperty({ description: 'Điểm trùng khớp ngành hàng (0 - 100)', example: 95 })
  categoryScore: number;

  @ApiProperty({ description: 'Điểm tỷ lệ chuyển đổi CR% (0 - 100)', example: 88 })
  conversionRateScore: number;

  @ApiProperty({ description: 'Điểm cấp bậc & mạng xã hội (0 - 100)', example: 90 })
  tierAndSocialScore: number;

  @ApiProperty({ description: 'Điểm phù hợp phân khúc giá (0 - 100)', example: 92 })
  priceFitScore: number;
}

export class KolSocialChannelSummaryDto {
  @ApiProperty({ description: 'Nền tảng mạng xã hội', example: 'TIKTOK' })
  platform: string;

  @ApiProperty({ description: 'Tên kênh', example: '@thuylinh.beauty' })
  channelName: string;

  @ApiProperty({ description: 'Đường dẫn kênh', example: 'https://tiktok.com/@thuylinh.beauty' })
  channelUrl: string;

  @ApiProperty({ description: 'Số người theo dõi', example: 250000 })
  followerCount: number;

  @ApiProperty({ description: 'Kênh chính', example: true })
  isPrimary: boolean;
}

export class KolLifetimeStatsSummaryDto {
  @ApiProperty({ description: 'Tổng đơn hàng đã chốt', example: 342 })
  totalOrders: number;

  @ApiProperty({ description: 'Tổng doanh thu GMV tạo ra (VNĐ)', example: 188450000 })
  grossRevenue: number;

  @ApiProperty({ description: 'Tỷ lệ chuyển đổi CR% thực tế', example: 6.8 })
  conversionRate: number;

  @ApiProperty({ description: 'Ngành hàng thế mạnh nhất', example: 'Mỹ phẩm & Làm đẹp' })
  primaryCategory: string;
}

export class KolMatchResultDto {
  @ApiProperty({ description: 'ID định danh của KOL', example: '22222222-3030-4000-8000-000000000001' })
  collaboratorId: string;

  @ApiProperty({ description: 'Họ và tên KOL', example: 'Lê Thuỳ Linh' })
  fullName: string;

  @ApiProperty({ description: 'Email liên hệ', example: 'thuylinh@scanms.test' })
  email: string;

  @ApiProperty({ description: 'Ảnh đại diện', example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Cấp bậc danh hiệu', example: 'Platinum' })
  tierName: string;

  @ApiProperty({ description: 'Tiểu sử / Giới thiệu', example: 'Beauty Blogger chuyên dòng dưỡng ẩm & phục hồi da' })
  bio: string;

  @ApiProperty({ description: 'Điểm tương thích tổng hợp của AI (0 - 100%)', example: 94 })
  matchScore: number;

  @ApiProperty({ description: 'Đánh giá mức độ phù hợp', example: 'Siêu Phù Hợp' })
  matchLevel: string;

  @ApiProperty({ description: 'Chi tiết điểm số 4 tiêu chí', type: ScoreBreakdownDto })
  scoreBreakdown: ScoreBreakdownDto;

  @ApiProperty({
    description: 'Lời giải thích logic do AI phân tích tự động',
    example: 'KOL Lê Thuỳ Linh đạt 94% tương thích nhờ kinh nghiệm bán chạy 342 đơn ngành Mỹ phẩm với tỷ lệ chốt đơn 6.8% vượt trội.',
  })
  aiReasoning: string;

  @ApiProperty({
    description: '3 điểm mạnh nổi bật của KOL đối với sản phẩm này',
    example: ['CR cao 6.8% (Top 5% toàn sàn)', 'Tệp khán giả nữ 85% trùng khớp', 'Đã chốt 340+ đơn Mỹ phẩm'],
  })
  keyStrengths: string[];

  @ApiProperty({ description: 'Kênh mạng xã hội của KOL', type: [KolSocialChannelSummaryDto] })
  socialChannels: KolSocialChannelSummaryDto[];

  @ApiProperty({ description: 'Thống kê hiệu suất lịch sử', type: KolLifetimeStatsSummaryDto })
  lifetimeStats: KolLifetimeStatsSummaryDto;
}

export class TargetProductSummaryDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '77777777-3030-4000-8000-000000000001' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm', example: 'Serum Phục Hồi B5 HA Đậm Đặc' })
  title: string;

  @ApiProperty({ description: 'Danh mục', example: 'Mỹ phẩm & Làm đẹp' })
  category: string;

  @ApiProperty({ description: 'Giá bán (VNĐ)', example: 389000 })
  price: number;

  @ApiProperty({ description: 'Ảnh sản phẩm' })
  imageUrl?: string;

  @ApiProperty({ description: 'Tỷ lệ hoa hồng đề xuất (%)', example: 15.0 })
  commissionRate: number;
}

export class AiRecommendationResponseDto {
  @ApiProperty({ description: 'Thời điểm AI phân tích và tính toán', example: '2026-09-15T10:30:00.000Z' })
  calculatedAt: string;

  @ApiProperty({ description: 'Thông tin sản phẩm đối sánh (nếu có)', type: TargetProductSummaryDto, required: false })
  targetProduct?: TargetProductSummaryDto;

  @ApiProperty({ description: 'Tổng số lượng KOLs tiềm năng được phân tích', example: 120 })
  totalKolsScanned: number;

  @ApiProperty({ description: 'Danh sách Top KOLs có điểm tương thích cao nhất', type: [KolMatchResultDto] })
  recommendedKols: KolMatchResultDto[];
}

export class MatchAnalysisRequestDto {
  @ApiProperty({ description: 'ID sản phẩm cần so khớp', example: '77777777-3030-4000-8000-000000000001' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID của KOL cần đánh giá tương thích', example: '22222222-3030-4000-8000-000000000001' })
  @IsUUID()
  collaboratorId: string;
}

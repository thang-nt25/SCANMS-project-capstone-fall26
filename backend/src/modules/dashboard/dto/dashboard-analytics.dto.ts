import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsTimeInterval {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum AnalyticsQuickRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

export class DashboardAnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'Khoảng thời gian chọn nhanh (today, 7d, 30d, this_month, custom)',
    enum: AnalyticsQuickRange,
    default: AnalyticsQuickRange.LAST_30_DAYS,
    example: AnalyticsQuickRange.LAST_7_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsQuickRange)
  range?: AnalyticsQuickRange = AnalyticsQuickRange.LAST_30_DAYS;

  @ApiPropertyOptional({
    description: 'Số ngày xem dữ liệu (nếu dùng range=days)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu định dạng ISO 8601 (Áp dụng khi range=custom)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc định dạng ISO 8601 (Áp dụng khi range=custom)',
    example: '2026-09-14T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Độ chia biểu đồ chuỗi thời gian (hourly, daily, weekly, monthly)',
    enum: AnalyticsTimeInterval,
    default: AnalyticsTimeInterval.DAILY,
    example: AnalyticsTimeInterval.DAILY,
  })
  @IsOptional()
  @IsEnum(AnalyticsTimeInterval)
  interval?: AnalyticsTimeInterval = AnalyticsTimeInterval.DAILY;

  @ApiPropertyOptional({
    description:
      'Lọc theo ID gian hàng cụ thể (Dành cho Admin hoặc Shop đa gian hàng)',
    example: '11111111-2828-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo kênh mạng xã hội cụ thể (TIKTOK, FACEBOOK, YOUTUBE, ZALO)',
    example: 'TIKTOK',
  })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID chiến dịch tiếp thị độc quyền cụ thể (FR-27)',
    example: '22222222-2828-4000-8000-000000000002',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class TopBreakdownQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;
  @ApiPropertyOptional({
    description:
      'Số lượng phần tử lấy trong bảng xếp hạng Top (Mặc định 5, tối đa 50)',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Khoảng thời gian chọn nhanh',
    enum: AnalyticsQuickRange,
    default: AnalyticsQuickRange.LAST_30_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsQuickRange)
  range?: AnalyticsQuickRange = AnalyticsQuickRange.LAST_30_DAYS;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu ISO',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc ISO',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryReferralOrdersDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số đơn trên mỗi trang', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc trạng thái đơn', example: 'ALL' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (Mã đơn, Tên khách, Tên sản phẩm)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID KOL (dành cho Shop Manager)' })
  @IsOptional()
  @IsUUID()
  kolId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID Gian hàng' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}


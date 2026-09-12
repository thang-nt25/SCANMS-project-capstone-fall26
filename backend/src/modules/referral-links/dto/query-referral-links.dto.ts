import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralLinkStatus, SocialPlatform } from '@prisma/client';

export class QueryReferralLinksDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại (mặc định 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng link mỗi trang (mặc định 20)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái link',
    enum: ReferralLinkStatus,
  })
  @IsOptional()
  @IsEnum(ReferralLinkStatus)
  status?: ReferralLinkStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo kênh truyền thông',
    enum: SocialPlatform,
  })
  @IsOptional()
  @IsEnum(SocialPlatform)
  channel?: SocialPlatform;

  @ApiPropertyOptional({
    description: 'Lọc theo Store ID',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo Campaign ID',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo Collaborator ID (dành cho Admin)',
  })
  @IsOptional()
  @IsString()
  collaboratorId?: string;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo mã rút gọn hoặc tên sản phẩm',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Cột sắp xếp: createdAt | totalClicks | uniqueClicks | totalOrders',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'totalClicks' | 'uniqueClicks' | 'totalOrders' =
    'createdAt';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp: asc | desc',
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

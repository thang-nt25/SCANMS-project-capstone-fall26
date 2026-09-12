import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CouponStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryCouponsDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo mã coupon',
    example: 'THANG',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CouponStatus,
    description: 'Lọc theo trạng thái coupon',
  })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo gian hàng (Shop)',
  })
  @IsOptional()
  @IsUUID('4')
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Trang hiện tại (mặc định 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên trang (mặc định 20)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

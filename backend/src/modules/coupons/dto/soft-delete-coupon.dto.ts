import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SoftDeleteCouponDto {
  @ApiPropertyOptional({
    description: 'Lý do xóa mã coupon',
    example: 'KOL kết thúc chiến dịch quảng bá',
  })
  @IsOptional()
  @IsString({ message: 'Lý do xóa phải là chuỗi' })
  @MaxLength(255, { message: 'Lý do xóa không vượt quá 255 ký tự' })
  reason?: string;
}

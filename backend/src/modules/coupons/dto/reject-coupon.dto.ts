import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectCouponDto {
  @ApiProperty({
    description: 'Lý do từ chối yêu cầu coupon (bắt buộc)',
    example: 'Mã coupon chưa phù hợp với định vị thương hiệu của gian hàng',
  })
  @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @MinLength(5, { message: 'Lý do từ chối tối thiểu 5 ký tự' })
  @MaxLength(255, { message: 'Lý do từ chối không vượt quá 255 ký tự' })
  reason: string;
}

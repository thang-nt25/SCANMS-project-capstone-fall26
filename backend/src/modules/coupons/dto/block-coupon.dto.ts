import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class BlockCouponDto {
  @ApiProperty({
    description: 'Lý do khóa hoặc tạm dừng coupon (bắt buộc)',
    example: 'Phát hiện hành vi lạm dụng mã giảm giá bất thường',
  })
  @IsNotEmpty({ message: 'Lý do khóa coupon là bắt buộc' })
  @IsString({ message: 'Lý do khóa phải là chuỗi ký tự' })
  @MinLength(5, { message: 'Lý do khóa tối thiểu 5 ký tự' })
  @MaxLength(255, { message: 'Lý do khóa không vượt quá 255 ký tự' })
  reason: string;
}

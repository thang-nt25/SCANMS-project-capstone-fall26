import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({
    description: 'ID của Shop đã được phê duyệt hợp tác',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'storeId không được để trống' })
  @IsUUID('4', { message: 'storeId phải là định dạng UUID hợp lệ' })
  storeId: string;

  @ApiProperty({
    description:
      'Mã giảm giá đề xuất (4-20 ký tự, chữ cái và số, không dấu, không khoảng trắng, không được toàn số)',
    example: 'THANGVIP10',
  })
  @IsNotEmpty({ message: 'Mã coupon không được để trống' })
  @IsString({ message: 'Mã coupon phải là chuỗi ký tự' })
  @MinLength(4, { message: 'Mã coupon phải có tối thiểu 4 ký tự' })
  @MaxLength(20, { message: 'Mã coupon không được vượt quá 20 ký tự' })
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'Mã coupon chỉ được chứa chữ cái Latin (A-Z, a-z) và chữ số (0-9)',
  })
  @Matches(/^(?![0-9]+$)/, {
    message: 'Mã coupon không được chỉ toàn số, phải có ít nhất một chữ cái',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'ID chiến dịch nếu coupon gắn với chiến dịch cụ thể',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4', { message: 'campaignId phải là UUID hợp lệ' })
  campaignId?: string;
}

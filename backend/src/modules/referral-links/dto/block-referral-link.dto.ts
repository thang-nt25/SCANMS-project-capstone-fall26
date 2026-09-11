import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockReferralLinkDto {
  @ApiProperty({
    description: 'Lý do khóa link tiếp thị (Bắt buộc, tối thiểu 5 ký tự)',
    example: 'Nội dung quảng cáo vi phạm chính sách của Cửa hàng',
    minLength: 5,
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Vui lòng cung cấp lý do khóa link tiếp thị' })
  @IsString({ message: 'Lý do khóa phải là chuỗi văn bản' })
  @MinLength(5, { message: 'Lý do khóa phải có ít nhất 5 ký tự' })
  @MaxLength(255, { message: 'Lý do khóa không được vượt quá 255 ký tự' })
  reason: string;
}

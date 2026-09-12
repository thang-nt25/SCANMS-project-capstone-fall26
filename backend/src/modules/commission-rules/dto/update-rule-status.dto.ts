import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateRuleStatusDto {
  @ApiProperty({
    description:
      'Trạng thái áp dụng của mốc thưởng (true = Đang hoạt động, false = Tạm ngừng)',
    example: true,
  })
  @IsNotEmpty({ message: 'isActive không được để trống' })
  @IsBoolean({ message: 'isActive phải là giá trị boolean (true/false)' })
  isActive: boolean;
}

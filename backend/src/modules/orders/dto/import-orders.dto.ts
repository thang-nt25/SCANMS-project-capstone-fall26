import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportOrdersDto {
  @ApiPropertyOptional({
    description:
      'ID cửa hàng; Shop Manager có thể bỏ trống để dùng cửa hàng của mình',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId phải là UUID hợp lệ' })
  storeId?: string;
}

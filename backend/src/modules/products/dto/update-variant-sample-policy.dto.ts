import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateVariantSamplePolicyDto {
  @ApiPropertyOptional({
    description: 'Kế thừa chính sách mẫu của sản phẩm cha',
  })
  @IsOptional()
  @IsBoolean()
  inheritProductPolicy?: boolean;

  @ApiPropertyOptional({ description: 'Cho phép KOL xin mẫu SKU này' })
  @IsOptional()
  @IsBoolean()
  sampleEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Số mẫu tối đa cấp cho SKU này' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuota?: number;
}

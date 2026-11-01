import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** Optional for existing API clients; checkout requires complete stored measurements. */
export class ProductPackageDto {
  @ApiPropertyOptional({
    description: 'Mã EAN-13 trên bao bì, bao gồm số kiểm tra',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'EAN-13 phải gồm đúng 13 chữ số' })
  barcode?: string | null;

  @ApiPropertyOptional({
    description: 'Khối lượng một sản phẩm sau đóng gói, gram',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30000)
  packageWeight?: number;

  @ApiPropertyOptional({ description: 'Chiều dài kiện một sản phẩm, cm' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  packageLength?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng kiện một sản phẩm, cm' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  packageWidth?: number;

  @ApiPropertyOptional({ description: 'Chiều cao kiện một sản phẩm, cm' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  packageHeight?: number;
}

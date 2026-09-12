import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';

export class CreateMediaDto {
  @ApiPropertyOptional({
    example: null,
    description: 'ID sản phẩm liên kết (nếu có)',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    example: 'Kịch bản Video Review TikTok 9:16',
    description: 'Tiêu đề tài nguyên',
  })
  @IsString({ message: 'Tiêu đề tài nguyên không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề tài nguyên' })
  title: string;

  @ApiProperty({
    enum: AssetType,
    example: AssetType.COPYWRITE_TEXT,
    description:
      'Loại tài nguyên: IMAGE (Banner), VIDEO (Clip review), hoặc COPYWRITE_TEXT (Kịch bản SEO)',
  })
  @IsEnum(AssetType, {
    message: 'Loại tài nguyên phải là IMAGE, VIDEO hoặc COPYWRITE_TEXT',
  })
  @IsNotEmpty({ message: 'Vui lòng chọn loại tài nguyên' })
  assetType: AssetType;

  @ApiProperty({
    example:
      '🔥 DEAL SỐC HÔM NAY 🔥\nTai nghe chống ồn ANC Pro X giảm ngay 30% khi mua qua link!',
    description:
      'Đường dẫn URL hình ảnh/video hoặc nội dung văn bản kịch bản mẫu',
  })
  @IsString({ message: 'Nội dung hoặc URL tài nguyên không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp URL ảnh/video hoặc kịch bản mẫu' })
  urlOrContent: string;
}

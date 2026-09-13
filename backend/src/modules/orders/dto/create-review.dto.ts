import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUUID,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderReviewDto {
  @ApiProperty({
    description: 'ID sản phẩm cần đánh giá',
    example: 'b54934c3-0762-40b4-868e-e7f66dac1684',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  productId: string;

  @ApiProperty({ description: 'Token ngắn hạn sau khi xác minh mã đơn + SĐT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reviewToken: string;

  @ApiProperty({
    description: 'Số sao đánh giá (từ 1 đến 5 sao)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Nội dung nhận xét chi tiết của khách hàng',
    example:
      'Chất lượng sản phẩm rất tuyệt vời, giao hàng siêu nhanh, đóng gói cẩn thận 10/10!',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(5)
  @MaxLength(500)
  comment: string;

  @ApiPropertyOptional({
    description:
      'Họ tên người đánh giá (mặc định lấy theo tên khách trong đơn hàng)',
    example: 'Hoàng Minh Tuấn',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh chụp thực tế sản phẩm (nếu có)',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  reviewImageUrl?: string;
}

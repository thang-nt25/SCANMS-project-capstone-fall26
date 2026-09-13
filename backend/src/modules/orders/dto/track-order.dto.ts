import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackOrderQueryDto {
  @ApiPropertyOptional({
    description: 'Số điện thoại đặt hàng để tra cứu',
    example: '0933888999',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Mã đơn hàng để tra cứu chính xác',
    example: 'ORD-20260909-001',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  orderSn?: string;
}

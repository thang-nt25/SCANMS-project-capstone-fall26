import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackOrderQueryDto {
  @ApiPropertyOptional({
    description: 'Số điện thoại đặt hàng để tra cứu',
    example: '0933888999',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Mã đơn hàng để tra cứu chính xác',
    example: 'ORD-20260909-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderSn?: string;
}

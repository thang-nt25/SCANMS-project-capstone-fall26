import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Lý do hủy đơn hàng',
    example: 'Khách hàng đổi ý / Hết hàng / Sai thông tin đặt',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GuestCancelOrderDto {
  @ApiProperty({
    description: 'Mã token bảo mật dùng để hủy đơn (được cấp khi tạo đơn hàng)',
    example: '3b890885-3b1a-4712-bdae-281bfe49ef87',
  })
  @IsNotEmpty({ message: 'cancellationToken không được để trống' })
  @IsString()
  cancellationToken: string;

  @ApiProperty({
    description: 'Số điện thoại đặt hàng để đối soát kép',
    example: '0987654321',
  })
  @IsNotEmpty({ message: 'customerPhone không được để trống' })
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional({
    description: 'Lý do hủy đơn',
    example: 'Khách muốn đổi sản phẩm khác',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

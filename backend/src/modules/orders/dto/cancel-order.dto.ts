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

export class RequestCancellationOtpDto {
  @ApiProperty({
    description: 'Số điện thoại đặt hàng để nhận mã OTP hủy đơn',
    example: '0987654321',
  })
  @IsNotEmpty({ message: 'customerPhone không được để trống' })
  @IsString()
  customerPhone: string;
}

export class GuestCancelOrderDto {
  @ApiPropertyOptional({
    description:
      'Mã token bảo mật dùng để hủy đơn (cung cấp cancellationToken HOẶC otp xác thực)',
    example: '3b890885-3b1a-4712-bdae-281bfe49ef87',
  })
  @IsOptional()
  @IsString()
  cancellationToken?: string;

  @ApiPropertyOptional({
    description: 'Mã OTP xác thực 6 chữ số nhận qua số điện thoại để hủy đơn',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  otp?: string;

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


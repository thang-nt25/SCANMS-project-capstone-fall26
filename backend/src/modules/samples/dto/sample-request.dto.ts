import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSampleRequestDto {
  @ApiProperty({
    description: 'ID sản phẩm muốn xin mẫu',
    example: 'uuid-here',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Địa chỉ nhận hàng mẫu',
    example: '123 Nguyễn Văn A, Q.1, TP.HCM',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shippingAddress: string;
}

export class ApproveRejectSampleDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối (chỉ khi reject)',
    example: 'Sản phẩm đã hết hàng mẫu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectedReason?: string;
}

export class ShipSampleRequestDto {
  @ApiProperty({
    description: 'Mã vận đơn GHTK / GHN',
    example: 'GHTK123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  trackingNumber: string;

  @ApiPropertyOptional({
    description: 'Đơn vị vận chuyển (GHTK / GHN / ...)',
    example: 'GHTK',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  carrier?: string;
}

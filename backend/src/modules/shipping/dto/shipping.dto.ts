import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';

export enum GhnRequiredNote {
  CHOTHUHANG = 'CHOTHUHANG',
  CHOXEMHANGKHONGTHU = 'CHOXEMHANGKHONGTHU',
  KHONGCHOXEMHANG = 'KHONGCHOXEMHANG',
}

export enum GhnEnvironment {
  LIVE = 'LIVE',
  TEST = 'TEST',
}

export class CreateSampleGhnOrderDto {
  @ApiPropertyOptional({ enum: GhnEnvironment, default: GhnEnvironment.LIVE })
  @IsOptional()
  @IsEnum(GhnEnvironment)
  environment?: GhnEnvironment;
}

export class CreateGhnOrderDto {
  @ApiPropertyOptional({
    enum: GhnEnvironment,
    default: GhnEnvironment.LIVE,
    description: 'Môi trường GHN dùng để tạo vận đơn',
  })
  @IsOptional()
  @IsEnum(GhnEnvironment)
  environment?: GhnEnvironment;

  @ApiPropertyOptional({ description: 'Ghi chú đóng gói / giao hàng' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    enum: GhnRequiredNote,
    default: GhnRequiredNote.CHOXEMHANGKHONGTHU,
    description:
      'Quy định kiểm hàng: Cho xem không thử, Cho thử hàng, hoặc Không cho xem',
  })
  @IsOptional()
  @IsEnum(GhnRequiredNote)
  requiredNote?: GhnRequiredNote;

  @ApiPropertyOptional({
    description: 'Trọng lượng gói hàng (gram)',
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  weight?: number;

  @ApiPropertyOptional({ description: 'Chiều dài (cm)', default: 15 })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (cm)', default: 10 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', default: 5 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description:
      'Tiền thu hộ COD (VNĐ). Nếu không gửi, hệ thống tự trích xuất từ đơn hàng',
  })
  @IsOptional()
  @IsNumber()
  codAmount?: number;
}

export class CalculateShippingFeeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  fromDistrictId?: number;

  @IsOptional()
  @IsString()
  fromWardCode?: string;
  @ApiProperty({ description: 'Mã quận/huyện người nhận (GHN district_id)' })
  @IsInt()
  @Min(1)
  toDistrictId: number;

  @ApiProperty({ description: 'Mã phường/xã người nhận (GHN ward_code)' })
  @IsString()
  @IsNotEmpty()
  toWardCode: string;

  @ApiPropertyOptional({
    description: 'Trọng lượng gói hàng (gram)',
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  weight?: number;

  @ApiPropertyOptional({ description: 'Giá trị khai giá bảo hiểm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;
}

export class QuoteShippingAddressDto {
  @ApiProperty({ description: 'ID gian hàng xuất kho' })
  @IsString()
  storeId: string;
  @ApiProperty({ description: 'Địa chỉ đầy đủ đã chọn tỉnh, huyện, xã' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Trọng lượng kiện hàng (gram)' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  weight?: number;

  @ApiPropertyOptional({ description: 'Giá trị bảo hiểm (VNĐ)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number;
}

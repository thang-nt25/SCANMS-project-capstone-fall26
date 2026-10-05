import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';

export enum GhnRequiredNote {
  CHOTHUHANG = 'CHOTHUHANG',
  CHOXEMHANGKHONGTHU = 'CHOXEMHANGKHONGTHU',
  KHONGCHOXEMHANG = 'KHONGCHOXEMHANG',
}

export class CreateGhnOrderDto {
  @ApiPropertyOptional({ description: 'Ghi chú đóng gói / giao hàng' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    enum: GhnRequiredNote,
    default: GhnRequiredNote.CHOXEMHANGKHONGTHU,
    description: 'Quy định kiểm hàng: Cho xem không thử, Cho thử hàng, hoặc Không cho xem',
  })
  @IsOptional()
  @IsEnum(GhnRequiredNote)
  requiredNote?: GhnRequiredNote;

  @ApiPropertyOptional({ description: 'Trọng lượng gói hàng (gram)', default: 500 })
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

  @ApiPropertyOptional({ description: 'Tiền thu hộ COD (VNĐ). Nếu không gửi, hệ thống tự trích xuất từ đơn hàng' })
  @IsOptional()
  @IsNumber()
  codAmount?: number;
}

export class CalculateShippingFeeDto {
  @ApiProperty({ description: 'Mã quận/huyện người nhận (GHN district_id)' })
  @IsNumber()
  toDistrictId: number;

  @ApiProperty({ description: 'Mã phường/xã người nhận (GHN ward_code)' })
  @IsString()
  toWardCode: string;

  @ApiPropertyOptional({ description: 'Trọng lượng gói hàng (gram)', default: 500 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Giá trị khai giá bảo hiểm' })
  @IsOptional()
  @IsNumber()
  insuranceValue?: number;
}

import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn Mua' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber: string;

  @ApiPropertyOptional({ example: '79' })
  @IsOptional()
  @IsString()
  provinceCode?: string;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty()
  provinceName: string;

  @ApiPropertyOptional({ example: '769' })
  @IsOptional()
  @IsString()
  districtCode?: string;

  @ApiProperty({ example: 'Thành phố Thủ Đức' })
  @IsString()
  @IsNotEmpty()
  districtName: string;

  @ApiPropertyOptional({ example: '26848' })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiProperty({ example: 'Phường Linh Trung' })
  @IsString()
  @IsNotEmpty()
  wardName: string;

  @ApiProperty({ example: 'Số 123 Đường D1, Khu Công Nghệ Cao' })
  @IsString()
  @IsNotEmpty()
  detailAddress: string;

  @ApiPropertyOptional({ example: 10.823099 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 106.629664 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

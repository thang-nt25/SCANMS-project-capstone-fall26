import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({
    example: 'Sora Skincare & Cosmetics',
    description: 'Tên Cửa hàng / Nhãn hàng trực thuộc',
  })
  @IsString({ message: 'Tên cửa hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Tên cửa hàng không được để trống' })
  @MaxLength(200, { message: 'Tên cửa hàng tối đa 200 ký tự' })
  name: string;

  @ApiPropertyOptional({
    example: 'sora-skincare-cosmetics',
    description: 'Slug định danh URL duy nhất của cửa hàng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiProperty({
    example: 'Mỹ phẩm & Chăm sóc da chuyên sâu',
    description: 'Ngành hàng kinh doanh cố định độc quyền của Cửa hàng',
  })
  @IsString({ message: 'Ngành hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Ngành hàng không được để trống' })
  @MaxLength(100)
  categoryName: string;

  @ApiPropertyOptional({
    example: 'Nhãn hàng mỹ phẩm và chăm sóc da chuyên sâu trực thuộc SCANMS',
    description: 'Mô tả tóm tắt về nhãn hàng',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    description: 'Logo nhãn hàng',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tỷ lệ chiết khấu thù lao cơ sở sàn (mặc định 10%)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ thù lao cơ sở phải là số' })
  defaultCommissionRate?: number;

  @ApiPropertyOptional({
    example: 'Kho Mát Mỹ Phẩm GMP Thủ Đức',
    description: 'Tên kho xuất hàng phục vụ bưu tá GHN lấy hàng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  warehouseName?: string;

  @ApiPropertyOptional({
    example: 'Nguyễn Văn Quản Kho',
    description: 'Người liên hệ tại điểm gửi hàng GHN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactName?: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại bưu cục / kho xuất hàng',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9().\-\s]{8,20}$/, { message: 'Số điện thoại kho không hợp lệ' })
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'Khu Công Nghệ Cao, Tăng Nhơn Phú B, TP.Thủ Đức, TP.HCM',
    description: 'Địa chỉ kho xuất hàng GHN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  warehouseAddress?: string;

  @ApiPropertyOptional({
    example: 1442,
    description: 'Mã quận/huyện GHN của kho xuất hàng (ghnDistrictId)',
  })
  @IsOptional()
  @IsNumber()
  ghnDistrictId?: number;

  @ApiPropertyOptional({
    example: '20109',
    description: 'Mã phường/xã GHN của kho xuất hàng (ghnWardCode)',
  })
  @IsOptional()
  @IsString()
  ghnWardCode?: string;

  @ApiPropertyOptional({
    example: '4aa15e5b-8741-5190-b01f-102c902f4d69',
    description: 'ID người phụ trách Shop Manager (nếu gán ngay lúc tạo)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ownerId phải là UUID hợp lệ' })
  ownerId?: string;
}


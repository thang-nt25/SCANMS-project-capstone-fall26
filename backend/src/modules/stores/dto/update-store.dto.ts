import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({
    description: 'Chính sách đổi trả của Shop (tối đa 500 ký tự)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  policyReturn?: string;

  @ApiPropertyOptional({
    description: 'Chính sách bảo hành của Shop (tối đa 500 ký tự)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  policyWarranty?: string;

  @ApiPropertyOptional({
    description: 'Chính sách giao hàng của Shop (tối đa 500 ký tự)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  policyShipping?: string;

  @ApiPropertyOptional({
    example: 'Nguyễn Văn A',
    description: 'Tên người đại diện gian hàng',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  representativeName?: string;

  @ApiPropertyOptional({ enum: ['INDIVIDUAL', 'HOUSEHOLD', 'ENTERPRISE'] })
  @IsOptional()
  @IsIn(['INDIVIDUAL', 'HOUSEHOLD', 'ENTERPRISE'])
  businessType?: string;

  @ApiPropertyOptional({
    example: '0315891234',
    description: 'Mã số thuế gian hàng',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  taxCode?: string;

  @ApiPropertyOptional({
    example: '0902345678',
    description: 'Số điện thoại liên hệ gian hàng',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9().\-\s]{8,20}$/)
  contactPhone?: string;

  @ApiPropertyOptional({
    example: 'shop@example.vn',
    description: 'Email liên hệ gian hàng',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({
    example: 'Số 1, đường A, phường B, TP. Hồ Chí Minh',
    description: 'Địa chỉ kho hàng',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  warehouseAddress?: string;

  @ApiPropertyOptional({
    description: 'Ngân hàng dùng để chi trả hoa hồng KOL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payoutBankName?: string | null;

  @ApiPropertyOptional({
    description: 'Số tài khoản dùng để chi trả hoa hồng KOL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  payoutBankAccountNumber?: string | null;

  @ApiPropertyOptional({
    description: 'Tên chủ tài khoản chi trả hoa hồng KOL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  payoutBankAccountName?: string | null;

  @ApiPropertyOptional({
    example: 'Tech Store Vietnam',
    description: 'Tên gian hàng',
  })
  @IsOptional()
  @IsString({ message: 'Tên cửa hàng không hợp lệ' })
  name?: string;

  @ApiPropertyOptional({
    example:
      'Chuyên cung cấp thiết bị âm thanh và phụ kiện công nghệ chính hãng',
    description: 'Mô tả cửa hàng',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    description: 'URL ảnh logo cửa hàng',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://techstore.vn',
    description: 'Website chính thức',
  })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tỷ lệ % hoa hồng mặc định toàn shop',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ hoa hồng mặc định phải là số' })
  @Min(0, { message: 'Hoa hồng tối thiểu là 0%' })
  @Max(100, { message: 'Hoa hồng tối đa là 100%' })
  defaultCommissionRate?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Thời hạn lưu cookie Last-Click (ngày)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian lưu cookie phải là số ngày nguyên' })
  @Min(1, { message: 'Thời gian lưu cookie tối thiểu là 1 ngày' })
  @Max(365, { message: 'Thời gian lưu cookie tối đa là 365 ngày' })
  attributionWindowDays?: number;
}

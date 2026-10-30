import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateInternalStaffDto {
  @ApiProperty({ description: 'Email nhân sự công ty', example: 'brand.sora@scanms.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ description: 'Họ và tên nhân sự', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Số điện thoại', example: '0901234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'Mật khẩu khởi tạo', example: 'MatKhau123@' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  password: string;

  @ApiProperty({
    description: 'Vai trò nội bộ (SHOP_MANAGER hoặc SYSTEM_MANAGER)',
    enum: [UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER],
    example: UserRole.SHOP_MANAGER,
  })
  @IsEnum([UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER], {
    message: 'Vai trò nội bộ chỉ có thể là SHOP_MANAGER hoặc SYSTEM_MANAGER',
  })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'ID Cửa hàng trực thuộc phụ trách (áp dụng khi role là SHOP_MANAGER)',
    example: '4aa15e5b-8741-5190-b01f-102c902f4d69',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID Cửa hàng phải là UUID hợp lệ' })
  storeId?: string;
}

export class ToggleUserStatusDto {
  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt tài khoản', example: true })
  @IsOptional()
  isActive?: boolean;
}


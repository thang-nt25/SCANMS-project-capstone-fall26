import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    example: 'kol.test@scanms.vn',
    description: 'Địa chỉ Email đăng ký tài khoản',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng nhập (Tối thiểu 6 ký tự)',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    example: 'Nguyễn Thành Thắng',
    description: 'Họ và tên đầy đủ của người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @ApiProperty({
    example: '123456',
    description:
      'Mã OTP 6 chữ số nhận từ Email (hoặc 123456 ở môi trường test)',
  })
  @IsString({ message: 'Mã xác thực OTP là bắt buộc khi đăng ký' })
  @Length(6, 6, { message: 'Mã OTP phải bao gồm đúng 6 chữ số' })
  otp: string;

  @ApiPropertyOptional({
    example: '0912345678',
    description: 'Số điện thoại liên lạc',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.COLLABORATOR,
    description: 'Vai trò tài khoản: COLLABORATOR, SHOP_MANAGER, hoặc CUSTOMER',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role?: UserRole = UserRole.COLLABORATOR;

  @ApiPropertyOptional({
    example: 'Tech Store Official',
    description: 'Tên cửa hàng (Bắt buộc nếu đăng ký vai trò SHOP_MANAGER)',
  })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    description: 'Ảnh đại diện của KOL / KOC (Bắt buộc khi đăng ký COLLABORATOR)',
  })
  @IsOptional()
  @IsString({ message: 'Ảnh đại diện không hợp lệ' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400',
    description: 'Logo đại diện gian hàng (Bắt buộc khi đăng ký SHOP_MANAGER)',
  })
  @IsOptional()
  @IsString({ message: 'Logo gian hàng không hợp lệ' })
  logoUrl?: string;
}

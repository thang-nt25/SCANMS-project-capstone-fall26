import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'kol1@scanms.vn',
    description: 'Địa chỉ Email đăng nhập (Ví dụ: kol1@scanms.vn, shop@techstore.vn, admin@scanms.vn)',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu tài khoản (Mật khẩu seed mặc định: Password@123)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

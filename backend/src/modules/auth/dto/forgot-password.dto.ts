import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SendForgotPasswordOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đã đăng ký tài khoản cần khôi phục mật khẩu',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp email' })
  email: string;
}

export class VerifyResetOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email cần xác thực mã khôi phục',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp email' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP 6 chữ số gửi qua hộp thư',
  })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email cần đặt lại mật khẩu',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp email' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP 6 chữ số gửi qua hộp thư',
  })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 số)',
  })
  @IsString()
  @Length(6, 50, { message: 'Mật khẩu phải từ 6 đến 50 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số',
  })
  newPassword: string;
}

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { resolveLoginIdentifier } from '../login-identifier';

@ValidatorConstraint({ name: 'loginIdentifier', async: false })
class LoginIdentifierConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    return resolveLoginIdentifier(args.object) !== null;
  }

  defaultMessage() {
    return 'Vui lòng nhập email hoặc số điện thoại Việt Nam hợp lệ và chỉ dùng một trường đăng nhập';
  }
}

export class LoginDto {
  @ApiPropertyOptional({
    example: '0912345678',
    description: 'Email hoặc số điện thoại đã đăng ký, hỗ trợ 0… / +84…',
  })
  // This validator also runs when identifier is absent, validating the legacy
  // email field instead. Missing/both fields must fail before database access.
  @Validate(LoginIdentifierConstraint)
  identifier?: string;

  @ApiPropertyOptional({
    example: 'kol1@scanms.vn',
    description: 'Tên trường cũ để tương thích client; ưu tiên dùng identifier',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  email?: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu hiện tại của tài khoản',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;
}

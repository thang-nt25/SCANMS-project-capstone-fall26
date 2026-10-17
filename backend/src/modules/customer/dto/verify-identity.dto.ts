import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCustomerIdentityDto {
  @ApiProperty({
    description: 'Họ và tên đầy đủ trên CCCD',
    example: 'NGUYỄN THÀNH THẮNG',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 150)
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên đầy đủ trên CCCD' })
  fullName: string;

  @ApiProperty({
    description: 'Số định danh cá nhân trên CCCD (12 số hoặc 9 số)',
    example: '001202012345',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập số định danh cá nhân trên CCCD' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @Matches(/^(?:\d{9}|\d{12})$/, {
    message: 'Số CCCD phải gồm 9 hoặc 12 chữ số hợp lệ',
  })
  idCardNumber: string;

  @ApiProperty({
    description: 'Địa chỉ Nơi thường trú trên CCCD',
    example: 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Cầu Giấy, Hà Nội',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(5, 200)
  @IsNotEmpty({ message: 'Vui lòng nhập địa chỉ nơi thường trú trên CCCD' })
  @MaxLength(200, { message: 'Địa chỉ không được vượt quá 200 ký tự' })
  address: string;
}

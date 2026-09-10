import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2FaDto {
  @IsString()
  @IsNotEmpty({ message: 'Secret key không được để trống' })
  secret: string;

  @IsString()
  @Length(6, 6, { message: 'Mã xác thực 2FA phải bao gồm đúng 6 chữ số' })
  token: string;
}

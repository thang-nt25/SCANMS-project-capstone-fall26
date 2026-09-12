import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKycDto {
  @ApiProperty({
    example: '001201012345',
    description: 'Số Căn cước công dân (CCCD 12 số)',
  })
  @IsString({ message: 'Số CCCD/CMND không hợp lệ' })
  @IsNotEmpty({ message: 'Số CCCD/CMND không được để trống' })
  idCardNumber: string;

  @ApiProperty({
    example: '8012345678',
    description: 'Mã số thuế thu nhập cá nhân',
  })
  @IsString({ message: 'Mã số thuế không hợp lệ' })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  taxCode: string;

  @ApiProperty({
    example: 'Vietcombank',
    description: 'Tên ngân hàng thụ hưởng',
  })
  @IsString({ message: 'Tên ngân hàng không được để trống' })
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  bankName: string;

  @ApiProperty({ example: '0123456789', description: 'Số tài khoản ngân hàng' })
  @IsString({ message: 'Số tài khoản ngân hàng không được để trống' })
  @IsNotEmpty({ message: 'Số tài khoản ngân hàng không được để trống' })
  bankAccountNumber: string;

  @ApiProperty({
    example: 'NGUYEN THANH THANG',
    description: 'Tên chủ tài khoản (In hoa)',
  })
  @IsString({ message: 'Tên chủ tài khoản không được để trống' })
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  bankAccountName: string;

  @ApiPropertyOptional({
    example: 'KOL chuyên review đồ công nghệ và lifestyle',
    description: 'Tiểu sử / Giới thiệu',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}

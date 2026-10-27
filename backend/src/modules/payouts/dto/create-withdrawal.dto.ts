import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiPropertyOptional({
    description: 'Shop liên quan (tùy chọn)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Shop phải có UUID hợp lệ nếu được cung cấp' })
  storeId?: string;

  @ApiProperty({
    type: String,
    example: '500000.00',
    description: 'Số tiền VNĐ dạng chuỗi thập phân, tối đa 2 chữ số lẻ',
  })
  @IsString({ message: 'Số tiền rút phải là chuỗi thập phân' })
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message: 'Số tiền rút phải có tối đa 13 chữ số nguyên và 2 chữ số lẻ',
  })
  amount: string;
}

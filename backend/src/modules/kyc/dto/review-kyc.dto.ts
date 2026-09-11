import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '@prisma/client';

export class ReviewKycDto {
  @IsEnum(KycStatus, { message: 'Trạng thái duyệt KYC không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn trạng thái phê duyệt' })
  status: KycStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, Matches, IsOptional, IsBoolean } from 'class-validator';

export class SettleMonthlyBonusDto {
  @ApiProperty({
    description: 'ID định danh của Cộng tác viên / KOL (UUID)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsNotEmpty({ message: 'collaboratorId không được để trống' })
  @IsUUID('4', { message: 'collaboratorId phải là định dạng UUID hợp lệ' })
  collaboratorId: string;

  @ApiProperty({
    description: 'Kỳ tháng chốt thưởng định dạng YYYY-MM (múi giờ Asia/Ho_Chi_Minh)',
    example: '2026-09',
  })
  @IsNotEmpty({ message: 'yearMonth không được để trống' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'yearMonth phải có định dạng YYYY-MM (Ví dụ: 2026-09)',
  })
  yearMonth: string;

  @ApiProperty({
    description: 'Cho phép chốt kỳ tháng hiện tại khi chưa kết thúc (phục vụ kiểm thử hoặc trường hợp đặc biệt)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowUnfinishedMonth?: boolean;
}


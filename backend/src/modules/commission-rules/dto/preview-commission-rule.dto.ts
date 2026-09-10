import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class PreviewCommissionRuleDto {
  @ApiPropertyOptional({
    description: 'Doanh số tháng hợp lệ cần mô phỏng tính thưởng (VND)',
    example: '120000000',
  })
  @IsOptional()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, {
    message: 'Doanh số mô phỏng phải là số không âm (VND)',
  })
  monthlyRevenue?: string;

  @ApiPropertyOptional({
    description: 'Tên trường dự phòng revenue (VND)',
    example: '120000000',
  })
  @IsOptional()
  @Matches(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, {
    message: 'revenue phải là số không âm (VND)',
  })
  revenue?: string;
}

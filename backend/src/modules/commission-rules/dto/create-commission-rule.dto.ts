import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommissionRuleDto {
  @ApiProperty({
    description: 'Tên mốc thưởng doanh số (tối đa 150 ký tự)',
    example: 'Mốc Bạc (>= 50 Triệu)',
  })
  @IsNotEmpty({ message: 'Tên mốc thưởng không được để trống' })
  @IsString({ message: 'Tên mốc thưởng phải là chuỗi ký tự' })
  @MaxLength(150, { message: 'Tên mốc thưởng không được vượt quá 150 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết chính sách mốc thưởng',
    example: 'Thưởng khi đạt KPI 50 triệu doanh số hợp lệ trong tháng',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Mô tả không được vượt quá 500 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiProperty({
    description:
      'Doanh số tháng tối thiểu để đạt KPI bằng VND (số nguyên dương > 0)',
    example: '50000000',
  })
  @IsNotEmpty({ message: 'Doanh số tối thiểu không được để trống' })
  @Matches(/^[1-9]\d*$/, {
    message: 'Doanh số tối thiểu phải là số nguyên dương lớn hơn 0 (VND)',
  })
  minMonthlyRevenue: string;

  @ApiPropertyOptional({
    description: 'Tiền thưởng cố định khi đạt KPI (VND, có thể bằng 0)',
    example: '500000',
    default: '0',
  })
  @IsOptional()
  @Matches(/^(?:0|[1-9]\d*)$/, {
    message: 'Tiền thưởng cố định đạt KPI phải là số nguyên không âm (VND)',
  })
  achievementBonus?: string;

  @ApiProperty({
    description:
      'Tỷ lệ phần trăm thưởng thêm trên phần vượt (từ 0 đến 100, tối đa 2 chữ số thập phân)',
    example: '2.00',
  })
  @IsNotEmpty({ message: 'Tỷ lệ phần trăm thưởng không được để trống' })
  @Matches(
    /^(?:0(?:\.0{1,2})?|0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d{0,1}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/,
    {
      message: 'Tỷ lệ thưởng phải từ 0% đến 100% và tối đa 2 chữ số thập phân',
    },
  )
  bonusPercentage: string;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt áp dụng mốc',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là kiểu boolean (true/false)' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu hiệu lực (ISO 8601 string)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'effectiveFrom phải là chuỗi ngày tháng ISO 8601 hợp lệ' },
  )
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc hiệu lực (ISO 8601 string)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'effectiveTo phải là chuỗi ngày tháng ISO 8601 hợp lệ' },
  )
  effectiveTo?: string;
}

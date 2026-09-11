import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommissionRuleResponseDto {
  @ApiProperty({ example: 'b9d3161c-8e0f-48d6-95df-911e3ec5dcbf' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  storeId: string;

  @ApiProperty({ example: 'Mốc Bạc (>= 50 Triệu)' })
  name: string;

  @ApiPropertyOptional({ example: 'Thưởng khi đạt 50 triệu doanh số tháng' })
  description?: string | null;

  @ApiProperty({ example: '50000000.00' })
  minMonthlyRevenue: string;

  @ApiProperty({ example: '500000.00' })
  achievementBonus: string;

  @ApiProperty({ example: '2.00' })
  bonusPercentage: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  effectiveFrom?: Date | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  effectiveTo?: Date | null;

  @ApiPropertyOptional({ example: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })
  createdBy?: string | null;

  @ApiPropertyOptional({ example: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })
  updatedBy?: string | null;

  @ApiProperty({ example: '2026-09-10T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-10T00:00:00.000Z' })
  updatedAt: Date;
}

export class RangeBonusItemDto {
  @ApiProperty({ example: '50000000.00' })
  from: string;

  @ApiProperty({ example: '100000000.00' })
  to: string;

  @ApiProperty({ example: '2.00' })
  rate: string;

  @ApiProperty({ example: '50000000.00' })
  revenue: string;

  @ApiProperty({ example: '1000000.00' })
  bonus: string;
}

export class HighestReachedRuleDto {
  @ApiProperty({ example: 'b9d3161c-8e0f-48d6-95df-911e3ec5dcbf' })
  id: string;

  @ApiProperty({ example: 'Mốc Vàng (>= 100 Triệu)' })
  name: string;

  @ApiProperty({ example: '100000000.00' })
  minMonthlyRevenue: string;

  @ApiProperty({ example: '1500000.00' })
  achievementBonus: string;
}

export class BonusPreviewResultDto {
  @ApiProperty({ example: '120000000.00' })
  monthlyRevenue: string;

  @ApiPropertyOptional({ type: HighestReachedRuleDto, nullable: true })
  highestReachedRule: HighestReachedRuleDto | null;

  @ApiProperty({ example: '1500000.00' })
  achievementBonus: string;

  @ApiProperty({ type: [RangeBonusItemDto] })
  rangeBonuses: RangeBonusItemDto[];

  @ApiProperty({ example: '3100000.00' })
  totalBonus: string;

  @ApiProperty({
    example:
      'Thưởng đạt KPI (1.500.000đ) + Khoảng 50tr-100tr: 1.000.000đ + Khoảng 100tr-120tr: 600.000đ = 3.100.000đ',
  })
  formula: string;
}

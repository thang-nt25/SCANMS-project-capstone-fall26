import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class LiveGovernanceDto {
  @IsIn([
    'REQUEST_END',
    'EMERGENCY_STOP',
    'ACCEPT_END',
    'REJECT_END',
    'COMPLAIN',
    'EXPLAIN',
    'DECIDE',
    'ESCALATE',
    'APPEAL',
    'DECIDE_APPEAL',
  ])
  action: string;

  @IsOptional()
  @IsIn(['OUT_OF_STOCK', 'TECHNICAL', 'KOL_VIOLATION', 'OTHER'])
  reason?: string;

  @IsString()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsArray()
  @MaxLength(1000, { each: true })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  evidence?: string[];

  @IsOptional()
  @IsIn(['SHOP_FAULT', 'KOL_FAULT', 'NO_FAULT', 'INSUFFICIENT_EVIDENCE'])
  outcome?: string;

  @IsOptional()
  @IsIn(['NONE', 'WARNING', 'RESTRICT', 'BLOCK', 'LIFT'])
  sanction?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  restrictionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000000)
  compensation?: number;
}

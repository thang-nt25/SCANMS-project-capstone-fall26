import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';
import { QueryWithdrawalsDto } from './query-withdrawals.dto';

export class QueryMerchantPayoutsDto extends QueryWithdrawalsDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

export class ApprovePayoutDto {
  @ApiProperty({
    description: 'Mã giao dịch trên bill ngân hàng',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/)
  bankRefCode: string;
}

export class RejectPayoutDto {
  @ApiProperty({ maxLength: 500 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ExportPayoutBatchDto {
  @ApiProperty({
    type: [String],
    description: 'UUID các payout PENDING thuộc shop',
    maxItems: 200,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  payoutIds: string[];
}

import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PayoutStatus } from '@prisma/client';
import { QueryWithdrawalsDto } from './query-withdrawals.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCustomerWithdrawalDto {
  @IsUUID() requestKey: string;
  @Type(() => Number) @IsInt() @Min(200000) @Max(999999999999) amount: number;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100) bankName: string;
  @Transform(trim) @IsString() @Matches(/^\d{6,30}$/) bankAccountNumber: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  bankAccountName: string;
}

export class QueryCustomerWithdrawalsDto extends QueryWithdrawalsDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(150) search?: string;
}

export class CustomerManualApprovalDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/)
  bankRefCode: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
}

export class CustomerWithdrawalRejectionDto {
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(500) reason: string;
}

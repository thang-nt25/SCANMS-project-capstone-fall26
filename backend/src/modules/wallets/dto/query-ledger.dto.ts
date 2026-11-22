import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TransactionType, WalletBalanceBucket } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryLedgerDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(TransactionType) transactionType?: TransactionType;
  @IsOptional() @IsEnum(WalletBalanceBucket) balanceBucket?: WalletBalanceBucket;
  @IsOptional() @Type(() => Number) @IsIn([7, 30, 90]) days?: number;
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

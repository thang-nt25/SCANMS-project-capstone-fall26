import {
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
export class CreateMonthlyRewardDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) yearMonth: string;
  @IsString() @MinLength(3) @MaxLength(150) name: string;
  @IsString() @Matches(/^[1-9]\d{0,11}$/) targetRevenue: string;
  @IsString() @Matches(/^[1-9]\d{0,11}$/) rewardAmount: string;
}
export class ReviewMonthlyRewardDto {
  @IsIn(['APPROVED', 'REJECTED']) decision: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

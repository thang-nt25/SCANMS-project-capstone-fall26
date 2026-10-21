import {
  SponsoredPlacementFunding,
  SponsoredPlacementStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RequestSponsorshipDto {
  @IsUUID() requestKey: string;
  @IsString() @MinLength(5) @MaxLength(160) headline: string;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsInt() @Min(1) @Max(1000000000) quotedAmount: number;
  @IsOptional() @IsUUID() renewsPlacementId?: string;
}

export class ReviewSponsorshipDto {
  @IsIn(['APPROVE', 'REJECT']) decision: 'APPROVE' | 'REJECT';
  @IsString() @MinLength(5) @MaxLength(2000) note: string;
  @IsOptional()
  @IsIn([SponsoredPlacementFunding.PAID])
  fundingType?: SponsoredPlacementFunding;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) amount?: number;
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  paymentReference?: string;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2000)
  paymentProofUrl?: string;
}

export class SponsorshipListDto {
  @IsOptional()
  @IsIn([...Object.values(SponsoredPlacementStatus), 'EXPIRED'])
  status?: SponsoredPlacementStatus | 'EXPIRED';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
}

export class CancelSponsorshipDto {
  @IsString() @MinLength(5) @MaxLength(2000) note: string;
}

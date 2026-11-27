import {
  SponsoredPlacementStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
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

export class RequestSponsorshipDto {
  @IsUUID() requestKey: string;
  @IsString() @MinLength(5) @MaxLength(160) headline: string;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsInt() @Min(1) @Max(1000000000) quotedAmount: number;
  @IsOptional() @IsUUID() renewsPlacementId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/(?:v\d+\/)?scanms\/sponsorship\/[\w/-]+\.(?:jpe?g|png|webp)$/i, {
    message: 'Vui lòng tải ảnh banner JPG, PNG hoặc WebP qua hệ thống.',
  })
  bannerImageUrl?: string;
}

export class ReviewSponsorshipDto {
  @IsIn(['APPROVE', 'REJECT']) decision: 'APPROVE' | 'REJECT';
  @IsString() @MinLength(5) @MaxLength(2000) note: string;
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

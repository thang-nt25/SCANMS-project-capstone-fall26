import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsIn,
  IsString,
  IsUrl,
  IsUUID,
  IsInt,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DiscountType, LiveSessionPlatform } from '@prisma/client';

export class ExternalLiveChannelDto {
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(1000)
  channelUrl: string;
  @IsInt() @Min(0) followerCount: number;
}

export class GenerateLiveLinkCodeDto {
  @IsUUID('4') storeId: string;
  @IsUUID('4') creatorId: string;
}

export class CreateLiveSessionDto {
  @IsUUID('4') storeId: string;
  @IsUUID('4') creatorId: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsEnum(LiveSessionPlatform) platform: LiveSessionPlatform;
  @IsUrl({ require_protocol: true, require_tld: false })
  @IsNotEmpty()
  @MaxLength(1000)
  liveUrl: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalLiveChannelDto)
  externalChannels?: ExternalLiveChannelDto[];
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true }) productIds: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) variantIds?: string[];

  @IsOptional() @IsString() @MaxLength(1000) coverImageUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsEnum(DiscountType) discountType: DiscountType;
  @Type(() => Number) @IsNumber() @Min(0.01) discountValue: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumDiscountAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usageLimitTotal?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  usageLimitPerCustomer?: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) commissionRate: number;
}

export class RespondLiveSessionDto {
  @IsBoolean()
  accepted: boolean;
}

export class UpdateLiveSessionStateDto {
  @IsIn(['PAUSED', 'RESUME', 'CANCELLED', 'START_NOW']) action:
    'PAUSED' | 'RESUME' | 'CANCELLED' | 'START_NOW';
}

export class ClaimLiveSessionDto {
  @IsString() @MaxLength(100) claimKey: string;
}

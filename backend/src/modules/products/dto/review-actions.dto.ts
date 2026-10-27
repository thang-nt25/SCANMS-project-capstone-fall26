import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength, ArrayMaxSize } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class ReviewReplyDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(1000)
  comment: string;
}
export class ReviewReportDto {
  @IsIn(['ABUSE', 'PERSONAL_DATA', 'SPAM', 'FAKE', 'UNRELATED', 'OTHER'])
  reason: string;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(2000)
  details: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  evidence?: string[];
  @IsOptional() @IsArray() @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  images?: string[];
  @IsOptional() @IsArray() @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  videos?: string[];
}
export class ResolveReviewReportDto {
  @IsIn(['KEEP', 'HIDE']) decision: 'KEEP' | 'HIDE';
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(2000)
  reason: string;
}

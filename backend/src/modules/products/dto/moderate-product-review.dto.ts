import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class ModerateProductReviewDto {
  @ApiPropertyOptional({
    description: 'true để công khai (APPROVED); false để từ chối hoặc ẩn (REJECTED/HIDDEN)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({
    description: 'Trạng thái kiểm duyệt chi tiết: PENDING, APPROVED, REJECTED, HIDDEN',
    enum: ReviewStatus,
    example: ReviewStatus.APPROVED,
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({
    description: 'Lý do từ chối hoặc ẩn đánh giá (bắt buộc khi REJECTED hoặc HIDDEN)',
    example: 'Đánh giá chứa từ ngữ không phù hợp',
  })
  @ValidateIf((dto: ModerateProductReviewDto) => dto.approved === false || dto.status === ReviewStatus.REJECTED || dto.status === ReviewStatus.HIDDEN)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}

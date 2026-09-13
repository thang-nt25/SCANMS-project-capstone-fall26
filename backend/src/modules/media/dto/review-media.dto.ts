import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewActionStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HIDDEN = 'HIDDEN',
}

export class ReviewMediaDto {
  @ApiProperty({
    enum: ReviewActionStatus,
    example: ReviewActionStatus.APPROVED,
    description: 'Trạng thái xét duyệt: APPROVED, REJECTED hoặc HIDDEN (Không cho phép PENDING)',
  })
  @IsEnum(ReviewActionStatus, {
    message: 'Trạng thái xét duyệt phải là APPROVED, REJECTED hoặc HIDDEN',
  })
  @IsNotEmpty({ message: 'Vui lòng cung cấp trạng thái kiểm duyệt' })
  status: ReviewActionStatus;

  @ApiPropertyOptional({
    example: 'Video vi phạm quy chuẩn nội dung hoặc không đúng thông điệp sản phẩm',
    description: 'Bắt buộc khi từ chối (REJECTED) hoặc ẩn (HIDDEN)',
  })
  @ValidateIf((o) => o.status === ReviewActionStatus.REJECTED || o.status === ReviewActionStatus.HIDDEN)
  @IsNotEmpty({ message: 'Bắt buộc cung cấp lý do khi từ chối (REJECTED) hoặc ẩn (HIDDEN) video' })
  @IsString({ message: 'Lý do phải là chuỗi văn bản' })
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Ghim video này làm video nổi bật (Featured) duy nhất của sản phẩm',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

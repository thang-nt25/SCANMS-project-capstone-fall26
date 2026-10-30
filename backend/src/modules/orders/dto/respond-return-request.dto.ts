import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export enum ReturnDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export const RETURN_REJECTION_REASONS = {
  EVIDENCE_MISMATCH: 'Bằng chứng chưa xác nhận lỗi được phản ánh',
  PRODUCT_MISMATCH: 'Sản phẩm yêu cầu không khớp đơn hàng',
  OUTSIDE_POLICY: 'Yêu cầu chưa đáp ứng điều kiện đổi trả',
  OTHER: 'Lý do khác',
} as const;

export class RespondReturnRequestDto {
  @ApiProperty({ required: false, enum: Object.keys(RETURN_REJECTION_REASONS), description: 'Bắt buộc khi từ chối yêu cầu' })
  @ValidateIf((dto: RespondReturnRequestDto) => dto.decision === ReturnDecision.REJECT)
  @IsEnum(Object.fromEntries(Object.keys(RETURN_REJECTION_REASONS).map(key => [key, key])))
  rejectionReason?: keyof typeof RETURN_REJECTION_REASONS;

  @ApiProperty({ enum: ReturnDecision })
  @IsEnum(ReturnDecision)
  decision: ReturnDecision;

  @ApiProperty({ description: 'Lý do và hướng xử lý gửi cho khách' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  response: string;
}

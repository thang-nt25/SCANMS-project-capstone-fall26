import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export enum ReturnDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class RespondReturnRequestDto {
  @ApiProperty({ enum: ReturnDecision })
  @IsEnum(ReturnDecision)
  decision: ReturnDecision;

  @ApiProperty({ description: 'Lý do và hướng xử lý gửi cho khách' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  response: string;

  @ApiPropertyOptional({ description: 'Từ chối và chuyển bằng chứng cho System Manager trong cùng giao dịch' })
  @IsOptional()
  @IsBoolean()
  escalateToManager?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Ảnh/video do Shop cung cấp (1–5 URL HTTPS)' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  evidenceUrls?: string[];
}

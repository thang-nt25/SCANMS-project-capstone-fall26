import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

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
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Review an explicit sandbox submission; never used by live media moderation. */
export class ReviewSandboxSampleVideoDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiProperty({ description: 'URL of the video the Shop reviewed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  videoUrl: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  revision: number;

  @ApiPropertyOptional({ description: 'Required when asking KOL to revise the video' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}

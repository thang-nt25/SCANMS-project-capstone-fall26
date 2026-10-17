import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Tên chiến dịch tiếp thị độc quyền',
    example: 'Siêu Sale Mùa Thu - VIP KOL Gala',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên chiến dịch không được để trống' })
  name: string;

  @ApiProperty({ description: 'Mức hoa hồng thưởng thêm (%)', example: 2 })
  @IsNumber()
  @Min(1, { message: 'Hoa hồng thưởng thêm tối thiểu 1%' })
  @Max(2, { message: 'Hoa hồng thưởng thêm tối đa 2%' })
  bonusCommissionRate: number;

  @ApiProperty({ description: 'Ngân sách tối đa cho phần hoa hồng thưởng thêm (VNĐ)' })
  @IsNumber()
  @Min(1)
  bonusBudgetTotal: number;

  @ApiProperty({
    description: 'Thời điểm bắt đầu chiến dịch (ISO 8601)',
    example: '2026-09-15T00:00:00.000Z',
  })
  @IsDateString(
    {},
    { message: 'Ngày bắt đầu không đúng định dạng ngày giờ ISO' },
  )
  startDate: string;

  @ApiProperty({
    description: 'Thời điểm kết thúc chiến dịch (ISO 8601)',
    example: '2026-10-15T23:59:59.000Z',
  })
  @IsDateString(
    {},
    { message: 'Ngày kết thúc không đúng định dạng ngày giờ ISO' },
  )
  endDate: string;
}

export class InviteCollaboratorDto {
  @ApiProperty({
    description: 'ID định danh của KOL / CTV',
    example: '237a7208-1c74-4322-96b2-51d810660723',
  })
  @IsUUID('4', { message: 'collaboratorId phải là định dạng UUID v4' })
  @IsNotEmpty({ message: 'collaboratorId không được để trống' })
  collaboratorId: string;

  @ApiPropertyOptional({
    description: 'ID hội thoại chat nếu mời trực tiếp từ cửa sổ chat',
  })
  @IsOptional()
  @IsUUID('4', { message: 'conversationId phải là UUID v4' })
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Lời nhắn riêng đính kèm thẻ mời VIP' })
  @IsOptional()
  @IsString()
  personalMessage?: string;
}

export class InviteInChatDto {
  @ApiProperty({
    description: 'ID chiến dịch cần gửi thẻ mời',
    example: '11111111-2222-3333-4444-555555555555',
  })
  @IsUUID('4', { message: 'campaignId phải là UUID v4' })
  @IsNotEmpty({ message: 'campaignId không được để trống' })
  campaignId: string;

  @ApiPropertyOptional({ description: 'Lời nhắn riêng đính kèm thẻ mời' })
  @IsOptional()
  @IsString()
  personalMessage?: string;
}

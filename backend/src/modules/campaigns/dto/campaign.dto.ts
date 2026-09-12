import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  bonusCommissionRate: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class InviteCollaboratorDto {
  @IsString()
  @IsNotEmpty()
  collaboratorId: string;
}

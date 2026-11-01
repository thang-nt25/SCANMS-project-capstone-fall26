import { IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExclusiveDealDto } from './create-exclusive-deal.dto';
import { ApproveExclusiveDealDto } from './approve-exclusive-deal.dto';

/** Same product, rate and order KPI contract as a KOC proposal. */
export class InviteExclusiveDealDto extends CreateExclusiveDealDto {
  @IsUUID()
  collaboratorId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApproveExclusiveDealDto)
  couponTerms?: ApproveExclusiveDealDto;
}

import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateShopDealOfferDto {
  @IsUUID()
  collaboratorId: string;

  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(11, { message: 'Mức thù lao độc quyền phải từ 11% trở lên.' })
  @Max(16, { message: 'Khung tự trị của Giám đốc Nhãn hàng tối đa là 16%.' })
  proposedCommissionRate: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  targetOrders: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  commitmentDays: number;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  salesCommitment: string;
}


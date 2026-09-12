import { PartialType } from '@nestjs/swagger';
import { ApproveCouponDto } from './approve-coupon.dto';

export class UpdateCouponPolicyDto extends PartialType(ApproveCouponDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateCustomerAddressDto } from './create-address.dto';

export class UpdateCustomerAddressDto extends PartialType(CreateCustomerAddressDto) {}

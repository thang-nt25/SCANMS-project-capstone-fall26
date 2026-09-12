import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  Matches,
  IsString,
  MaxLength,
} from 'class-validator';

export class RefundOrderDto {
  @ApiProperty({
    description: 'ID định danh của đơn hàng cần hoàn tiền (UUID)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsNotEmpty({ message: 'ID đơn hàng không được để trống' })
  @IsUUID('4', { message: 'ID đơn hàng phải là định dạng UUID v4' })
  orderId: string;

  @ApiProperty({
    description: 'Số tiền hoàn (VND, số nguyên dương > 0)',
    example: '50000',
  })
  @IsNotEmpty({ message: 'Số tiền hoàn không được để trống' })
  @Matches(/^[1-9]\d*$/, {
    message: 'Số tiền hoàn phải là số nguyên dương lớn hơn 0 (VND)',
  })
  refundAmount: string;

  @ApiProperty({
    description: 'Lý do hoàn tiền đơn hàng',
    example: 'Khách hàng đổi trả sản phẩm bị lỗi sản xuất',
  })
  @IsNotEmpty({ message: 'Lý do hoàn tiền không được để trống' })
  @IsString({ message: 'Lý do hoàn tiền phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Lý do hoàn tiền không được vượt quá 255 ký tự' })
  reason: string;
}

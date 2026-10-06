import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderFulfillmentDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'Trạng thái mới của đơn hàng',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Mã vận đơn bưu cục (ví dụ GHTK-889922, GHN-12345)',
  })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Mã vận đơn phải có ít nhất 5 ký tự' })
  @MaxLength(50, { message: 'Mã vận đơn không được vượt quá 50 ký tự' })
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, {
    message: 'Mã vận đơn chứa ký tự không hợp lệ',
  })
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Tên đơn vị vận chuyển (GHTK, GHN, Viettel Post, v.v.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80, {
    message: 'Tên đơn vị vận chuyển không được vượt quá 80 ký tự',
  })
  carrierName?: string;

  @ApiPropertyOptional({ description: 'Ghi chú cập nhật' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú không được vượt quá 500 ký tự' })
  note?: string;
}

export class QueryStoreOrdersDto {
  @ApiPropertyOptional({ description: 'Trạng thái đơn hàng' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm (Mã đơn, Tên, Số điện thoại)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái thanh toán (UNPAID, PAID)',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại (mặc định 1)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang (mặc định 20)' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'ID gian hàng (nếu tài khoản sở hữu nhiều shop)',
  })
  @IsOptional()
  @IsString()
  storeId?: string;
}

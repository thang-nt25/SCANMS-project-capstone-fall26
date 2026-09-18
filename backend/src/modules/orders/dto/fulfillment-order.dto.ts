import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderFulfillmentDto {
  @ApiProperty({ enum: OrderStatus, description: 'Trạng thái mới của đơn hàng' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Mã vận đơn bưu cục (ví dụ GHTK-889922, GHN-12345)' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Tên đơn vị vận chuyển (GHTK, GHN, Viettel Post, v.v.)' })
  @IsOptional()
  @IsString()
  carrierName?: string;

  @ApiPropertyOptional({ description: 'Ghi chú cập nhật' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryStoreOrdersDto {
  @ApiPropertyOptional({ description: 'Trạng thái đơn hàng' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (Mã đơn, Tên, Số điện thoại)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại (mặc định 1)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang (mặc định 20)' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'ID gian hàng (nếu tài khoản sở hữu nhiều shop)' })
  @IsOptional()
  @IsString()
  storeId?: string;
}

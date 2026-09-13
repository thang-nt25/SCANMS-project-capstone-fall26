import {
  IsEnum,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExternalOrderPlatform {
  SHOPEE = 'shopee',
  TIKTOK = 'tiktok',
  SHOPIFY = 'shopify',
}

export class OrderWebhookDto {
  @ApiProperty({
    enum: ExternalOrderPlatform,
    example: ExternalOrderPlatform.SHOPEE,
    description: 'Nền tảng gửi đơn hàng',
  })
  @IsEnum(ExternalOrderPlatform, {
    message: 'Nguồn đơn hàng phải là shopee, tiktok hoặc shopify',
  })
  source: ExternalOrderPlatform;

  @ApiPropertyOptional({
    description: 'ID cửa hàng nhận đơn. Bắt buộc nếu không có storeSlug',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId phải là UUID hợp lệ' })
  storeId?: string;

  @ApiPropertyOptional({
    example: 'techstore-flagship',
    description: 'Slug cửa hàng nhận đơn. Bắt buộc nếu không có storeId',
  })
  @IsOptional()
  @IsString()
  storeSlug?: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Payload đơn hàng nguyên bản từ nền tảng bên ngoài',
  })
  @IsObject({ message: 'payload phải là một JSON object' })
  @IsNotEmptyObject({}, { message: 'payload không được để trống' })
  payload: Record<string, unknown>;
}

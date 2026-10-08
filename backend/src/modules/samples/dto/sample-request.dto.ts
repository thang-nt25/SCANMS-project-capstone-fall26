import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsDateString,
  IsBoolean,
  Equals,
  Matches,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSampleRequestDto {
  @ApiProperty({
    description: 'ID sản phẩm muốn xin mẫu',
    example: 'uuid-here',
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'SKU/phiên bản sản phẩm được xin mẫu' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ description: 'Họ tên người nhận hàng mẫu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  recipientName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận hàng mẫu' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9\s().-]{9,20}$/, {
    message: 'Số điện thoại người nhận không hợp lệ.',
  })
  recipientPhone: string;

  @ApiProperty({
    description: 'Địa chỉ nhận hàng mẫu',
    example: '123 Nguyễn Văn A, Q.1, TP.HCM',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shippingAddress: string;

  @ApiProperty({ description: 'ID kênh mạng xã hội KOL cam kết đăng video' })
  @IsUUID()
  socialChannelId: string;

  @ApiProperty({
    description: 'Loại nội dung dự kiến, ví dụ video review 60 giây',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  contentType: string;

  @ApiProperty({ description: 'Ngày dự kiến đăng video (ISO 8601)' })
  @IsDateString()
  expectedVideoAt: string;

  @ApiProperty({ description: 'KOL đã tích xác nhận cam kết 14 ngày' })
  @IsBoolean()
  @Equals(true, {
    message: 'Bạn cần đồng ý với cam kết nộp video trong 14 ngày.',
  })
  termsAccepted: boolean;
}

export class ApproveRejectSampleDto {
  @ApiPropertyOptional({
    description: 'Lý do từ chối (chỉ khi reject)',
    example: 'Sản phẩm đã hết hàng mẫu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectedReason?: string;
}

export class RejectSampleRequestDto {
  @ApiProperty({ description: 'Lý do từ chối yêu cầu xin mẫu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectedReason: string;
}

export class SubmitSampleVideoDto {
  @ApiProperty({ description: 'Tiêu đề video review' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Link video review công khai' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  videoUrl: string;

  @ApiPropertyOptional({ description: 'Mô tả hoặc nội dung review' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;
}

export class ReportSampleDeliveryIssueDto {
  @ApiProperty({ description: 'Mô tả sự cố giao nhận' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ShipSampleRequestDto {
  @ApiProperty({
    description: 'Mã vận đơn GHTK / GHN',
    example: 'GHTK123456789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  trackingNumber: string;

  @ApiPropertyOptional({
    description: 'Đơn vị vận chuyển (GHTK / GHN / ...)',
    example: 'GHTK',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  carrier?: string;
}

export class AdminResolveSampleRequestDto {
  @ApiProperty({
    enum: ['EXTEND_DEADLINE', 'CANCEL_OBLIGATION', 'RESOLVE_DELIVERY_ISSUE'],
  })
  @IsIn(['EXTEND_DEADLINE', 'CANCEL_OBLIGATION', 'RESOLVE_DELIVERY_ISSUE'])
  action: 'EXTEND_DEADLINE' | 'CANCEL_OBLIGATION' | 'RESOLVE_DELIVERY_ISSUE';

  @ApiProperty({ description: 'Lý do và căn cứ xử lý của quản trị viên' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Hạn mới theo ISO 8601, bắt buộc khi gia hạn',
  })
  @IsOptional()
  @IsDateString()
  deadlineAt?: string;
}

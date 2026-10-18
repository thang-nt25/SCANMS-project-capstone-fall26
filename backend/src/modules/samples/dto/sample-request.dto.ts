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
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeSamplePhone, SAMPLE_PHONE_PATTERN, SAMPLE_PHONE_ERROR } from '../sample-phone';

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
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  recipientName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận hàng mẫu' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeSamplePhone(value))
  @Matches(SAMPLE_PHONE_PATTERN, { message: SAMPLE_PHONE_ERROR })
  recipientPhone: string;

  @ApiProperty({ description: 'KOL xác nhận đây là số điện thoại thật của người nhận và GHN liên hệ được' })
  @IsBoolean()
  @Equals(true, { message: 'Bạn cần xác nhận số điện thoại của người nhận.' })
  recipientPhoneConfirmed: boolean;


  @ApiProperty({
    description: 'Địa chỉ nhận hàng mẫu',
    example: '123 Nguyễn Văn A, Phường A, Quận B, Tỉnh C',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shippingAddress: string;

  @ApiProperty({ description: 'Mã tỉnh/thành GHN' })
  @IsInt()
  @Min(1)
  ghnProvinceId: number;

  @ApiProperty({ description: 'Mã quận/huyện GHN' })
  @IsInt()
  @Min(1)
  ghnDistrictId: number;

  @ApiProperty({ description: 'Mã phường/xã GHN' })
  @IsString()
  @IsNotEmpty()
  ghnWardCode: string;

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

  @ApiProperty({ description: 'Trường cũ; hạn video được tính sau khi GHN xác nhận giao', required: false })
  @IsOptional()
  @IsDateString()
  expectedVideoAt?: string;

  @ApiProperty({ description: 'KOL đã tích xác nhận cam kết 14 ngày' })
  @IsBoolean()
  @Equals(true, {
    message: 'Bạn cần đồng ý với cam kết nộp video trong 14 ngày.',
  })
  termsAccepted: boolean;
}

export class UpdateSampleRequestDto extends OmitType(CreateSampleRequestDto, [
  'productId', 'productVariantId', 'expectedVideoAt',
] as const) {}

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
    enum: [
      'EXTEND_DEADLINE',
      'CANCEL_OBLIGATION',
      'RESOLVE_DELIVERY_ISSUE',
      'BLOCK_SAMPLE_REQUESTS',
      'DISMISS_REPORT',
    ],
  })
  @IsIn([
    'EXTEND_DEADLINE',
    'CANCEL_OBLIGATION',
    'RESOLVE_DELIVERY_ISSUE',
    'BLOCK_SAMPLE_REQUESTS',
    'DISMISS_REPORT',
  ])
  action:
    | 'EXTEND_DEADLINE'
    | 'CANCEL_OBLIGATION'
    | 'RESOLVE_DELIVERY_ISSUE'
    | 'BLOCK_SAMPLE_REQUESTS'
    | 'DISMISS_REPORT';

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

export class ExtendSampleDeadlineDto {
  @ApiProperty({ description: 'Hạn nộp hoặc sửa video mới, theo ISO 8601' })
  @IsDateString()
  deadlineAt: string;

  @ApiProperty({ description: 'Lý do gia hạn của gian hàng' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ReportSampleViolationDto {
  @ApiProperty({
    description: 'Lý do báo cáo và bằng chứng vi phạm thời hạn video',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

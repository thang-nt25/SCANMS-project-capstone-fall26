import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'ID sản phẩm' })
  productId: string;

  @ApiPropertyOptional({ description: 'ID phân loại sản phẩm (nếu có)' })
  variantId?: string;

  @ApiProperty({ description: 'Tên sản phẩm' })
  title: string;

  @ApiProperty({ description: 'Mã SKU' })
  sku: string;

  @ApiProperty({ description: 'Ảnh đại diện' })
  imageUrl: string;

  @ApiProperty({ description: 'Số lượng mua' })
  quantity: number;

  @ApiProperty({ description: 'Đơn giá áp dụng' })
  unitPrice: number;
}

export class StoreInfoResponseDto {
  @ApiProperty({ description: 'Tên gian hàng' })
  name: string;

  @ApiProperty({ description: 'Slug gian hàng' })
  slug: string;

  @ApiPropertyOptional({ description: 'Logo gian hàng' })
  logoUrl?: string;
}

export class VietQrResponseDto {
  @ApiProperty({ description: 'Mã ngân hàng (VD: MB)' })
  bankCode: string;

  @ApiProperty({ description: 'Số tài khoản thụ hưởng' })
  accountNumber: string;

  @ApiProperty({ description: 'Tên chủ tài khoản' })
  accountName: string;

  @ApiProperty({ description: 'Số tiền thanh toán' })
  amount: number;

  @ApiProperty({ description: 'Nội dung chuyển khoản (mã đơn)' })
  memo: string;

  @ApiProperty({ description: 'Link QR VietQR' })
  qrUrl: string;
}

export class OrderCreatedResponseDto {
  @ApiProperty({ description: 'Thông báo kết quả', example: 'Đặt hàng thành công!' })
  message: string;

  @ApiProperty({ description: 'Mã đơn hàng công khai', example: 'DH-2026-A1B2C3D4' })
  publicOrderCode: string;

  @ApiProperty({ description: 'Trạng thái đơn hàng', example: 'PENDING' })
  status: string;

  @ApiProperty({ description: 'Tổng tiền tạm tính sản phẩm', example: 459000 })
  subtotalAmount: number;

  @ApiProperty({ description: 'Số tiền giảm giá', example: 45900 })
  discountAmount: number;

  @ApiProperty({ description: 'Phí vận chuyển', example: 0 })
  shippingFee: number;

  @ApiProperty({ description: 'Chính sách vận chuyển', example: 'NATIONWIDE_FREE_SHIPPING' })
  shippingFeePolicy: string;

  @ApiProperty({ description: 'Tổng tiền thanh toán cuối cùng', example: 413100 })
  finalAmount: number;

  @ApiProperty({ description: 'Phương thức thanh toán', example: 'COD' })
  paymentMethod: string;

  @ApiProperty({ description: 'Trạng thái thanh toán', example: 'UNPAID' })
  paymentStatus: string;

  @ApiPropertyOptional({ description: 'Dữ liệu VietQR nếu chọn chuyển khoản', type: VietQrResponseDto })
  vietqr?: VietQrResponseDto | null;

  @ApiPropertyOptional({ description: 'Token hủy đơn bảo mật cấp 1 lần cho khách', example: 'token-abc...' })
  cancellationToken?: string;

  @ApiProperty({ description: 'Đường dẫn tra cứu đơn hàng', example: '/tracking?sn=DH-2026-A1B2C3D4' })
  trackingUrl: string;

  @ApiProperty({
    description: 'Email xác nhận đã được đưa vào tiến trình gửi sau khi đơn commit',
    example: true,
  })
  confirmationEmailQueued: boolean;

  @ApiProperty({ description: 'Danh sách sản phẩm trong đơn', type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ description: 'Thông tin gian hàng', type: StoreInfoResponseDto })
  store: StoreInfoResponseDto;
}

export class PublicOrderDetailResponseDto {
  @ApiProperty({ description: 'Mã đơn hàng công khai' })
  publicOrderCode: string;

  @ApiProperty({ description: 'Trạng thái đơn hàng' })
  status: string;

  @ApiProperty({ description: 'Họ tên người nhận' })
  customerName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận (đã che hoặc đầy đủ nếu xác thực token)' })
  customerPhone: string;

  @ApiProperty({ description: 'Địa chỉ giao hàng' })
  shippingAddress: string;

  @ApiProperty({ description: 'Tổng tiền tạm tính' })
  subtotalAmount: number;

  @ApiProperty({ description: 'Giảm giá' })
  discountAmount: number;

  @ApiProperty({ description: 'Phí vận chuyển' })
  shippingFee: number;

  @ApiProperty({ description: 'Thành tiền' })
  finalAmount: number;

  @ApiProperty({ description: 'Phương thức thanh toán' })
  paymentMethod: string;

  @ApiProperty({ description: 'Trạng thái thanh toán' })
  paymentStatus: string;

  @ApiProperty({ description: 'Thời gian đặt hàng' })
  createdAt: string;

  @ApiProperty({ description: 'Danh sách sản phẩm', type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ description: 'Thông tin gian hàng', type: StoreInfoResponseDto })
  store: StoreInfoResponseDto;
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Mã đơn hàng cần đối soát', example: 'DH-2026-A1B2C3D4' })
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @ApiProperty({ description: 'Số tiền thực nhận', example: 413100 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Mã giao dịch ngân hàng', example: 'FT260913889900' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ description: 'Đơn vị tiền tệ (mặc định VND)', example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Ghi chú hoặc bằng chứng thanh toán' })
  @IsOptional()
  @IsString()
  paymentProof?: string;
}

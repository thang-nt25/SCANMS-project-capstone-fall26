import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LandingProductDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'ID duy nhất của sản phẩm' })
  id: string;

  @ApiProperty({ example: 'SERUM-VITC', description: 'Mã SKU định danh sản phẩm' })
  sku: string;

  @ApiProperty({ example: 'Serum Vitamin C 15%', description: 'Tên sản phẩm' })
  title: string;

  @ApiProperty({ example: 'Mỹ phẩm & Chăm sóc da', description: 'Tên danh mục sản phẩm' })
  categoryName: string;

  @ApiProperty({ example: 'Tinh chất dưỡng sáng da mờ thâm nám chuyên sâu', description: 'Mô tả sản phẩm' })
  description: string;

  @ApiProperty({ example: 459000, description: 'Giá bán niêm yết hiện tại (VND)' })
  price: number;

  @ApiPropertyOptional({ example: 550000, description: 'Giá gốc trước giảm giá (VND)' })
  originalPrice?: number | null;

  @ApiPropertyOptional({ example: 'https://cdn.scanms.vn/products/serum.jpg', description: 'URL ảnh đại diện chính' })
  imageUrl?: string | null;

  @ApiProperty({ example: true, description: 'Trạng thái hoạt động của sản phẩm' })
  isActive: boolean;

  @ApiProperty({ example: true, description: 'Khách hàng có thể mua sản phẩm lúc này không' })
  canPurchase: boolean;

  @ApiProperty({ example: 'ACTIVE', description: 'Trạng thái kinh doanh sản phẩm (ACTIVE | INACTIVE | OUT_OF_STOCK)' })
  status: string;

  @ApiPropertyOptional({ description: 'Danh sách các phân loại SKU/Variant của sản phẩm' })
  variants?: any[];
}

export class LandingStoreDto {
  @ApiProperty({ example: 'store-uuid-1', description: 'ID gian hàng' })
  id: string;

  @ApiProperty({ example: 'Sora Skin Official', description: 'Tên gian hàng đối tác' })
  name: string;

  @ApiProperty({ example: 'sora-skin', description: 'Slug định danh gian hàng' })
  slug: string;

  @ApiProperty({ example: true, description: 'Trạng thái xác minh gian hàng chính hãng' })
  isVerified: boolean;
}

export class LandingKolInfoDto {
  @ApiPropertyOptional({ example: 'kol-uuid-1', description: 'ID của KOL' })
  id: string | null;

  @ApiProperty({ example: 'Hoàng Yến Beauty', description: 'Tên hiển thị của KOL' })
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.scanms.vn/avatars/yen.jpg', description: 'Avatar của KOL' })
  avatarUrl: string | null;

  @ApiProperty({ example: true, description: 'KOL đã được xác minh KYC' })
  isVerified: boolean;

  @ApiProperty({ example: 'Video review từ KOL', description: 'Nhãn định danh' })
  badgeLabel: string;

  @ApiProperty({ example: 'Nội dung có liên kết tiếp thị', description: 'Công bố minh bạch quảng cáo' })
  disclosure: string;
}

export class LandingVideoDto {
  @ApiProperty({ example: 'media-uuid-1', description: 'ID tài nguyên video' })
  id: string;

  @ApiProperty({ example: 'Review Serum Vitamin C sau 14 ngày', description: 'Tiêu đề video' })
  title: string;

  @ApiProperty({ example: 'https://cdn.scanms.vn/videos/review.mp4', description: 'URL phát video' })
  videoUrl: string;

  @ApiPropertyOptional({ example: 'https://cdn.scanms.vn/videos/poster.jpg', description: 'URL ảnh poster' })
  posterUrl: string | null;

  @ApiPropertyOptional({ example: 'Trải nghiệm 2 tuần làm mờ thâm mụn', description: 'Phụ đề / tóm tắt' })
  caption: string | null;

  @ApiProperty({ type: LandingKolInfoDto, description: 'Thông tin KOL hoặc Gian hàng sản xuất video' })
  kol: LandingKolInfoDto;

  @ApiPropertyOptional({ example: true, description: 'Video nổi bật được Shop ghim' })
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Video của KOL referral mà khách đang theo dõi' })
  isReferredKol?: boolean;
}

export class LandingReviewItemDto {
  @ApiProperty({ example: 'rev-uuid-1', description: 'ID đánh giá' })
  id: string;

  @ApiProperty({ example: 'Nguyễn Đ*** T***', description: 'Tên khách hàng đã che PII bảo vệ riêng tư' })
  customerName: string;

  @ApiProperty({ example: 5, description: 'Số sao đánh giá (1-5)' })
  rating: number;

  @ApiProperty({ example: 'Sản phẩm dùng rất thích, đóng gói cẩn thận', description: 'Nội dung đánh giá' })
  comment: string;

  @ApiPropertyOptional({ example: null, description: 'URL ảnh chụp đánh giá' })
  reviewImageUrl?: string | null;

  @ApiProperty({ example: true, description: 'Đã mua hàng và đơn hàng đã giao thành công' })
  isVerifiedBuyer: boolean;

  @ApiProperty({ example: '2026-09-12T10:00:00.000Z', description: 'Thời gian đánh giá' })
  createdAt: Date;
}

export class LandingReviewsDto {
  @ApiPropertyOptional({ example: 4.8, description: 'Điểm đánh giá trung bình (null nếu chưa có đánh giá)' })
  averageRating: number | null;

  @ApiProperty({ example: 25, description: 'Tổng số lượt đánh giá đã phê duyệt' })
  totalReviews: number;

  @ApiProperty({
    example: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 17 },
    description: 'Phân bố số lượng sao từ 1 đến 5',
  })
  starDistribution: Record<number, number>;

  @ApiProperty({ type: [LandingReviewItemDto], description: 'Danh sách đánh giá đã duyệt' })
  items: LandingReviewItemDto[];
}

export class LandingAvailabilityDto {
  @ApiProperty({ example: true, description: 'Còn hàng trong kho' })
  inStock: boolean;

  @ApiProperty({ example: 48, description: 'Số lượng hàng sẵn có' })
  stockQuantity: number;
}

export class LandingPoliciesDto {
  @ApiProperty({ example: 'Đổi trả miễn phí 7 ngày', description: 'Chính sách đổi trả của Shop' })
  returnPolicy: string;

  @ApiProperty({ example: 'Bảo hành chính hãng 12 tháng', description: 'Chính sách bảo hành của Shop' })
  warranty: string;

  @ApiProperty({ example: 'Giao hàng toàn quốc - Đồng kiểm khi nhận', description: 'Chính sách vận chuyển' })
  shipping: string;

  @ApiProperty({ example: 'Cam kết 100% sản phẩm chính hãng', description: 'Cam kết nguồn gốc xuất xứ' })
  genuineCommitment: string;
}

export class ProductLandingResponseDto {
  @ApiProperty({ type: LandingProductDto, description: 'Thông tin sản phẩm' })
  product: LandingProductDto;

  @ApiProperty({ type: LandingStoreDto, description: 'Thông tin gian hàng đối tác' })
  store: LandingStoreDto;

  @ApiProperty({ example: ['https://cdn.scanms.vn/img1.jpg'], description: 'Thư viện hình ảnh sản phẩm' })
  images: string[];

  @ApiProperty({ type: [LandingVideoDto], description: 'Danh sách video review đã kiểm duyệt' })
  videos: LandingVideoDto[];

  @ApiProperty({ type: LandingReviewsDto, description: 'Dữ liệu đánh giá đã duyệt từ khách thật' })
  reviews: LandingReviewsDto;

  @ApiProperty({ type: LandingAvailabilityDto, description: 'Tồn kho khả dụng' })
  availability: LandingAvailabilityDto;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Trạng thái kinh doanh sản phẩm (ACTIVE | INACTIVE | OUT_OF_STOCK)' })
  status?: string;

  @ApiProperty({ type: LandingPoliciesDto, description: 'Chính sách cam kết của gian hàng' })
  policies: LandingPoliciesDto;
}

import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class ApplyKolUpgradeDto {
  @ApiProperty({ example: '001201012345', description: 'Số Căn cước công dân (12 số)' })
  @IsString({ message: 'Số CCCD/CMND không hợp lệ' })
  @IsNotEmpty({ message: 'Số CCCD/CMND không được để trống' })
  idCardNumber: string;

  @ApiPropertyOptional({ example: '8012345678', description: 'Mã số thuế cá nhân' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiProperty({ example: 'Vietcombank', description: 'Tên ngân hàng' })
  @IsString({ message: 'Tên ngân hàng không được để trống' })
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  bankName: string;

  @ApiProperty({ example: '0123456789', description: 'Số tài khoản ngân hàng nhận hoa hồng' })
  @IsString({ message: 'Số tài khoản không được để trống' })
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  bankAccountNumber: string;

  @ApiProperty({ example: 'NGUYEN THANH THANG', description: 'Tên chủ tài khoản (In hoa)' })
  @IsString({ message: 'Tên chủ tài khoản không được để trống' })
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  bankAccountName: string;

  @ApiPropertyOptional({ example: 'KOL chuyên review mỹ phẩm organic và thời trang', description: 'Giới thiệu bản thân' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Ảnh CCCD mặt trước' })
  @IsOptional()
  @IsString()
  frontCardUrl?: string;

  @ApiPropertyOptional({ description: 'Ảnh CCCD mặt sau' })
  @IsOptional()
  @IsString()
  backCardUrl?: string;

  @ApiProperty({ enum: SocialPlatform, example: SocialPlatform.TIKTOK, description: 'Nền tảng mạng xã hội chính' })
  @IsNotEmpty({ message: 'Vui lòng chọn nền tảng mạng xã hội' })
  platform: SocialPlatform;

  @ApiProperty({ example: 'Thắng Review Điêu Luyện', description: 'Tên kênh hiển thị' })
  @IsString({ message: 'Tên kênh không được để trống' })
  @IsNotEmpty({ message: 'Tên kênh không được để trống' })
  channelName: string;

  @ApiProperty({ example: 'https://tiktok.com/@thangreview', description: 'Đường dẫn liên kết kênh' })
  @IsString({ message: 'Link kênh không được để trống' })
  @IsNotEmpty({ message: 'Link kênh không được để trống' })
  channelUrl: string;

  @ApiProperty({ example: 45000, description: 'Số lượng người theo dõi (Followers)' })
  @IsNumber({}, { message: 'Số lượng người theo dõi phải là số' })
  followerCount: number;

  @ApiPropertyOptional({ description: 'Ảnh chụp màn hình trang quản trị kênh chứng minh sở hữu' })
  @IsOptional()
  @IsString()
  channelProofUrl?: string;
}

export class ApplyShopUpgradeDto {
  @ApiProperty({ example: 'Sora Skin Official Store', description: 'Tên gian hàng / Thương hiệu' })
  @IsString({ message: 'Tên gian hàng không được để trống' })
  @IsNotEmpty({ message: 'Tên gian hàng không được để trống' })
  shopName: string;

  @ApiPropertyOptional({ example: 'Mỹ phẩm sinh học và sản phẩm chăm sóc da chuẩn quốc tế', description: 'Mô tả gian hàng' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Kho A3, Cụm Kho Vận Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh',
    description: 'Địa chỉ kho xuất hàng thực tế (Bắt buộc theo Nghị định 85/2021/NĐ-CP)',
  })
  @IsString({ message: 'Địa chỉ kho hàng không được để trống' })
  @IsNotEmpty({ message: 'Địa chỉ kho hàng là bắt buộc theo quy định thương mại điện tử' })
  warehouseAddress: string;

  @ApiProperty({ example: 'ENTERPRISE', description: 'Loại hình kinh doanh: INDIVIDUAL, HOUSEHOLD, ENTERPRISE' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn loại hình kinh doanh' })
  businessType: string;

  @ApiProperty({ example: '0315891234', description: 'Mã số thuế doanh nghiệp / hộ kinh doanh / cá nhân' })
  @IsString({ message: 'Mã số thuế không được để trống' })
  @IsNotEmpty({ message: 'Mã số thuế là bắt buộc để phát hành hóa đơn' })
  taxCode: string;

  @ApiPropertyOptional({ description: 'Link ảnh/tài liệu Giấy phép đăng ký kinh doanh GPKD hoặc CCCD đại diện' })
  @IsOptional()
  @IsString()
  businessLicenseUrl?: string;

  @ApiPropertyOptional({ description: 'Link giấy ủy quyền phân phối thương hiệu chính hãng hoặc hóa đơn VAT đầu vào' })
  @IsOptional()
  @IsString()
  brandAuthorizationUrl?: string;

  @ApiProperty({ example: '0988776655', description: 'Số hotline hỗ trợ kỹ thuật / xử lý đơn' })
  @IsString({ message: 'Số hotline không được để trống' })
  @IsNotEmpty({ message: 'Số hotline là bắt buộc' })
  contactPhone: string;

  @ApiProperty({ example: 'contact@soraskin.vn', description: 'Email tiếp nhận đối soát thanh toán' })
  @IsString({ message: 'Email đối soát không được để trống' })
  @IsNotEmpty({ message: 'Email đối soát là bắt buộc' })
  contactEmail: string;
}

export class ReviewUpgradeApplicationDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'], example: 'VERIFIED' })
  @IsNotEmpty()
  status: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Hồ sơ đã được xác minh đầy đủ giấy phép kinh doanh và chứng từ xuất xứ.' })
  @IsOptional()
  @IsString()
  note?: string;
}

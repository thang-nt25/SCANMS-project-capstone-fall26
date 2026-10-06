import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKycDto {
  @ApiProperty({
    example: '001201012345',
    description: 'Số Căn cước công dân (CCCD 12 số)',
  })
  @IsString({ message: 'Số CCCD/CMND không hợp lệ' })
  @IsNotEmpty({ message: 'Số CCCD/CMND không được để trống' })
  idCardNumber: string;

  @ApiProperty({
    example: '8012345678',
    description: 'Mã số thuế thu nhập cá nhân',
  })
  @IsString({ message: 'Mã số thuế không hợp lệ' })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  taxCode: string;

  @ApiPropertyOptional({
    example: 'Vietcombank',
    description: 'Tên ngân hàng thụ hưởng',
  })
  @IsOptional()
  @IsString({ message: 'Tên ngân hàng không hợp lệ' })
  bankName?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Số tài khoản ngân hàng' })
  @IsOptional()
  @IsString({ message: 'Số tài khoản ngân hàng không hợp lệ' })
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    example: 'NGUYEN THANH THANG',
    description: 'Tên chủ tài khoản (In hoa)',
  })
  @IsOptional()
  @IsString({ message: 'Tên chủ tài khoản không hợp lệ' })
  bankAccountName?: string;

  @ApiPropertyOptional({
    example: 'KOL chuyên review đồ công nghệ và lifestyle',
    description: 'Tiểu sử / Giới thiệu',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/.../cccd_front.jpg',
    description: 'Ảnh CCCD mặt trước',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng tải lên ảnh CCCD mặt trước' })
  frontCardUrl: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/.../cccd_back.jpg',
    description: 'Ảnh CCCD mặt sau',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng tải lên ảnh CCCD mặt sau' })
  backCardUrl: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/.../channel_proof.jpg',
    description: 'Ảnh chụp màn hình trang quản trị kênh',
  })
  @IsOptional()
  @IsString()
  channelProofUrl?: string;

  @ApiPropertyOptional({
    example: 'TIKTOK',
    description: 'Nền tảng mạng xã hội chính',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    example: 'Thành Thắng Reviews',
    description: 'Tên kênh hiển thị',
  })
  @IsOptional()
  @IsString()
  channelName?: string;

  @ApiPropertyOptional({
    example: 'https://tiktok.com/@thangtechreview',
    description: 'Đường dẫn liên kết kênh',
  })
  @IsOptional()
  @IsString()
  channelUrl?: string;

  @ApiPropertyOptional({
    example: 15000,
    description: 'Số lượng người theo dõi (Followers)',
  })
  @IsOptional()
  followerCount?: number;
}

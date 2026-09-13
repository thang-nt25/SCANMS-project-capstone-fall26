import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { PrismaService } from '../../core/database/prisma.service';
import { verifyReviewToken } from './order-security.utils';
import { UploadReviewMediaDto } from './dto/upload-review-media.dto';

export const MAX_REVIEW_UPLOAD_BYTES = 50 * 1024 * 1024;

export function validateReviewMedia(
  file?: Express.Multer.File,
): 'image' | 'video' {
  if (!file?.buffer?.length || file.size !== file.buffer.length)
    throw new BadRequestException('File trống hoặc không hợp lệ');
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  const bytes = file.buffer;
  const png =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255;
  const webp =
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  if (
    (png && extension === 'png' && file.mimetype === 'image/png') ||
    (jpeg &&
      ['jpg', 'jpeg'].includes(extension ?? '') &&
      file.mimetype === 'image/jpeg') ||
    (webp && extension === 'webp' && file.mimetype === 'image/webp')
  ) {
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Mỗi ảnh tối đa 5MB');
    return 'image';
  }
  // ISO Base Media/QuickTime signatures. The storage provider must also decode the media.
  const boxSize = bytes.length >= 16 ? bytes.readUInt32BE(0) : 0;
  const ftyp =
    boxSize >= 16 &&
    boxSize <= bytes.length &&
    bytes.toString('ascii', 4, 8) === 'ftyp';
  const brand = bytes.toString('ascii', 8, 12);
  const mp4 =
    ftyp && ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(brand);
  const mov = ftyp && brand === 'qt  ';
  if (
    (mp4 && extension === 'mp4' && file.mimetype === 'video/mp4') ||
    (mov && extension === 'mov' && file.mimetype === 'video/quicktime')
  ) {
    if (file.size > MAX_REVIEW_UPLOAD_BYTES)
      throw new BadRequestException('Video tối đa 50MB');
    return 'video';
  }
  throw new BadRequestException(
    'Chỉ chấp nhận JPG/PNG/WEBP hoặc MP4/MOV đúng định dạng',
  );
}

@Injectable()
export class ReviewMediaService {
  private readonly logger = new Logger(ReviewMediaService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: CloudinaryService,
  ) {}

  async upload(
    orderId: string,
    dto: UploadReviewMediaDto,
    file?: Express.Multer.File,
  ) {
    verifyReviewToken(this.config, orderId, dto.reviewToken);
    const kind = validateReviewMedia(file);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (
      !order ||
      !['DELIVERED', 'COMPLETED'].includes(order.status) ||
      !order.orderItems.some((item) => item.productId === dto.productId)
    )
      throw new ForbiddenException(
        'Đơn hàng/sản phẩm không đủ điều kiện upload đánh giá',
      );
    if (
      await this.prisma.productReview.findFirst({
        where: { orderId, productId: dto.productId },
      })
    )
      throw new BadRequestException('Sản phẩm đã được đánh giá');
    if (
      !this.config.get<string>('CLOUDINARY_URL') &&
      !(
        this.config.get<string>('CLOUDINARY_CLOUD_NAME') &&
        this.config.get<string>('CLOUDINARY_API_KEY') &&
        this.config.get<string>('CLOUDINARY_API_SECRET')
      )
    )
      throw new ServiceUnavailableException(
        'Dịch vụ tải ảnh/video chưa được cấu hình. Bạn có thể bỏ file và gửi nhận xét.',
      );
    try {
      const folder = `scanms/reviews/${orderId}/${dto.productId}`;
      return kind === 'image'
        ? await this.storage.uploadImage(file!, folder)
        : await this.storage.uploadVideo(file!, folder);
    } catch (error: unknown) {
      this.logger.error(
        `Review media upload failed: kind=${kind}, errorType=${error instanceof Error ? error.name : 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Không tải được ảnh/video. Vui lòng thử lại hoặc bỏ file để gửi nhận xét.',
      );
    }
  }
}

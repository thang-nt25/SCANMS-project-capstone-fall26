import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { validateReviewMedia } from '../orders/review-media.service';

@Injectable()
export class ReviewEvidenceService {
  constructor(private readonly prisma: PrismaService, private readonly storage: CloudinaryService) {}

  async upload(userId: string, reviewId: string, file: Express.Multer.File) {
    const review = await this.prisma.productReview.findUnique({ where: { id: reviewId }, include: { product: { include: { store: true } } } });
    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (review.product.store.ownerId !== userId) throw new ForbiddenException('Bạn không quản lý gian hàng này');
    const type = validateReviewMedia(file);
    const folder = `scanms/review-reports/${userId}/${reviewId}`;
    const result = type === 'video' ? await this.storage.uploadVideo(file, folder) : await this.storage.uploadImage(file, folder);
    return { secureUrl: result.secureUrl };
  }
}

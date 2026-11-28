import {
  BadRequestException, ConflictException, ForbiddenException, HttpException,
  HttpStatus, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductReportReason, ProductReportStatus, UserRole } from '@prisma/client';
import sharp from 'sharp';
import { CacheService } from '../../core/cache/cache.service';
import { PrismaService } from '../../core/database/prisma.service';
import { validateReviewMedia } from '../orders/review-media.service';
import { ProductsService } from './products.service';

const openStatuses: ProductReportStatus[] = ['PENDING', 'ESCALATED'];
const queueUrl = '/admin/products-pricing?tab=reports';
const pageSize = 20;
export const MAX_PRODUCT_REPORT_VIDEO_BYTES = 10 * 1024 * 1024;
const decisionLabels: Record<Exclude<ProductReportStatus, 'PENDING'>, string> = {
  ESCALATED: 'Chuyển Admin xem xét',
  DISMISSED: 'Không phát hiện vi phạm',
  CORRECTION_REQUESTED: 'Yêu cầu gian hàng chỉnh sửa',
  HIDDEN: 'Đã ẩn sản phẩm',
};

@Injectable()
export class ProductReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly products: ProductsService,
  ) {}

  async submit(
    reporterId: string,
    productId: string,
    input: { reason: ProductReportReason; variantId?: string; details?: string },
    file?: Express.Multer.File,
    video?: Express.Multer.File,
  ) {
    const details = input.details?.trim();
    if ((input.reason === 'SUSPECTED_COUNTERFEIT' || input.reason === 'OTHER') && !details) {
      throw new BadRequestException('Vui lòng mô tả vấn đề cần kiểm tra.');
    }
    if ((input.reason === 'WRONG_IMAGE' || input.reason === 'SUSPECTED_COUNTERFEIT') && !file) {
      throw new BadRequestException('Vui lòng đính kèm ảnh để đối chiếu báo cáo.');
    }
    const rate = await this.cache.checkRateLimit(`product-report:${reporterId}`, 10, 600);
    if (!rate.allowed) throw new HttpException('Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId, isDeleted: false, isActive: true, moderationStatus: 'APPROVED',
        store: { isActive: true, isDeleted: false, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true } },
      },
      select: {
        title: true,
        variants: { where: { id: input.variantId ?? productId, isActive: true }, select: { id: true, sku: true, name: true } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm đang hiển thị.');
    const variant = input.variantId ? product.variants[0] : undefined;
    if (input.variantId && !variant) throw new BadRequestException('Phân loại không thuộc sản phẩm này.');
    const duplicate = await this.prisma.productReport.findFirst({
      where: { productId, reporterId, status: { in: openStatuses } },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException('Báo cáo trước của bạn đang được xem xét.');

    if (video && (video.size > MAX_PRODUCT_REPORT_VIDEO_BYTES || video.mimetype !== 'video/mp4' || validateReviewMedia(video) !== 'video')) {
      throw new BadRequestException('Chỉ chấp nhận video MP4 tối đa 10 MB.');
    }
    let evidence: Buffer | undefined;
    if (file) {
      if (validateReviewMedia(file) !== 'image') throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
      try {
        evidence = await sharp(file.buffer, { limitInputPixels: 24_000_000 })
          .rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
      } catch {
        throw new BadRequestException('Không đọc được ảnh bằng chứng.');
      }
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const report = await tx.productReport.create({
          data: {
            productId, reporterId, reason: input.reason, details: details || null,
            variantId: variant?.id, variantName: variant?.name, variantSku: variant?.sku,
            evidence: evidence ? new Uint8Array(evidence) : undefined, evidenceMime: evidence ? 'image/webp' : undefined,
            evidenceVideo: video ? new Uint8Array(video.buffer) : undefined,
            evidenceVideoMime: video ? 'video/mp4' : undefined,
          },
          select: { id: true, status: true },
        });
        const staff = await tx.user.findMany({
          where: { role: { in: ['SYSTEM_MANAGER', 'SYSTEM_ADMIN'] }, isActive: true, isDeleted: false },
          select: { id: true },
        });
        if (staff.length) await tx.notification.createMany({
          data: staff.map(person => ({
            userId: person.id, type: 'PRODUCT_REPORT_RECEIVED', title: 'Báo cáo sản phẩm chờ xử lý',
            message: `Có báo cáo về sản phẩm “${product.title}”.`,
            data: { actionUrl: `${queueUrl}&report=${report.id}` },
          })),
        });
        return report;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Báo cáo trước của bạn đang được xem xét.');
      }
      throw error;
    }
  }

  async list(rawStatus: string | undefined, page: number, reportId?: string, productId?: string) {
    if (rawStatus && rawStatus !== 'ALL' && !Object.values(ProductReportStatus).includes(rawStatus as ProductReportStatus)) {
      throw new BadRequestException('Trạng thái báo cáo không hợp lệ.');
    }
    const where: Prisma.ProductReportWhereInput = reportId ? { id: reportId } : {
      productId,
      status: !rawStatus ? { in: openStatuses } : rawStatus === 'ALL' ? undefined : rawStatus as ProductReportStatus,
    };
    const safePage = Math.min(10_000, Math.max(1, page));
    const [total, items] = await this.prisma.$transaction([
      this.prisma.productReport.count({ where }),
      this.prisma.productReport.findMany({
        where, skip: (safePage - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, reason: true, details: true, status: true, evidenceMime: true, evidenceVideoMime: true, variantName: true,
          variantSku: true, createdAt: true, decisionNote: true, reviewedAt: true,
          product: { select: { id: true, sku: true, title: true, imageUrl: true, isActive: true, store: { select: { name: true } } } },
        },
      }),
    ]);
    return { total, items, page: safePage, pageSize };
  }

  async evidence(id: string) {
    const report = await this.prisma.productReport.findUnique({ where: { id }, select: { evidence: true, evidenceMime: true } });
    if (!report?.evidence || !report.evidenceMime) throw new NotFoundException('Báo cáo không có ảnh bằng chứng.');
    return { evidence: Buffer.from(report.evidence), evidenceMime: report.evidenceMime };
  }

  async videoEvidence(id: string) {
    const report = await this.prisma.productReport.findUnique({ where: { id }, select: { evidenceVideo: true } });
    if (!report?.evidenceVideo) throw new NotFoundException('Báo cáo không có video bằng chứng.');
    return Buffer.from(report.evidenceVideo);
  }

  async resolve(id: string, reviewerId: string, role: UserRole, decision: Exclude<ProductReportStatus, 'PENDING'>, rawNote: string) {
    const note = rawNote.trim();
    if (note.length < 3) throw new BadRequestException('Vui lòng nhập lý do xử lý.');
    if (decision === 'HIDDEN' && role !== 'SYSTEM_ADMIN') throw new ForbiddenException('Chỉ Admin được ẩn sản phẩm.');
    const productId = await this.prisma.$transaction(async tx => {
      const report = await tx.productReport.findUnique({
        where: { id },
        select: {
          status: true, reporterId: true, productId: true,
          product: { select: { title: true, store: { select: { ownerId: true } } } },
        },
      });
      if (!report) throw new NotFoundException('Không tìm thấy báo cáo.');
      if (!openStatuses.includes(report.status)) throw new ConflictException('Báo cáo này đã được xử lý.');
      if (report.status === 'ESCALATED' && role !== 'SYSTEM_ADMIN') throw new ForbiddenException('Báo cáo đã được chuyển Admin.');
      if (report.status === 'ESCALATED' && decision === 'ESCALATED') throw new ConflictException('Báo cáo đã được chuyển Admin.');
      const now = new Date();
      const updated = await tx.productReport.updateMany({
        where: { id, status: report.status },
        data: { status: decision, decisionNote: note, reviewedBy: reviewerId, reviewedAt: now },
      });
      if (updated.count !== 1) throw new ConflictException('Báo cáo vừa được người khác cập nhật.');
      if (decision === 'HIDDEN') {
        await tx.product.updateMany({
          where: { id: report.productId, isDeleted: false },
          data: { isActive: false, moderationStatus: 'REJECTED', moderationReason: note, moderatedAt: now, moderatedById: reviewerId },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: reviewerId, action: 'PRODUCT_REPORT_REVIEWED',
          details: { reportId: id, productId: report.productId, before: report.status, decision, note },
        },
      });
      if (decision === 'ESCALATED') {
        const admins = await tx.user.findMany({ where: { role: 'SYSTEM_ADMIN', isActive: true, isDeleted: false }, select: { id: true } });
        if (admins.length) await tx.notification.createMany({
          data: admins.map(user => ({
            userId: user.id, type: 'PRODUCT_REPORT_ESCALATED', title: 'Báo cáo sản phẩm cần Admin xem xét',
            message: `Báo cáo về “${report.product.title}” đã được chuyển Admin.`,
            data: { actionUrl: `${queueUrl}&status=ESCALATED&report=${id}` },
          })),
        });
      } else {
        const reporter = await tx.user.findFirst({ where: { id: report.reporterId, isDeleted: false }, select: { id: true } });
        if (reporter) await tx.notification.create({
          data: {
            userId: reporter.id, type: 'PRODUCT_REPORT_RESULT', title: 'Kết quả báo cáo sản phẩm',
            message: `“${report.product.title}” · ${decisionLabels[decision]}.`,
            data: { reportId: id, productId: report.productId },
          },
        });
        if (decision === 'CORRECTION_REQUESTED' || decision === 'HIDDEN') await tx.notification.create({
          data: {
            userId: report.product.store.ownerId, type: 'PRODUCT_REPORT_SHOP_ACTION', title: decisionLabels[decision],
            message: `“${report.product.title}” · ${note}`,
            data: { productId: report.productId, actionUrl: '/merchant/products' },
          },
        });
      }
      return report.productId;
    });
    if (decision === 'HIDDEN') await this.products.invalidateLandingCache(productId);
    return { id, status: decision };
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class OperationsQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(role: UserRole) {
    if (role !== UserRole.SYSTEM_ADMIN && role !== UserRole.SYSTEM_MANAGER) {
      throw new ForbiddenException(
        'Chỉ nhân sự vận hành sàn được xem hàng đợi.',
      );
    }

    // Count actionable records only. Never return identity documents to a dashboard.
    const [products, kolApplications, shopApplications, disputes] =
      await Promise.all([
        this.prisma.product.count({
          where: { isDeleted: false, moderationStatus: 'DRAFT' },
        }),
        this.prisma.collaboratorProfile.count({
          where: {
            kycStatus: 'UNVERIFIED',
            idCardNumber: { not: null, notIn: [''] },
            user: { isDeleted: false },
          },
        }),
        this.prisma.store.count({
          where: { isDeleted: false, onboardingStatus: 'PENDING_APPROVAL' },
        }),
        this.prisma.dispute.count({ where: { status: 'OPEN' } }),
      ]);

    return {
      products,
      kycApplications: kolApplications + shopApplications,
      disputes,
      generatedAt: new Date().toISOString(),
    };
  }
}

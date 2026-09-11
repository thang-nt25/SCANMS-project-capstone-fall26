import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { KycStatus } from '@prisma/client';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy hồ sơ KYC của chính KOL
   */
  async getMyKyc(userId: string) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
          },
        },
        tier: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ cộng tác viên');
    }

    return profile;
  }

  /**
   * KOL nộp hồ sơ KYC
   */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ cộng tác viên');
    }

    const updated = await this.prisma.collaboratorProfile.update({
      where: { userId },
      data: {
        idCardNumber: dto.idCardNumber.trim(),
        taxCode: dto.taxCode.trim(),
        bankName: dto.bankName.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim().toUpperCase(),
        bio: dto.bio?.trim(),
        kycStatus: KycStatus.UNVERIFIED, // Đưa về trạng thái chờ duyệt
      },
    });

    return {
      message:
        'Hồ sơ KYC đã được nộp thành công! Hệ thống sẽ xem xét và phê duyệt.',
      profile: updated,
    };
  }

  /**
   * Lấy danh sách hồ sơ KYC chờ duyệt (Dành cho Admin / Shop)
   */
  async getPendingKycList() {
    return this.prisma.collaboratorProfile.findMany({
      where: {
        idCardNumber: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
        tier: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Phê duyệt hoặc từ chối KYC
   */
  async reviewKyc(profileId: string, dto: ReviewKycDto) {
    const profile = await this.prisma.collaboratorProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ KYC');
    }

    const updated = await this.prisma.collaboratorProfile.update({
      where: { id: profileId },
      data: {
        kycStatus: dto.status,
      },
    });

    return {
      message: `Đã cập nhật trạng thái KYC thành công: ${dto.status}`,
      profile: updated,
    };
  }
}

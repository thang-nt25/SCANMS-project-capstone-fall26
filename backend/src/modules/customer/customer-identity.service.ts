import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CustomerIdentity } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { VerifyCustomerIdentityDto } from './dto/verify-identity.dto';
import { customerIdentitySchema } from './customer-identity.validation';

@Injectable()
export class CustomerIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  private present(record: CustomerIdentity) {
    // Explicit allowlist: never return relations or other customers' identity data.
    return {
      isVerified: true,
      fullName: record.fullName,
      idCardNumber: record.idCardNumber,
      address: record.address,
      verifiedAt: record.verifiedAt.toISOString(),
      verificationMethod: record.verificationMethod,
    };
  }

  async getOne(userId: string) {
    const user = await this.prisma.user
      .findUnique({
        where: { id: userId },
        select: {
          fullName: true,
          isActive: true,
          isDeleted: true,
          customerIdentity: true,
        },
      })
      .catch(() => {
        // Do not let Prisma errors containing identity fields reach application logs.
        throw new ServiceUnavailableException(
          'Không thể tải thông tin định danh. Vui lòng thử lại.',
        );
      });
    if (!user || user.isDeleted || !user.isActive) {
      throw new NotFoundException('Không tìm thấy tài khoản đang hoạt động');
    }
    if (user.customerIdentity) return this.present(user.customerIdentity);
    return {
      isVerified: false,
      fullName: user.fullName,
      idCardNumber: '',
      address: '',
    };
  }

  async confirm(userId: string, dto: VerifyCustomerIdentityDto) {
    const parsed = customerIdentitySchema.safeParse(dto);
    if (!parsed.success) {
      throw new BadRequestException(
        'Họ tên phải từ 2–150 ký tự, CCCD gồm đúng 9 hoặc 12 chữ số, địa chỉ từ 5–200 ký tự',
      );
    }

    const record = await this.prisma
      .$transaction(async (tx) => {
        // The account and its declaration commit together. Do not swallow DB errors.
        const updated = await tx.user.updateMany({
          where: { id: userId, isActive: true, isDeleted: false },
          data: { fullName: parsed.data.fullName },
        });
        if (updated.count !== 1) {
          throw new NotFoundException(
            'Không tìm thấy tài khoản đang hoạt động',
          );
        }
        const data = {
          ...parsed.data,
          verificationMethod: 'SELF_DECLARED',
          verifiedAt: new Date(),
        };
        // One declaration per user; never overwrite a separate, reviewed KYC profile.
        return tx.customerIdentity.upsert({
          where: { userId },
          create: { userId, ...data },
          update: data,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof NotFoundException) throw error;
        throw new ServiceUnavailableException(
          'Không thể lưu thông tin định danh. Vui lòng thử lại.',
        );
      });

    // Retain the existing FE contract. isVerified means buyer declaration saved,
    // NOT verification by an identity provider or approval of KOL/Shop privileges.
    return {
      success: true,
      message: 'Đã lưu thông tin định danh do bạn cung cấp',
      data: this.present(record),
    };
  }
}

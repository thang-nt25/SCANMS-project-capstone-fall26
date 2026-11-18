import {
  BadRequestException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { PayoutSettingsService } from './payout-settings.service';
import { PrismaService } from '../../core/database/prisma.service';

export interface StoredPayoutBill {
  publicId: string;
  format: string;
  sha256: string;
  secureUrl: string;
  reused?: boolean;
}

@Injectable()
export class PayoutBillService {
  constructor(private readonly settings: PayoutSettingsService, @Optional() private readonly prisma?: PrismaService) {}

  get maxBillBytes() {
    return Math.min(this.settings.maxBillBytes, 5 * 1024 * 1024);
  }

  validateBill(file: Express.Multer.File | undefined) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0)
      throw new BadRequestException('Bắt buộc upload ảnh bill ngân hàng');
    if (file.size !== file.buffer.length || file.size > this.maxBillBytes)
      throw new BadRequestException(
        'Ảnh bill vượt giới hạn dung lượng hoặc không hợp lệ',
      );
    const data = file.buffer;
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const isPng =
      data.length >= 33 &&
      data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      data.subarray(12, 16).toString('ascii') === 'IHDR' &&
      data.subarray(-8, -4).toString('ascii') === 'IEND';
    const isJpeg =
      data.length >= 4 &&
      data[0] === 255 &&
      data[1] === 216 &&
      data[2] === 255 &&
      data[data.length - 2] === 255 &&
      data[data.length - 1] === 217;
    const isWebp =
      data.length >= 20 &&
      data.subarray(0, 4).toString('ascii') === 'RIFF' &&
      data.subarray(8, 12).toString('ascii') === 'WEBP' &&
      data.readUInt32LE(4) + 8 === data.length;
    const valid =
      (isPng && file.mimetype === 'image/png' && extension === 'png') ||
      (isJpeg &&
        file.mimetype === 'image/jpeg' &&
        (extension === 'jpg' || extension === 'jpeg')) ||
      (isWebp && file.mimetype === 'image/webp' && extension === 'webp') ||
      (extension === 'pdf' &&
        file.mimetype === 'application/pdf' &&
        /^%PDF-(1\.[0-7]|2\.0)/.test(data.subarray(0, 8).toString('ascii')) &&
        /%%EOF\s*$/.test(
          data.subarray(Math.max(0, data.length - 1024)).toString('ascii'),
        ));
    if (!valid)
      throw new BadRequestException(
        'Bill phải là PNG, JPEG, PDF hoặc WEBP; nội dung, MIME và đuôi file phải khớp',
      );
    return createHash('sha256').update(data).digest('hex');
  }

  async uploadBill(file: Express.Multer.File, reuseManualEvidence = false): Promise<StoredPayoutBill> {
    const sha256 = this.validateBill(file);
    // Only the authorized Manager/Admin manual approval callers enable reuse.
    // Match the exact validated bytes against committed approvals, never a client URL.
    if (reuseManualEvidence && this.prisma) {
      const existing = await this.prisma.$queryRaw<Array<{ publicId: string; format: string; secureUrl: string | null }>>`
        SELECT proof_image_public_id AS "publicId", proof_image_format AS format, proof_image_url AS "secureUrl"
        FROM payout_requests
        WHERE status::text = 'APPROVED' AND transfer_provider = 'MANUAL' AND proof_image_sha256 = ${sha256}
          AND proof_image_public_id IS NOT NULL AND proof_image_format IS NOT NULL
        UNION ALL
        SELECT proof_public_id AS "publicId", proof_format AS format, NULL AS "secureUrl"
        FROM customer_withdrawals
        WHERE status = 'APPROVED' AND proof_hash = ${sha256}
          AND proof_public_id IS NOT NULL AND proof_format IS NOT NULL
        LIMIT 1`;
      const saved = existing[0];
      if (saved && ['png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(saved.format)) return {
        publicId: saved.publicId, format: saved.format, sha256, reused: true,
        secureUrl: saved.secureUrl || cloudinary.url(saved.publicId, { resource_type: 'image', type: 'authenticated', secure: true, format: saved.format }),
      };
    }
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.settings.billFolder,
          resource_type: 'image',
          type: 'authenticated',
          allowed_formats: ['png', 'jpg', 'webp', 'pdf'],
          timeout: 30000,
        },
        (error, result) => {
          if (error || !result)
            return reject(
              new ServiceUnavailableException(
                'Không thể lưu ảnh bill; vui lòng thử lại sau',
              ),
            );
          resolve({
            publicId: result.public_id,
            format: result.format,
            secureUrl: result.secure_url,
            sha256,
          });
        },
      );
      const fail = () =>
        reject(
          new ServiceUnavailableException(
            'Không thể lưu ảnh bill; vui lòng thử lại sau',
          ),
        );
      stream.on('error', fail);
      Readable.from(file.buffer).on('error', fail).pipe(stream);
    });
  }

  getBillDownloadUrl(publicId: string, format: string) {
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: 'image',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 120,
      attachment: false,
    });
  }

  async removeUnusedBill(publicId: string) {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type: 'authenticated',
    });
  }
}

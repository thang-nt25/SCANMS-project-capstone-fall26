import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  bytes: number;
  resourceType: string;
  width?: number;
  height?: number;
  duration?: number;
}

@Injectable()
export class CloudinaryService {
  /**
   * Tải ảnh lên Cloudinary (hỗ trợ JPG, PNG, WEBP, GIF, SVG)
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'influxnet/images',
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file ảnh để tải lên');
    }

    // Kiểm tra định dạng file
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'Định dạng file không hợp lệ, chỉ chấp nhận file ảnh',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) return reject(new BadRequestException(error.message));
          if (!result)
            return reject(
              new BadRequestException('Lỗi tải ảnh lên Cloudinary'),
            );

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resourceType: result.resource_type,
            width: result.width,
            height: result.height,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Tải video lên Cloudinary (hỗ trợ MP4, MOV, WEBM)
   */
  async uploadVideo(
    file: Express.Multer.File,
    folder: string = 'influxnet/videos',
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file video để tải lên');
    }

    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException(
        'Định dạng file không hợp lệ, chỉ chấp nhận file video',
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          chunk_size: 6000000, // 6MB chunk cho video lớn
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) return reject(new BadRequestException(error.message));
          if (!result)
            return reject(
              new BadRequestException('Lỗi tải video lên Cloudinary'),
            );

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resourceType: result.resource_type,
            duration: result.duration,
            width: result.width,
            height: result.height,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa file khỏi Cloudinary theo publicId
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
  ): Promise<{ result: string }> {
    return cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}

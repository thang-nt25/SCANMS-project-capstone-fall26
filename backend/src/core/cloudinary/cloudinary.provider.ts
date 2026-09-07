import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    // Chỉ đọc từ file .env, tuyệt đối không hardcode secret vào source code
    const cloudinaryUrl = configService.get<string>('CLOUDINARY_URL');
    if (cloudinaryUrl) {
      return cloudinary.config({
        cloudinary_url: cloudinaryUrl,
        secure: true,
      });
    }

    return cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  },
};

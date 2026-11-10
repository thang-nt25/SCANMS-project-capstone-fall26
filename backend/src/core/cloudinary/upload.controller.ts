import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import {
  CloudinaryService,
  CloudinaryUploadResult,
} from './cloudinary.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { validateProductCover } from './product-cover.policy';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('product-cover')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Tải ảnh bìa sản phẩm (hỗ trợ mọi kích thước, tối đa 5MB)' })
  @ApiConsumes('multipart/form-data')
  async uploadProductCover(@UploadedFile() file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    await validateProductCover(file);
    return this.cloudinaryService.uploadImage(file, 'scanms/products/covers');
  }

  @Post('image')
  @ApiOperation({
    summary: 'Tải ảnh lên Cloudinary (Sản phẩm, Avatar, Bill chuyển khoản)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Thư mục trên Cloudinary (mặc định: influxnet/images)',
    example: 'influxnet/products',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh cần tải lên (.jpg, .png, .webp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tải ảnh thành công, trả về link secure_url',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<CloudinaryUploadResult> {
    return this.cloudinaryService.uploadImage(
      file,
      folder || 'influxnet/images',
    );
  }

  @Post('video')
  @ApiOperation({
    summary: 'Tải video review lên Cloudinary (Video KOL review, unbox)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Thư mục trên Cloudinary (mặc định: influxnet/videos)',
    example: 'influxnet/media',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File video cần tải lên (.mp4, .mov, .webm)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tải video thành công, trả về link secure_url',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<CloudinaryUploadResult> {
    return this.cloudinaryService.uploadVideo(
      file,
      folder || 'influxnet/videos',
    );
  }
}

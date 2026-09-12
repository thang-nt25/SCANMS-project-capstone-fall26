import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
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

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

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

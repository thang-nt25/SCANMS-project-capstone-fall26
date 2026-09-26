import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Commissions & Escrow')
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('escrow-info')
  @ApiOperation({
    summary: 'Lấy chính sách Escrow thích ứng Lễ/Tết Việt Nam (FR Escrow Engine)',
    description:
      'Trả về quy tắc tính thời hạn bảo chứng, danh mục ngày nghỉ lễ chính thức và kết quả tính toán thích ứng.',
  })
  getEscrowPolicyInfo(@Query('sampleDate') sampleDate?: string) {
    return this.commissionsService.getEscrowPolicyInfo(sampleDate);
  }

  @Get('orders/:orderId/escrow')
  @ApiOperation({
    summary: 'Chi tiết đếm ngược Escrow của một đơn hàng',
    description:
      'Hiển thị trạng thái bảo chứng, số ngày/giờ còn lại, và cờ đóng băng nếu trúng ngày nghỉ lễ hoặc khiếu nại.',
  })
  async getOrderEscrowDetails(@Param('orderId') orderId: string) {
    const details = await this.commissionsService.getOrderEscrowDetails(orderId);
    if (!details) {
      throw new NotFoundException('Không tìm thấy bản ghi hoa hồng / Escrow cho đơn hàng này');
    }
    return details;
  }
}

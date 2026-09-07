import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Welcome Root API' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái máy chủ & CSDL' })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái hoạt động của hệ thống',
  })
  async getHealth() {
    return this.appService.getHealth();
  }
}

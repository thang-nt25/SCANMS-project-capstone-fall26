import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Gửi mã OTP xác thực 6 số qua Email khi đăng ký' })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi thành công' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendRegistrationOtp(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (Xác thực bằng OTP Email)' })
  @ApiResponse({ status: 201, description: 'Đăng ký tài khoản thành công' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Đăng nhập tài khoản bằng Email & Mật khẩu (Tự động gửi email thông báo bảo mật)',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(dto, { ipAddress: ip, userAgent });
  }

  @Post('google')
  @ApiOperation({
    summary:
      'Đăng nhập & Xác thực nhanh bằng Google OAuth (Google Identity Services)',
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập Google thành công' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Ip() ip?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.googleLogin(dto, { ipAddress: ip, userAgent });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản người dùng đang đăng nhập' })
  @ApiResponse({
    status: 200,
    description: 'Token hợp lệ, trả về vai trò và thông tin user thật từ server',
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async getMe(@CurrentUser('id') currentUserId?: string, @Req() req?: any) {
    const userId = currentUserId || req?.user?.sub || req?.user?.id;
    return this.authService.getMe(userId);
  }
}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { MailService } from './mail.service';

interface StoredOtp {
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  // Bộ nhớ tạm lưu mã OTP (Hiệu lực 5 phút)
  private readonly otpCache = new Map<string, StoredOtp>();
  private readonly googleOAuthClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    this.googleOAuthClient = new OAuth2Client(clientId);
  }

  /**
   * 1. Gửi mã OTP xác thực đăng ký qua Email (Gmail)
   */
  async sendRegistrationOtp(dto: SendOtpDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser && !existingUser.isDeleted) {
      throw new ConflictException(
        'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.',
      );
    }

    // Sinh mã ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    this.otpCache.set(normalizedEmail, { code: otpCode, expiresAt });

    // Gửi email thực qua MailService (kèm fallback log terminal)
    await this.mailService.sendRegistrationOtp(normalizedEmail, otpCode);

    return {
      success: true,
      message: `Mã OTP đã được gửi đến email ${normalizedEmail}`,
      // Ở môi trường dev trả về kèm để test UI thuận tiện nếu cần
      debugOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  /**
   * 2. Đăng ký tài khoản (Bắt buộc xác thực mã OTP gửi về Email)
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Xác thực mã OTP
    const cached = this.otpCache.get(normalizedEmail);
    const isDevBypass = dto.otp === '123456'; // Hỗ trợ master key cho dev / demo bảo vệ

    if (!isDevBypass) {
      if (!cached) {
        throw new BadRequestException(
          'Vui lòng yêu cầu gửi mã OTP trước khi đăng ký',
        );
      }
      if (Date.now() > cached.expiresAt) {
        this.otpCache.delete(normalizedEmail);
        throw new BadRequestException('Mã OTP đã hết hạn, vui lòng lấy mã mới');
      }
      if (cached.code !== dto.otp.trim()) {
        throw new BadRequestException('Mã OTP không chính xác');
      }
    }

    // Xóa OTP sau khi dùng thành công
    this.otpCache.delete(normalizedEmail);

    // Kiểm tra email trùng
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing && !existing.isDeleted) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role || UserRole.COLLABORATOR;

    // Tạo User
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    // Nếu là KOL / Collaborator: Tạo Profile và Ví tiền mặc định
    if (role === UserRole.COLLABORATOR) {
      const bronzeTier = await this.prisma.collaboratorTier.findFirst({
        where: { name: 'Đồng' },
      });

      await this.prisma.collaboratorProfile.create({
        data: {
          userId: user.id,
          tierId: bronzeTier?.id || null,
          bankName: '',
          bankAccountNumber: '',
          bankAccountName: user.fullName,
        },
      });

      await this.prisma.wallet.create({
        data: {
          collaboratorId: user.id,
          availableBalance: 0,
          pendingBalance: 0,
        },
      });
    }

    // Nếu là Shop: Tạo Cửa hàng mặc định
    if (role === UserRole.SHOP_MANAGER) {
      const storeName = dto.storeName?.trim() || `${user.fullName} Store`;
      const slug =
        storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString().slice(-4);

      await this.prisma.store.create({
        data: {
          ownerId: user.id,
          name: storeName,
          slug,
          defaultCommissionRate: 10.0,
          attributionWindowDays: 30,
          minPayoutAmount: 200000.0,
        },
      });
    }

    // Gửi email chào mừng
    console.log('\n======================================================');
    console.log('🎉 [SCANMS EMAIL SERVICE] CHÀO MỪNG THÀNH VIÊN MỚI');
    console.log(`Gửi tới: ${user.email} (${user.fullName})`);
    console.log(`Vai trò: ${user.role} | Tạo tài khoản thành công!`);
    console.log('======================================================\n');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
      message: 'Đăng ký tài khoản thành công!',
    };
  }

  /**
   * 3. Đăng nhập (Email + Password trực tiếp, TỰ ĐỘNG BẮN EMAIL BẢO MẬT)
   */
  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        stores: { where: { isDeleted: false } },
        collaboratorProfile: {
          include: { tier: true },
        },
        wallet: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Tự động kích hoạt Email cảnh báo đăng nhập mới vào Gmail của người dùng
    const loginTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const device = meta?.userAgent || 'Trình duyệt Web (Chrome / Safari / Edge)';
    const ip = meta?.ipAddress || '127.0.0.1';

    await this.mailService.sendLoginSecurityAlert(user.email, user.fullName, {
      ipAddress: ip,
      userAgent: device,
      time: loginTime,
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken,
      user: safeUser,
      securityAlertSent: true,
      message: 'Đăng nhập thành công',
    };
  }

  /**
   * 4. Đăng nhập / Đăng ký nhanh qua Google OAuth (Google Identity Services)
   */
  async googleLogin(
    dto: GoogleLoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    let payload: any;
    try {
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      throw new UnauthorizedException(
        `Xác thực Google OAuth thất bại: ${err.message}`,
      );
    }

    if (!payload || !payload.email) {
      throw new BadRequestException('Thông tin tài khoản Google không hợp lệ');
    }

    const email = payload.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        stores: { where: { isDeleted: false } },
        collaboratorProfile: {
          include: { tier: true },
        },
        wallet: true,
      },
    });

    // Nếu người dùng chưa tồn tại -> Tự động khởi tạo tài khoản mới
    if (!user) {
      const desiredRole =
        dto.role === 'SHOP_MANAGER'
          ? UserRole.SHOP_MANAGER
          : UserRole.COLLABORATOR;

      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const createdUser = await this.prisma.user.create({
        data: {
          email,
          fullName: payload.name || payload.given_name || 'KOL / CTV Google',
          passwordHash,
          role: desiredRole,
          isActive: true,
        },
      });

      // Nếu là KOL: Tạo profile & ví hoa hồng
      if (desiredRole === UserRole.COLLABORATOR) {
        const bronzeTier = await this.prisma.collaboratorTier.findFirst({
          where: { name: 'Đồng' },
        });

        await this.prisma.collaboratorProfile.create({
          data: {
            userId: createdUser.id,
            tierId: bronzeTier?.id || null,
            bankName: '',
            bankAccountNumber: '',
            bankAccountName: createdUser.fullName,
          },
        });

        await this.prisma.wallet.create({
          data: {
            collaboratorId: createdUser.id,
            availableBalance: 0,
            pendingBalance: 0,
          },
        });
      } else if (desiredRole === UserRole.SHOP_MANAGER) {
        // Nếu là Shop: Tạo store mặc định
        const storeName = dto.storeName?.trim() || `${createdUser.fullName} Store`;
        const slug =
          storeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
          '-' +
          Date.now().toString().slice(-4);

        await this.prisma.store.create({
          data: {
            ownerId: createdUser.id,
            name: storeName,
            slug,
            defaultCommissionRate: 10.0,
            attributionWindowDays: 30,
            minPayoutAmount: 200000.0,
          },
        });
      }

      // Re-fetch user with relations
      user = await this.prisma.user.findUnique({
        where: { id: createdUser.id },
        include: {
          stores: { where: { isDeleted: false } },
          collaboratorProfile: {
            include: { tier: true },
          },
          wallet: true,
        },
      });
    }

    if (!user) {
      throw new BadRequestException('Không thể khởi tạo tài khoản');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa');
    }

    // Tự động kích hoạt Email cảnh báo đăng nhập mới vào Gmail của người dùng
    const loginTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const device = meta?.userAgent || 'Google OAuth (Chrome / Safari / Edge)';
    const ip = meta?.ipAddress || '127.0.0.1';

    await this.mailService.sendLoginSecurityAlert(user.email, user.fullName, {
      ipAddress: ip,
      userAgent: device,
      time: loginTime,
    });

    const jwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(jwtPayload);

    const { passwordHash: _, ...safeUser } = user;

    return {
      accessToken,
      user: safeUser,
      securityAlertSent: true,
      message: 'Đăng nhập Google OAuth thành công!',
    };
  }

  /**
   * 4. Lấy thông tin tài khoản người dùng hiện tại (Me)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: { where: { isDeleted: false } },
        collaboratorProfile: {
          include: { tier: true },
        },
        socialChannels: true,
        wallet: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
}

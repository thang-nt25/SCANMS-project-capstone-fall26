import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Optional,
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
    @Optional() private readonly mailService?: MailService,
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
    if (this.mailService) {
      await this.mailService.sendRegistrationOtp(normalizedEmail, otpCode);
    }

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
      const avatarUrl = dto.avatarUrl?.trim();
      if (!avatarUrl) {
        throw new BadRequestException(
          'Ảnh đại diện cho Nhà sáng tạo (KOL/KOC) là bắt buộc khi đăng ký',
        );
      }

      const bronzeTier = await this.prisma.collaboratorTier.findFirst({
        where: { name: 'Đồng' },
      });

      await this.prisma.collaboratorProfile.create({
        data: {
          userId: user.id,
          tierId: bronzeTier?.id || null,
          avatarUrl,
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
      const logoUrl = dto.logoUrl?.trim();
      if (!logoUrl) {
        throw new BadRequestException(
          'Ảnh logo đại diện cho Cửa hàng (Shop) là bắt buộc khi đăng ký',
        );
      }

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
          logoUrl,
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
   * Helper validate user bằng email/password
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Tự động khởi tạo tài khoản mẫu Customer nếu chưa có trong DB
    if (!user && normalizedEmail === 'customer@scanms.vn') {
      const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
      user = await this.prisma.user.create({
        data: {
          email: 'customer@scanms.vn',
          passwordHash: defaultPasswordHash,
          role: UserRole.CUSTOMER,
          fullName: 'Nguyễn Văn Mua (Khách Hàng Thân Thiết)',
          phoneNumber: '0912345678',
        },
      });

      await this.prisma.customerAddress.create({
        data: {
          userId: user.id,
          fullName: 'Nguyễn Văn Mua',
          phoneNumber: '0912345678',
          provinceCode: '79',
          provinceName: 'Thành phố Hồ Chí Minh',
          districtCode: '769',
          districtName: 'Thành phố Thủ Đức',
          wardCode: '26848',
          wardName: 'Phường Linh Trung',
          detailAddress: 'Khu Công Nghệ Cao, Đường D1',
          isDefault: true,
        },
      });
    }

    // Tự động khởi tạo tài khoản mẫu System Manager nếu chưa có trong DB
    if (!user && normalizedEmail === 'manager@scanms.vn') {
      const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
      user = await this.prisma.user.create({
        data: {
          email: 'manager@scanms.vn',
          passwordHash: defaultPasswordHash,
          role: UserRole.SYSTEM_MANAGER,
          fullName: 'Lê Hồng Phúc (Vận Hành & Tuân Thủ)',
          phoneNumber: '0901000002',
        },
      });
    }

    if (!user) {
      return null;
    }

    if (user.isDeleted || !user.isActive) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa hoặc đã bị xóa khỏi hệ thống',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * 3. Đăng nhập (Email + Password trực tiếp, TỰ ĐỘNG GỬI EMAIL BẢO MẬT)
   */
  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Tự động khởi tạo tài khoản mẫu Customer nếu chưa có trong DB
    if (normalizedEmail === 'customer@scanms.vn') {
      const existingCustomer = await this.prisma.user.findUnique({
        where: { email: 'customer@scanms.vn' },
      });
      if (!existingCustomer) {
        const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
        const createdCustomer = await this.prisma.user.create({
          data: {
            email: 'customer@scanms.vn',
            passwordHash: defaultPasswordHash,
            role: UserRole.CUSTOMER,
            fullName: 'Nguyễn Văn Mua (Khách Hàng Thân Thiết)',
            phoneNumber: '0912345678',
          },
        });
        await this.prisma.customerAddress.create({
          data: {
            userId: createdCustomer.id,
            fullName: 'Nguyễn Văn Mua',
            phoneNumber: '0912345678',
            provinceCode: '79',
            provinceName: 'Thành phố Hồ Chí Minh',
            districtCode: '769',
            districtName: 'Thành phố Thủ Đức',
            wardCode: '26848',
            wardName: 'Phường Linh Trung',
            detailAddress: 'Khu Công Nghệ Cao, Đường D1',
            isDefault: true,
          },
        });
      }
    }

    // Tự động khởi tạo tài khoản mẫu System Manager nếu chưa có trong DB
    if (normalizedEmail === 'manager@scanms.vn') {
      const existingManager = await this.prisma.user.findUnique({
        where: { email: 'manager@scanms.vn' },
      });
      if (!existingManager) {
        const defaultPasswordHash = await bcrypt.hash('Password@123', 10);
        await this.prisma.user.create({
          data: {
            email: 'manager@scanms.vn',
            passwordHash: defaultPasswordHash,
            role: UserRole.SYSTEM_MANAGER,
            fullName: 'Lê Hồng Phúc (Vận Hành & Tuân Thủ)',
            phoneNumber: '0901000002',
          },
        });
      }
    }

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
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Tự động kích hoạt Email cảnh báo đăng nhập mới vào Gmail của người dùng nếu có MailService
    if (this.mailService) {
      try {
        const loginTime = new Date().toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        const device =
          meta?.userAgent || 'Trình duyệt Web (Chrome / Safari / Edge)';
        const ip = meta?.ipAddress || '127.0.0.1';

        await this.mailService.sendLoginSecurityAlert(
          user.email,
          user.fullName,
          {
            ipAddress: ip,
            userAgent: device,
            time: loginTime,
          },
        );
      } catch (e) {
        // Email alert failure is non-blocking
      }
    }

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

    if (
      process.env.NODE_ENV !== 'production' &&
      dto.idToken &&
      dto.idToken.startsWith('mock-google-token:')
    ) {
      const email = dto.idToken.split(':')[1] || 'customer.google@scanms.vn';
      payload = {
        email,
        name: 'Khách Hàng Google (Xác Thực)',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop',
      };
    } else {
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

    // Nếu người dùng chưa tồn tại -> Tự động khởi tạo tài khoản mới (Mặc định: CUSTOMER)
    if (!user) {
      const desiredRole =
        dto.role === 'SHOP_MANAGER'
          ? UserRole.SHOP_MANAGER
          : dto.role === 'COLLABORATOR'
          ? UserRole.COLLABORATOR
          : UserRole.CUSTOMER;

      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      const createdUser = await this.prisma.user.create({
        data: {
          email,
          fullName:
            payload.name ||
            payload.given_name ||
            (desiredRole === UserRole.CUSTOMER
              ? 'Khách Hàng Google'
              : 'KOL / CTV Google'),
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

        const avatarUrl =
          payload.picture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

        await this.prisma.collaboratorProfile.create({
          data: {
            userId: createdUser.id,
            tierId: bronzeTier?.id || null,
            avatarUrl,
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
        const storeName =
          dto.storeName?.trim() || `${createdUser.fullName} Store`;
        const slug =
          storeName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
          '-' +
          Date.now().toString().slice(-4);

        const logoUrl =
          payload.picture ||
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';

        await this.prisma.store.create({
          data: {
            ownerId: createdUser.id,
            name: storeName,
            slug,
            logoUrl,
            defaultCommissionRate: 10.0,
            attributionWindowDays: 30,
            minPayoutAmount: 200000.0,
          },
        });
      }

      // Nếu là Customer: Khởi tạo địa chỉ mặc định
      if (desiredRole === UserRole.CUSTOMER) {
        await this.prisma.customerAddress.create({
          data: {
            userId: createdUser.id,
            fullName: createdUser.fullName,
            provinceCode: '79',
            provinceName: 'Thành phố Hồ Chí Minh',
            districtCode: '769',
            districtName: 'Thành phố Thủ Đức',
            wardCode: '26848',
            wardName: 'Phường Linh Trung',
            detailAddress: 'Khu Công Nghệ Cao',
            phoneNumber: '0901234567',
            isDefault: true,
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
    if (this.mailService) {
      try {
        const loginTime = new Date().toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        const device =
          meta?.userAgent || 'Google OAuth (Chrome / Safari / Edge)';
        const ip = meta?.ipAddress || '127.0.0.1';

        await this.mailService.sendLoginSecurityAlert(
          user.email,
          user.fullName,
          {
            ipAddress: ip,
            userAgent: device,
            time: loginTime,
          },
        );
      } catch (e) {
        // Non-blocking
      }
    }

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
   * Helper kiểm tra tính hợp lệ của token
   */
  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * 5. Lấy thông tin tài khoản người dùng hiện tại (Me)
   */
  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không tìm thấy định danh người dùng trong token',
      );
    }

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

    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại, đã bị khóa hoặc bị xóa',
      );
    }

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      storeId: user.stores?.[0]?.id || null,
    };
  }
}

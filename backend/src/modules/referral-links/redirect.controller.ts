import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Headers,
  HttpException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ReferralLinksService } from './referral-links.service';
import {
  verifyMultiShopAttributionToken,
  signOpaqueVisitorToken,
  verifyOpaqueVisitorToken,
  escapeHtml,
} from './utils/short-code.generator';

@ApiTags('Public - Referral Link Redirect & Tracking Engine (FR-13)')
@Controller()
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly service: ReferralLinksService,
    private readonly configService: ConfigService,
  ) {}

  private getPublicAppUrl(): string {
    const raw =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('PUBLIC_APP_URL') ||
      'http://localhost:5173';

    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // ignore
    }
    return 'http://localhost:5173';
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('Cấu hình JWT_SECRET bị thiếu trong hệ thống!');
    }
    return secret;
  }

  /**
   * Kiểm tra tên miền đích có nằm trong danh sách cho phép (Allowlist) hay không (Chống Open Redirect - Lỗi 7)
   */
  private isAllowedDestination(destination: string, publicAppUrl: string): boolean {
    if (!destination || typeof destination !== 'string') return false;

    // Đường dẫn tương đối nội bộ an toàn (chặn bypass //evil.com hoặc /\evil.com)
    if (
      destination.startsWith('/') &&
      !destination.startsWith('//') &&
      !destination.startsWith('/\\')
    ) {
      return true;
    }

    try {
      const parsed = new URL(destination);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      let appHostname = '';
      try {
        appHostname = new URL(publicAppUrl).hostname.toLowerCase();
      } catch {
        appHostname = 'localhost';
      }

      const destHostname = parsed.hostname.toLowerCase();
      const allowedHostnames = [
        'localhost',
        '127.0.0.1',
        '::1',
        appHostname,
        'scanms.vn',
      ];

      return allowedHostnames.some(
        (allowed) =>
          destHostname === allowed || destHostname.endsWith(`.${allowed}`),
      );
    } catch {
      return false;
    }
  }

  /**
   * API cập nhật quyền riêng tư / consent tracking (Lỗi 6)
   */
  @Post(['r/consent', 'api/tracking/consent', 'api/r/consent'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật lựa chọn theo dõi (Privacy Consent & Opt-out)',
    description:
      'Ghi nhận khách hàng từ chối (opt-out) hoặc đồng ý (opt-in) việc theo dõi qua cookie và fingerprint.',
  })
  async updateConsent(
    @Body() body: { allowTracking: boolean },
    @Res() res: Response,
  ) {
    const allowTracking = Boolean(body?.allowTracking);
    if (!allowTracking) {
      // Đặt cookie opt-out trong 365 ngày
      res.cookie('scanms_opt_out', 'true', {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      // Xóa các cookie tracking hiện hành
      res.clearCookie('scanms_attr', { path: '/' });
      res.clearCookie('scanms_attribution', { path: '/' });
      res.clearCookie('scanms_vid', { path: '/' });
    } else {
      res.clearCookie('scanms_opt_out', { path: '/' });
    }

    return res.json({
      success: true,
      allowTracking,
      message: allowTracking
        ? 'Đã ghi nhận đồng ý theo dõi tiếp thị'
        : 'Đã ghi nhận từ chối theo dõi tiếp thị (Opt-out)',
    });
  }

  @Get(['r/:shortCode', 'api/r/:shortCode'])
  @ApiOperation({
    summary:
      'Chuyển hướng liên kết rút gọn, đặt cookie HttpOnly scanms_attr & redirect 302 (FR-13)',
    description:
      'Ghi nhận lượt click, kiểm tra rate-limit, nhận diện bot, thiết lập hoặc cập nhật cookie Last-Click cho từng Shop và chuyển hướng an toàn.',
  })
  @ApiParam({ name: 'shortCode', description: 'Mã rút gọn 8 ký tự của liên kết tiếp thị' })
  @ApiResponse({
    status: 302,
    description:
      'Chuyển hướng thành công (Found) tới trang sản phẩm/đích. Link hợp lệ được cấp cookie HttpOnly scanms_attr; Link PAUSED, EXPIRED, vượt Rate Limit (tối đa 60 clicks/phút/IP), Bot hoặc Opt-out vẫn chuyển hướng an toàn 302 nhưng không cấp cookie attribution (theo đặc tả FR-13).',
    headers: {
      Location: {
        description: 'URL trang đích hợp lệ thuộc allowlist',
        schema: { type: 'string', example: 'http://localhost:5173/products/prod-123' },
      },
      'Set-Cookie': {
        description:
          'Cookie Opaque Token scanms_attr (SameSite=Lax, HttpOnly, Max-Age theo cửa sổ attribution của Shop) và scanms_vid (chỉ cấp khi lượt truy cập đủ điều kiện attribution)',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Yêu cầu không hợp lệ hoặc phát hiện nguy cơ Open Redirect (URL đích không nằm trong allowlist)',
  })
  @ApiResponse({
    status: 404,
    description: 'Mã tiếp thị (shortCode) không tồn tại trong hệ thống',
  })
  @ApiResponse({
    status: 410,
    description:
      'Mã tiếp thị đã bị khóa do vi phạm (BLOCKED) hoặc đã bị xóa khỏi hệ thống (DELETED)',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ nội bộ trong quá trình xử lý chuyển hướng hoặc phân bổ',
  })
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    try {
      // 1. Thu thập thông tin client & Visitor Session an toàn (FR-13 Mục 10)
      const rawIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const jwtSecret = this.getJwtSecret();
      const existingCookie =
        req.cookies?.['scanms_attr'] || req.cookies?.['scanms_attribution'];

      let visitorId: string | null = null;
      if (existingCookie) {
        visitorId = verifyOpaqueVisitorToken(existingCookie, jwtSecret);
        if (!visitorId) {
          const legacyDecoded = verifyMultiShopAttributionToken(existingCookie, jwtSecret);
          if (legacyDecoded?.vid) {
            visitorId = legacyDecoded.vid;
          }
        }
      }

      const finalVisitorId: string =
        visitorId || req.cookies?.['scanms_vid'] || crypto.randomUUID();

      // Nhận diện nguồn truy cập từ quét QR (tham số via=qr theo FR-11 & FR-13)
      const via =
        typeof req.query?.via === 'string' ? req.query.via.toLowerCase() : null;
      const isQr = via === 'qr';

      // Kiểm tra tín hiệu từ chối theo dõi (Privacy Consent: DNT, Sec-GPC, scanms_opt_out - Lỗi 6)
      const dntHeader = (req.headers['dnt'] || req.headers['sec-gpc'] || '') as string;
      const isOptedOut =
        dntHeader === '1' || req.cookies?.['scanms_opt_out'] === 'true';

      const clientInfo = {
        ip: rawIp,
        userAgent: userAgent || 'Unknown',
        referer: referer || undefined,
        deviceType: this.detectDeviceType(userAgent),
        sessionId: finalVisitorId,
        accessMethod: isQr ? ('QR' as const) : ('LINK' as const),
        isOptedOut,
      };

      // 2. Xử lý nghiệp vụ chuyển hướng và động cơ attribution qua Service
      const result = await this.service.handleRedirect(shortCode, clientInfo);

      // 3. Cập nhật Attribution Cookie nếu click hợp lệ, session đã tạo thành công trong DB và người dùng không opt-out (Lỗi 1, 6 & 8)
      // Cookie chỉ chứa visitorId ngẫu nhiên được ký HMAC-SHA256, không chứa PII hay dữ liệu shop/KOL
      // Dữ liệu attribution được quản lý độc lập từng gian hàng trong bảng AttributionSession
      if (result.allowAttribution && !isOptedOut && result.attributionData?.sessionId) {
        const opaqueToken = signOpaqueVisitorToken(finalVisitorId, jwtSecret);

        // Max-Age cho cookie trình duyệt: Theo attribution window của Shop (mặc định 30 ngày)
        const windowDays = result.attributionWindowDays || 30;
        const cookieMaxAgeMs = windowDays * 24 * 60 * 60 * 1000;

        // Cookie chính: scanms_attr (FR-13)
        res.cookie('scanms_attr', opaqueToken, {
          maxAge: cookieMaxAgeMs,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });

        // Giữ scanms_attribution để đảm bảo tương thích ngược
        res.cookie('scanms_attribution', opaqueToken, {
          maxAge: cookieMaxAgeMs,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });

        // Đồng bộ cookie visitor ID với finalVisitorId (Lỗi 8)
        res.cookie('scanms_vid', finalVisitorId, {
          maxAge: cookieMaxAgeMs,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }

      // 5. Thiết lập security & SEO headers
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      const publicAppUrl = this.getPublicAppUrl();
      let destinationUrl: string;

      // 6. Kiểm tra URL đích chống tấn công Open Redirect (Lỗi 7)
      if (
        result.destinationPath.startsWith('http://') ||
        result.destinationPath.startsWith('https://')
      ) {
        if (!this.isAllowedDestination(result.destinationPath, publicAppUrl)) {
          this.logger.warn(
            `[OPEN REDIRECT BLOCKED] Tên miền chuyển hướng không hợp lệ: ${result.destinationPath}`,
          );
          throw new BadRequestException(
            'Tên miền chuyển hướng không nằm trong danh sách cho phép (Open Redirect Protection)',
          );
        }
        destinationUrl = result.destinationPath;
      } else {
        if (!this.isAllowedDestination(result.destinationPath, publicAppUrl)) {
          throw new BadRequestException('Đường dẫn chuyển hướng không hợp lệ');
        }
        const cleanPath = result.destinationPath.startsWith('/')
          ? result.destinationPath
          : `/${result.destinationPath}`;
        destinationUrl = `${publicAppUrl}${cleanPath}`;
      }

      // 7. Chuyển hướng trực tiếp HTTP 302 Found đến sản phẩm đích
      return res.redirect(HttpStatus.FOUND, destinationUrl);
    } catch (err: any) {
      const status =
        err instanceof HttpException
          ? err.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const rawMessage = err.message || 'Lỗi khi xử lý chuyển hướng liên kết';

      // HTML Escape toàn bộ nội dung hiển thị ra HTML để chống tấn công XSS
      const safeMessage = escapeHtml(rawMessage);
      const safeStatus = escapeHtml(status);
      const safePublicUrl = escapeHtml(this.getPublicAppUrl());
      const isGone = status === HttpStatus.GONE;

      return res.status(status).send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isGone ? 'Liên kết đã bị khóa' : 'Không tìm thấy liên kết'} - SCANMS</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; color: #1A1612; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: white; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); border: 1px solid #EAE4D7; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
            .badge-blocked { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
            .badge-notfound { background: #F3EFE6; color: #7D715E; border: 1px solid #EAE4D7; }
            h2 { font-size: 18px; margin: 0 0 8px 0; color: #1A1612; font-weight: 800; }
            p { font-size: 13px; color: #7D715E; line-height: 1.5; margin: 0 0 24px 0; }
            a { display: inline-block; background: #C59B58; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; transition: background 0.2s; }
            a:hover { background: #B88E4F; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge ${isGone ? 'badge-blocked' : 'badge-notfound'}">
              Mã trạng thái: ${safeStatus}
            </div>
            <h2>${isGone ? 'Liên Kết Đã Bị Khóa' : 'Liên Kết Không Tồn Tại'}</h2>
            <p>${safeMessage}</p>
            <a href="${safePublicUrl}/marketplace">Khám phá các sản phẩm khác trên SCANMS</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  private detectDeviceType(ua?: string): string {
    if (!ua) return 'Desktop';
    const lower = ua.toLowerCase();
    if (/mobile|android|iphone|ipad|phone/i.test(lower)) {
      return 'Mobile';
    }
    if (/tablet|ipad/i.test(lower)) {
      return 'Tablet';
    }
    return 'Desktop';
  }
}

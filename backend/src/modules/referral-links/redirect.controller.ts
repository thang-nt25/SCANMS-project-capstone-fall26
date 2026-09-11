import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  HttpStatus,
  Headers,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ReferralLinksService } from './referral-links.service';
import { signAttributionToken, escapeHtml } from './utils/short-code.generator';

@ApiTags('Public - Referral Link Redirect (FR-10)')
@Controller()
export class RedirectController {
  constructor(
    private readonly service: ReferralLinksService,
    private readonly configService: ConfigService,
  ) {}

  private getPublicAppUrl(): string {
    const raw =
      this.configService.get<string>('PUBLIC_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
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

  @Get(['r/:shortCode', 'api/r/:shortCode'])
  @ApiOperation({
    summary: 'Chuyển hướng liên kết rút gọn, đặt cookie HttpOnly an toàn & redirect 302',
  })
  @ApiParam({ name: 'shortCode', description: 'Mã rút gọn 8 ký tự' })
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    try {
      // 1. Thu thập thông tin client an toàn & Session Tracking (scanms_vid)
      const rawIp =
        req.ip ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      let visitorId = req.cookies?.['scanms_vid'];
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        res.cookie('scanms_vid', visitorId, {
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 năm
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }

      const clientInfo = {
        ip: rawIp,
        userAgent: userAgent || 'Unknown',
        referer: referer || undefined,
        deviceType: this.detectDeviceType(userAgent),
        sessionId: visitorId,
      };

      // 2. Xử lý nghiệp vụ chuyển hướng qua service (kiểm tra DELETED 404, BLOCKED 410, PAUSED/EXPIRED)
      const result = await this.service.handleRedirect(shortCode, clientInfo);

      // 3. Đặt cookie attribution 30 ngày (Last Click) - BẮT BUỘC HttpOnly: true duy nhất từ Backend
      if (result.allowAttribution && result.attributionData) {
        const signedToken = signAttributionToken(
          result.attributionData,
          this.getJwtSecret(),
        );
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        res.cookie('scanms_attribution', signedToken, {
          maxAge: thirtyDaysMs,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
      }

      // 4. Thiết lập security & SEO headers
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      const publicAppUrl = this.getPublicAppUrl();
      const destinationUrl = result.destinationPath.startsWith('http')
        ? result.destinationPath
        : `${publicAppUrl}${result.destinationPath}`;

      // 5. Chuyển hướng trực tiếp HTTP 302 Found đến sản phẩm đích
      return res.redirect(HttpStatus.FOUND, destinationUrl);
    } catch (err: any) {
      const status =
        err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: white; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
            .badge-blocked { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
            .badge-notfound { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            h2 { font-size: 18px; margin: 0 0 8px 0; color: #0f172a; }
            p { font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0; }
            a { display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; }
            a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge ${isGone ? 'badge-blocked' : 'badge-notfound'}">
              Mã trạng thái: ${safeStatus}
            </div>
            <h2>${isGone ? 'Liên Kết Đã Bị Khóa' : 'Liên Kết Không Tồn Tại'}</h2>
            <p>${safeMessage}</p>
            <a href="${safePublicUrl}/marketplace">Khám phá các sản phẩm khác</a>
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

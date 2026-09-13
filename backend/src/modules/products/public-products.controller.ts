import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ProductsService } from './products.service';
import { ProductLandingResponseDto } from './dto/landing-page-response.dto';
import { TrackAnalyticsEventDto } from './dto/track-event.dto';
import { ConfigService } from '@nestjs/config';
import { extractTrustedClientIp } from '../referral-links/utils/client-ip.util';
import { escapeHtml } from '../referral-links/utils/short-code.generator';

@ApiTags('Public Product Landing Page (FR-15)')
@Controller('public/products')
export class PublicProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Marketplace công khai chỉ trả dữ liệu sản phẩm an toàn' })
  async getMarketplace(
    @Query('search') search = '',
    @Query('page') page = '1',
    @Query('limit') limit = '24',
  ) {
    return this.productsService.findPublicMarketplace(search, Number(page), Number(limit));
  }

  @Get(':idOrSlug/landing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy dữ liệu Landing Page mua hàng công khai & Video Review (FR-15)',
    description:
      'Cung cấp dữ liệu công khai an toàn cho khách vãng lai: Thông tin sản phẩm, tồn kho, chính sách Shop, video review KOL đã APPROVED (ưu tiên đúng KOL referral), thống kê sao và đánh giá đã duyệt có huy hiệu Đã mua hàng. Không lộ PII, commission hay thông tin nội bộ.',
  })
  @ApiParam({
    name: 'idOrSlug',
    description: 'UUID hoặc SKU của sản phẩm (VD: TECH-001 hoặc UUID)',
    example: 'TECH-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về dữ liệu Landing Page an toàn của sản phẩm & video review',
    type: ProductLandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không hợp lệ (mã sản phẩm rỗng hoặc sai định dạng)',
  })
  @ApiResponse({
    status: 404,
    description: 'Sản phẩm không tồn tại, đã bị xóa mềm hoặc gian hàng tạm đóng/bị khóa',
  })
  @ApiResponse({
    status: 410,
    description: 'Sản phẩm đã ngừng kinh doanh vĩnh viễn',
  })
  @ApiResponse({
    status: 429,
    description: 'Quá nhiều yêu cầu truy cập từ cùng địa chỉ IP (Rate Limit)',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi máy chủ nội bộ khi tổng hợp dữ liệu landing page',
  })
  async getLandingPage(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req?: Request,
  ): Promise<ProductLandingResponseDto> {
    const attrCookie =
      req?.cookies?.['scanms_attr'] || req?.cookies?.['scanms_attribution'];
    return this.productsService.getLandingPageData(idOrSlug, attrCookie);
  }

  @Post('analytics/events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tiếp nhận sự kiện tương tác người dùng trên Landing Page (FR-15 Analytics)',
    description:
      'Ghi nhận các sự kiện page_view, video_start, video_complete, cta_click, checkout_start phục vụ thống kê chuyển đổi tiếp thị.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ghi nhận sự kiện thành công',
  })
  @ApiResponse({ status: 429, description: 'Vượt giới hạn sự kiện theo IP' })
  async trackAnalytics(
    @Body() dto: TrackAnalyticsEventDto,
    @Req() req?: Request,
  ) {
    const trustProxy =
      this.configService.get<string>('TRUST_PROXY') === 'true' ||
      process.env.TRUST_PROXY === 'true';
    const trustedProxies =
      this.configService.get<string>('TRUSTED_PROXIES') ||
      process.env.TRUSTED_PROXIES;
    const rawIp = req
      ? extractTrustedClientIp(req, trustProxy, trustedProxies)
      : '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || '';

    return this.productsService.recordAnalyticsEvent(dto, {
      ip: rawIp,
      userAgent,
    });
  }

  @Get([':idOrSlug/seo', 'preview/:idOrSlug', 'p/:idOrSlug'])
  @ApiOperation({
    summary: 'Server-Side Render Open Graph Meta Tags cho mạng xã hội (Facebook, Zalo, Twitter) (FR-15 SEO)',
  })
  async getSeoPreview(
    @Param('idOrSlug') idOrSlug: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const landingData = await this.productsService.getLandingPageData(idOrSlug);
      const frontendBaseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        process.env.FRONTEND_URL ||
        'http://localhost:5173';
      const targetSlug = landingData.product.sku || landingData.product.id;
      const targetUrl = `${frontendBaseUrl}/products/${encodeURIComponent(targetSlug)}`;
      const title = `${escapeHtml(landingData.product.title)} | SCANMS Sàn Đối Tác`;
      const description = escapeHtml(
        landingData.product.description?.slice(0, 160) ||
          'Khám phá sản phẩm chính hãng với mức chiết khấu và ưu đãi tốt nhất trên SCANMS.',
      );
      const imageUrl =
        landingData.product.imageUrl ||
        landingData.images?.[0] ||
        `${frontendBaseUrl}/banner-placeholder.jpg`;
      const price = landingData.product.price;
      const storeName = escapeHtml(landingData.store?.name || 'SCANMS Official');

      const html = `<!DOCTYPE html>
<html lang="vi" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook / Zalo -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${targetUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:site_name" content="SCANMS - Sàn Thương Mại Đối Tác">
  <meta property="og:price:amount" content="${price}">
  <meta property="og:price:currency" content="VND">
  <meta property="product:brand" content="${storeName}">
  <meta property="product:availability" content="${landingData.product.canPurchase ? 'in stock' : 'out of stock'}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Fallback Client Redirection -->
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body style="font-family: system-ui, sans-serif; background: #FAF8F5; color: #1A1612; padding: 2rem; text-align: center;">
  <p>Đang chuyển hướng tới sản phẩm trên <strong>SCANMS</strong>...</p>
  <p><a href="${targetUrl}" style="color: #B88E4F; font-weight: 600;">Nhấn vào đây nếu không tự động chuyển hướng</a></p>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(html);
    } catch (err: any) {
      const frontendBaseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        process.env.FRONTEND_URL ||
        'http://localhost:5173';
      return res.redirect(`${frontendBaseUrl}/marketplace`);
    }
  }
}


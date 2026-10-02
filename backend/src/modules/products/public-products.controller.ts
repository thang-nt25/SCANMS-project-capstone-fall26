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
  @ApiOperation({ summary: 'Marketplace cÃ´ng khai chá»‰ tráº£ dá»¯ liá»‡u sáº£n pháº©m an toÃ n vá»›i bá»™ lá»c thá»±c táº¿' })
  async getMarketplace(
    @Query('search') search = '',
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '24',
  ) {
    return this.productsService.findPublicMarketplace({
      search,
      category,
      storeId,
      minPrice: minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined,
      sortBy,
      page: Number(page) || 1,
      limit: Number(limit) || 24,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Láº¥y danh sÃ¡ch cÃ¡c danh má»¥c ngÃ nh hÃ ng cÃ³ sáº£n pháº©m thá»±c táº¿' })
  async getCategories() {
    return this.productsService.getPublicCategories();
  }

  @Get('stores')
  @ApiOperation({ summary: 'Láº¥y danh sÃ¡ch cÃ¡c gian hÃ ng Ä‘á»‘i tÃ¡c Ä‘ang hoáº¡t Ä‘á»™ng trÃªn sÃ n' })
  async getStores() {
    return this.productsService.getPublicStores();
  }

  @Get(':idOrSlug/landing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Láº¥y dá»¯ liá»‡u Landing Page mua hÃ ng cÃ´ng khai & Video Review (FR-15)',
    description:
      'Cung cáº¥p dá»¯ liá»‡u cÃ´ng khai an toÃ n cho khÃ¡ch vÃ£ng lai: ThÃ´ng tin sáº£n pháº©m, tá»“n kho, chÃ­nh sÃ¡ch Shop, video review KOL Ä‘Ã£ APPROVED (Æ°u tiÃªn Ä‘Ãºng KOL referral), thá»‘ng kÃª sao vÃ  Ä‘Ã¡nh giÃ¡ Ä‘Ã£ duyá»‡t cÃ³ huy hiá»‡u ÄÃ£ mua hÃ ng. KhÃ´ng lá»™ PII, commission hay thÃ´ng tin ná»™i bá»™.',
  })
  @ApiParam({
    name: 'idOrSlug',
    description: 'UUID hoáº·c SKU cá»§a sáº£n pháº©m (VD: TECH-001 hoáº·c UUID)',
    example: 'TECH-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Tráº£ vá» dá»¯ liá»‡u Landing Page an toÃ n cá»§a sáº£n pháº©m & video review',
    type: ProductLandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'YÃªu cáº§u khÃ´ng há»£p lá»‡ (mÃ£ sáº£n pháº©m rá»—ng hoáº·c sai Ä‘á»‹nh dáº¡ng)',
  })
  @ApiResponse({
    status: 404,
    description: 'Sáº£n pháº©m khÃ´ng tá»“n táº¡i, Ä‘Ã£ bá»‹ xÃ³a má»m hoáº·c gian hÃ ng táº¡m Ä‘Ã³ng/bá»‹ khÃ³a',
  })
  @ApiResponse({
    status: 410,
    description: 'Sáº£n pháº©m Ä‘Ã£ ngá»«ng kinh doanh vÄ©nh viá»…n',
  })
  @ApiResponse({
    status: 429,
    description: 'QuÃ¡ nhiá»u yÃªu cáº§u truy cáº­p tá»« cÃ¹ng Ä‘á»‹a chá»‰ IP (Rate Limit)',
  })
  @ApiResponse({
    status: 500,
    description: 'Lá»—i mÃ¡y chá»§ ná»™i bá»™ khi tá»•ng há»£p dá»¯ liá»‡u landing page',
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
    summary: 'Tiáº¿p nháº­n sá»± kiá»‡n tÆ°Æ¡ng tÃ¡c ngÆ°á»i dÃ¹ng trÃªn Landing Page (FR-15 Analytics)',
    description:
      'Ghi nháº­n cÃ¡c sá»± kiá»‡n page_view, video_start, video_complete, cta_click, checkout_start phá»¥c vá»¥ thá»‘ng kÃª chuyá»ƒn Ä‘á»•i tiáº¿p thá»‹.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ghi nháº­n sá»± kiá»‡n thÃ nh cÃ´ng',
  })
  @ApiResponse({ status: 429, description: 'VÆ°á»£t giá»›i háº¡n sá»± kiá»‡n theo IP' })
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
    summary: 'Server-Side Render Open Graph Meta Tags cho máº¡ng xÃ£ há»™i (Facebook, Zalo, Twitter) (FR-15 SEO)',
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
      const title = `${escapeHtml(landingData.product.title)} | SCANMS SÃ n Äá»‘i TÃ¡c`;
      const description = escapeHtml(
        landingData.product.description?.slice(0, 160) ||
          'KhÃ¡m phÃ¡ sáº£n pháº©m chÃ­nh hÃ£ng vá»›i má»©c chiáº¿t kháº¥u vÃ  Æ°u Ä‘Ã£i tá»‘t nháº¥t trÃªn SCANMS.',
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
  <meta property="og:site_name" content="SCANMS - SÃ n ThÆ°Æ¡ng Máº¡i Äá»‘i TÃ¡c">
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
  <p>Äang chuyá»ƒn hÆ°á»›ng tá»›i sáº£n pháº©m trÃªn <strong>SCANMS</strong>...</p>
  <p><a href="${targetUrl}" style="color: #B88E4F; font-weight: 600;">Nháº¥n vÃ o Ä‘Ã¢y náº¿u khÃ´ng tá»± Ä‘á»™ng chuyá»ƒn hÆ°á»›ng</a></p>
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
  @Get(':idOrSlug/stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lay so ton kho tuc thoi cua san pham (Realtime Inventory)',
    description: 'Tra ve stockQuantity, inStock, lowStock (canh bao khi <= 5), status. Dung de polling cap nhat UI.',
  })
  @ApiParam({ name: 'idOrSlug', description: 'UUID hoac SKU cua san pham', example: 'SR-VTC-15' })
  @ApiResponse({ status: 200, description: 'Tra ve thong tin ton kho tuc thoi' })
  @ApiResponse({ status: 404, description: 'San pham khong ton tai' })
  async getRealtimeStock(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.getRealtimeStock(idOrSlug);
  }
}
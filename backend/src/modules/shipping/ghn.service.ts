import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { isGeneratedGhnTestTrackingCode } from './ghn-tracking-code';
import { createCustomerGhnSimulation, customerGhnSimulationDetail } from './customer-ghn-simulation';
import { syncCustomerGhnSimulations } from './sync-customer-ghn-simulation';
import { isValidShippingFee, requireShippingFee } from './shipping-fee';
import { OrderStatus, SampleRequestStatus, Prisma } from '@prisma/client';
import {
  CreateGhnOrderDto,
  CalculateShippingFeeDto,
  GhnRequiredNote,
  GhnEnvironment,
} from './dto/shipping.dto';
import { notifyCustomerOrderEvent } from '../orders/customer-order-notifications';
import { Cron } from '@nestjs/schedule';
import { timingSafeEqual } from 'crypto';
import { GHN_STATUS_LABELS, ghnText, ghnTime, normalizeGhnEvents, GhnEvent } from './ghn-tracking';

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
}

export interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

const SAMPLE_AWAITING_RECEIPT: SampleRequestStatus[] = [SampleRequestStatus.SHIPPED, SampleRequestStatus.DELIVERY_ISSUE];

function parseGhnDeliveryTime(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return NaN;
  const normalized = value.trim().replace(' ', 'T');
  // GHN timestamps without an explicit offset represent local Vietnam time.
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}+07:00`;
  return Date.parse(timestamp);
}

@Injectable()
export class GhnService {
  private readonly logger = new Logger(GhnService.name);
  private sampleReconciliationCursor: string | null = null;

  // Cached Master Data
  private cachedProvinces = new Map<GhnEnvironment, GhnProvince[]>();
  private cachedDistricts = new Map<GhnEnvironment, Map<number, GhnDistrict[]>>();
  private cachedWards = new Map<GhnEnvironment, Map<number, GhnWard[]>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lấy cấu hình GHN từ .env
   */
  private getConfig(environment: GhnEnvironment = GhnEnvironment.LIVE) {
    const read = (key: string) =>
      this.configService.get<string>(key) || process.env[key] || '';

    if (environment === GhnEnvironment.TEST) {
      return {
        apiUrl: read('GHN_TEST_API_URL') || 'https://dev-online-gateway.ghn.vn/shiip/public-api',
        apiToken: read('GHN_TEST_API_TOKEN'),
        shopId: read('GHN_TEST_SHOP_ID'),
      };
    }

    return {
      apiUrl: read('GHN_API_URL') || 'https://online-gateway.ghn.vn/shiip/public-api',
      apiToken: read('GHN_API_TOKEN'),
      shopId: read('GHN_SHOP_ID'),
    };
  }

  /**
   * Helper gửi HTTP request có kèm Token và ShopId đến GHN
   */
  private async ghnFetch<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      body?: any;
      includeShopId?: boolean;
      environment?: GhnEnvironment;
    } = {},
  ): Promise<T> {
    const environment = options.environment || GhnEnvironment.LIVE;
    const { apiUrl, apiToken, shopId } = this.getConfig(environment);
    if (!apiToken || (options.includeShopId !== false && !shopId)) {
      throw new BadRequestException(
        environment === GhnEnvironment.TEST
          ? 'Chưa cấu hình GHN_TEST_API_TOKEN hoặc GHN_TEST_SHOP_ID cho môi trường thử nghiệm.'
          : 'Chưa cấu hình GHN_API_TOKEN hoặc GHN_SHOP_ID cho môi trường thật.',
      );
    }
    const url = `${apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: apiToken,
    };

    if (options.includeShopId !== false && shopId) {
      headers['ShopId'] = shopId;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(endpoint.startsWith('/master-data/') ? 8000 : 15000),
    };

    if (options.body && method === 'POST') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, fetchOptions);
      const data = await res.json();
      return data as T;
    } catch (error: any) {
      this.logger.error(
        `Lỗi gọi API GHN [${method} ${endpoint}]: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * Lấy danh mục Tỉnh/Thành phố từ GHN
   */
  async getProvinces(environment: GhnEnvironment = GhnEnvironment.LIVE): Promise<GhnProvince[]> {
    const cached = this.cachedProvinces.get(environment);
    if (cached?.length) return cached;

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnProvince[] }>(
        '/master-data/province',
        { includeShopId: false, environment },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        this.cachedProvinces.set(environment, res.data);
        return res.data;
      }
    } catch (e: any) {
      this.logger.warn(`Không lấy được danh sách Tỉnh từ GHN: ${e?.message}`);
    }
    return [];
  }

  /**
   * Lấy danh mục Quận/Huyện theo Tỉnh từ GHN
   */
  async getDistricts(provinceId: number, environment: GhnEnvironment = GhnEnvironment.LIVE): Promise<GhnDistrict[]> {
    let cache = this.cachedDistricts.get(environment);
    if (!cache) {
      cache = new Map<number, GhnDistrict[]>();
      this.cachedDistricts.set(environment, cache);
    }
    if (cache.has(provinceId)) return cache.get(provinceId)!;

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnDistrict[] }>(
        '/master-data/district',
        {
          method: 'POST',
          body: { province_id: provinceId },
          includeShopId: false,
          environment,
        },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        cache.set(provinceId, res.data);
        return res.data;
      }
    } catch (e: any) {
      this.logger.warn(`Không lấy được danh sách Quận từ GHN: ${e?.message}`);
    }
    return [];
  }

  /**
   * Lấy danh mục Phường/Xã theo Quận/Huyện từ GHN
   */
  async getWards(districtId: number, environment: GhnEnvironment = GhnEnvironment.LIVE): Promise<GhnWard[]> {
    let cache = this.cachedWards.get(environment);
    if (!cache) {
      cache = new Map<number, GhnWard[]>();
      this.cachedWards.set(environment, cache);
    }
    if (cache.has(districtId)) return cache.get(districtId)!;

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnWard[] }>(
        `/master-data/ward?district_id=${districtId}`,
        { includeShopId: false, environment },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        cache.set(districtId, res.data);
        return res.data;
      }
    } catch (e: any) {
      this.logger.warn(`Không lấy được danh sách Phường từ GHN: ${e?.message}`);
    }
    return [];
  }

  /**
   * Phân tích địa chỉ nhận hàng để tìm district_id và ward_code của GHN
   */
  private async resolveGhnLocation(
    address: string,
    environment: GhnEnvironment = GhnEnvironment.LIVE,
  ): Promise<{
    districtId: number;
    wardCode: string;
  }> {
    const parts = (address || '').split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 4) {
      throw new BadRequestException('Địa chỉ GHN cần đủ số nhà/đường, phường/xã, quận/huyện và tỉnh/thành, ngăn cách bằng dấu phẩy.');
    }
    const canonical = (value: string) => (value || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
      .replace(/^(tinh|thanh pho|tp\.?|quan|q\.|huyen|thi xa|phuong|xa|thi tran|p\.)\s*/i, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
    const matchOne = <T>(items: T[], name: (item: T) => string, part: string, extensions?: (item: T) => string[]): T | undefined => {
      const cPart = canonical(part);
      const matches = items.filter((item) => {
        if (canonical(name(item)) === cPart) return true;
        if (extensions) {
          const exts = extensions(item);
          if (Array.isArray(exts) && exts.some(ext => canonical(ext) === cPart)) return true;
        }
        return false;
      });
      return matches.length === 1 ? matches[0] : matches.find(item => canonical(name(item)) === cPart) || matches[0];
    };
    const province = matchOne(await this.getProvinces(environment), (item) => item.ProvinceName, parts[parts.length - 1], (item: any) => item.NameExtension);
    if (!province) throw new BadRequestException('Tỉnh/thành trong địa chỉ chưa khớp danh mục GHN.');
    const district = matchOne(await this.getDistricts(province.ProvinceID, environment), (item) => item.DistrictName, parts[parts.length - 2], (item: any) => item.NameExtension);
    if (!district) throw new BadRequestException('Quận/huyện trong địa chỉ chưa khớp danh mục GHN.');
    const ward = matchOne(await this.getWards(district.DistrictID, environment), (item) => item.WardName, parts[parts.length - 3], (item: any) => item.NameExtension);
    if (!ward) throw new BadRequestException('Phường/xã trong địa chỉ chưa khớp danh mục GHN.');
    return { districtId: district.DistrictID, wardCode: ward.WardCode };
  }

  /**
   * Tính phí giao hàng trực tiếp qua GHN API
   */
  async calculateShippingFee(dto: CalculateShippingFeeDto) {
    try {
      const res = await this.ghnFetch<{
        code: number;
        message: string;
        data?: {
          total: number;
          service_fee: number;
          insurance_fee: number;
        };
      }>('/v2/shipping-order/fee', {
        method: 'POST',
        body: {
          service_type_id: 2, // Chuẩn thương mại điện tử
          ...(dto.fromDistrictId ? { from_district_id: dto.fromDistrictId } : {}),
          ...(dto.fromWardCode ? { from_ward_code: dto.fromWardCode } : {}),
          to_district_id: dto.toDistrictId,
          to_ward_code: dto.toWardCode,
          weight: dto.weight || 500,
          length: 15,
          width: 10,
          height: 5,
          insurance_value: dto.insuranceValue || 0,
        },
      });

      if (res?.code === 200 && res.data) {
        return {
          totalFee: requireShippingFee(res.data.total),
          serviceFee: res.data.service_fee,
          insuranceFee: res.data.insurance_fee,
          isRealGhn: true,
        };
      }
    } catch (e: any) {
      this.logger.warn(
        `Không nhận được cước GHN hợp lệ: ${e?.message}`,
      );
    }

    throw new BadRequestException('GHN chưa trả được cước vận chuyển. Vui lòng thử lại sau.');
  }

  async quoteAddress(address: string, weight = 500, insuranceValue = 0, storeId?: string) {
    if (!storeId) throw new BadRequestException('Cần chọn gian hàng để tính cước từ đúng kho xuất.');
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { onboardingData: true, returnWarehouse: true, isActive: true, isDeleted: true } });
    if (!store?.isActive || store.isDeleted) throw new BadRequestException('Gian hàng không khả dụng.');
    const onboardingData = store.onboardingData as Record<string, any> | null;
    const returnWarehouse = store.returnWarehouse as Record<string, any> | null;
    // Match Shop Settings, which treats the return warehouse as the pickup address when no separate pickup address is saved.
    const warehouseAddress = onboardingData?.warehouseAddress || returnWarehouse?.address;
    if (!warehouseAddress) throw new BadRequestException('Gian hàng chưa cấu hình địa chỉ kho GHN.');
    const from = await this.resolveGhnLocation(warehouseAddress);
    const { districtId, wardCode } = await this.resolveGhnLocation(address);
    const fee = await this.calculateShippingFee({
      fromDistrictId: from.districtId,
      fromWardCode: from.wardCode,
      toDistrictId: districtId,
      toWardCode: wardCode,
      weight,
      insuranceValue,
    });
    return { ...fee, districtId, wardCode };
  }

  /**
   * Tạo đơn giao hàng chính thức trên hệ thống GHN Express
   */
  async createShippingOrder(
    orderId: string,
    customOptions?: CreateGhnOrderDto,
    storeIdContext?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: { include: { owner: { select: { phoneNumber: true } } } },
        customer: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }
    const ghnEnvironment = customOptions?.environment || GhnEnvironment.LIVE;
    const existingRawPayload = (order.rawPayload as Record<string, any>) || {};
    const canReplaceInternalTestWaybill =
      order.status === OrderStatus.SHIPPING &&
      !existingRawPayload.ghnOrderCode &&
      existingRawPayload.ghnIsReal !== true &&
      isGeneratedGhnTestTrackingCode(existingRawPayload.trackingNumber);
    if (
      (order.status !== OrderStatus.PENDING && !canReplaceInternalTestWaybill) ||
      (existingRawPayload.ghnOrderCode && !canReplaceInternalTestWaybill)
    ) {
      throw new ConflictException('Chỉ có thể tạo một vận đơn cho đơn đang chờ gửi.');
    }

    if (storeIdContext && order.storeId !== storeIdContext) {
      throw new BadRequestException(
        'Bạn không có quyền tạo vận đơn cho đơn hàng của gian hàng khác.',
      );
    }

    if (!order.customerPhone || !order.shippingAddress || order.orderItems.length === 0) {
      throw new BadRequestException('Đơn hàng thiếu số điện thoại, địa chỉ nhận hoặc sản phẩm để gửi GHN.');
    }

    const rawPayload = existingRawPayload;
    const onboarding = (order.store?.onboardingData as Record<string, any>) || {};
    const storeWarehouse = (order.store?.returnWarehouse as Record<string, any>) || {};

    const fromName = onboarding.representativeName || storeWarehouse.name || order.store?.name || 'Gian hàng SCANMS';
    const fromPhone = String(onboarding.contactPhone || storeWarehouse.phone || order.store.owner?.phoneNumber || '').trim();
    const fromAddressRaw = String(onboarding.warehouseAddress || storeWarehouse.address || '').trim();
    if (!fromAddressRaw || !fromPhone) {
      throw new BadRequestException('Shop cần cập nhật địa chỉ kho và số điện thoại liên hệ trước khi gửi hàng.');
    }

    const { districtId: fromDistrictId, wardCode: fromWardCode } = await this.resolveGhnLocation(fromAddressRaw, ghnEnvironment);
    const { districtId, wardCode } = ghnEnvironment === GhnEnvironment.LIVE && rawPayload.ghnDistrictId && rawPayload.ghnWardCode
      ? { districtId: Number(rawPayload.ghnDistrictId), wardCode: String(rawPayload.ghnWardCode) }
      : await this.resolveGhnLocation(order.shippingAddress || '', ghnEnvironment);

    // Xác định số tiền COD
    const paymentMethod = rawPayload.paymentMethod || 'COD';
    const isCod = paymentMethod === 'COD';
    const codAmount = isCod ? Math.round(Number(order.finalAmount)) : 0;
    if (customOptions?.codAmount !== undefined && customOptions.codAmount !== codAmount) {
      throw new BadRequestException('Tiền thu hộ phải khớp số tiền đơn hàng đã chốt.');
    }

    // Chuẩn bị danh sách sản phẩm gửi GHN
    const items = order.orderItems.map((item) => ({
      name: item.product?.title || 'Sản phẩm SCANMS',
      quantity: item.quantity,
      price: Math.round(Number(item.unitPrice)),
      weight: 500,
    }));
    const checkoutWeight = Math.max(500, order.orderItems.reduce((total, item) => total + item.quantity, 0) * 500);
    if ((customOptions?.weight !== undefined && customOptions.weight !== checkoutWeight) ||
        (customOptions?.length !== undefined && customOptions.length !== 15) ||
        (customOptions?.width !== undefined && customOptions.width !== 10) ||
        (customOptions?.height !== undefined && customOptions.height !== 5)) {
      throw new BadRequestException('Khối lượng hoặc kích thước phải khớp báo giá GHN lúc khách đặt hàng.');
    }

    const buildGhnPayload = (targetCod: number) => ({
      payment_type_id: 1, // Cước đã tính trong đơn; người gửi thanh toán cho GHN.
      note:
        customOptions?.note ||
        `Đơn hàng #${order.externalOrderSn} từ sàn SCANMS`,
      required_note:
        customOptions?.requiredNote || GhnRequiredNote.CHOXEMHANGKHONGTHU,
      from_name: fromName,
      from_phone: fromPhone,
      from_address: fromAddressRaw,
      from_ward_code: fromWardCode,
      from_district_id: fromDistrictId,
      to_name: order.customerName || 'Khách hàng SCANMS',
      to_phone: order.customerPhone,
      to_address: order.shippingAddress,
      to_ward_code: wardCode,
      to_district_id: districtId,
      cod_amount: targetCod,
      content: `Đơn hàng #${order.externalOrderSn} - ${items.length} sản phẩm`,
      weight: checkoutWeight,
      length: customOptions?.length || 15,
      width: customOptions?.width || 10,
      height: customOptions?.height || 5,
      insurance_value: Math.round(Number(order.subtotalAmount)),
      service_type_id: 2, // Giao chuẩn TMĐT
      items,
    });

    let orderCode = '';
    let totalFee = 0;
    let expectedDeliveryTime: string | null = null;
    let isRealGhn = false;
    let ghnResponseData: any = null;
    let ghnFailureReason = '';

    try {
      this.logger.log(
        `Đang gửi yêu cầu tạo đơn sang GHN cho Đơn hàng #${order.externalOrderSn}...`,
      );
      let ghnRes = await this.ghnFetch<{
        code: number;
        message: string;
        code_message?: string;
        code_message_value?: string;
        data?: {
          order_code: string;
          total_fee: number;
          expected_delivery_time: string;
          trans_type: string;
        };
      }>('/v2/shipping-order/create', {
        method: 'POST',
        body: buildGhnPayload(codAmount),
        environment: ghnEnvironment,
      });

      if (ghnRes?.code === 200 && ghnRes.data?.order_code) {
        orderCode = ghnRes.data.order_code;
        totalFee = ghnRes.data.total_fee;
        expectedDeliveryTime = ghnRes.data.expected_delivery_time || null;
        isRealGhn = ghnEnvironment === GhnEnvironment.LIVE;
        ghnResponseData = ghnRes.data;
        this.logger.log(
          `✅ Tạo đơn GHN thành công! Mã vận đơn GHN: ${orderCode}`,
        );
      } else {
        ghnFailureReason = [
          ghnRes?.message,
          ghnRes?.code_message_value,
          ghnRes?.code_message,
        ]
          .filter((value) => typeof value === 'string' && value.trim())
          .join(' — ');
        if (!ghnFailureReason) {
          ghnFailureReason = `GHN trả về mã lỗi ${ghnRes?.code ?? 'không xác định'}.`;
        }
        this.logger.warn(`GHN trả về mã ${ghnRes?.code}: ${ghnRes?.message}.`);
      }
    } catch (err: any) {
      const response = err?.response?.data;
      ghnFailureReason = [
        response?.message,
        response?.code_message_value,
        response?.code_message,
        err?.message,
      ]
        .find((value) => typeof value === 'string' && value.trim())
        ?.trim()
        .slice(0, 280) || '';
      this.logger.warn(`Kết nối GHN gián đoạn (${err?.message})`);
    }

    // Không ghi nhận vận đơn nếu GHN không xác nhận mã thật.
    if (!orderCode) {
      if (/SEND_WARD_IS_DISABLED/i.test(ghnFailureReason)) {
        throw new BadRequestException(
          `GHN ${ghnEnvironment === GhnEnvironment.TEST ? 'sandbox' : 'thật'} không hỗ trợ lấy hàng tại phường/xã của kho Shop ${order.store.name} (${fromAddressRaw}). Hãy kiểm tra địa chỉ kho trong Cài đặt gian hàng và địa chỉ lấy hàng trên tài khoản GHN đúng môi trường. Không đổi địa chỉ người nhận để xử lý lỗi này. Đơn vẫn chờ gửi, chưa có mã vận đơn. [SEND_WARD_IS_DISABLED]`,
        );
      }
      if (/exceed|limit|quota|vượt quá|giới hạn|số lượng cho phép/i.test(ghnFailureReason)) {
        throw new BadRequestException(
          'GHN từ chối tạo vận đơn vì tài khoản đã đạt giới hạn tạo đơn. Đơn vẫn chờ gửi và chưa có mã vận đơn; hãy kiểm tra hạn mức hoặc liên hệ GHN.',
        );
      }
      if (ghnFailureReason) {
        throw new BadRequestException(
          `GHN chưa tạo được vận đơn: ${ghnFailureReason}. Đơn vẫn chờ gửi và chưa có mã vận đơn.`,
        );
      }
      throw new BadRequestException(
        'Không kết nối được GHN để tạo vận đơn. Đơn vẫn chờ gửi và chưa có mã vận đơn; vui lòng thử lại sau.',
      );
    }

    // Cập nhật trạng thái đơn hàng trong Database
    const updatedRawPayload = {
      ...rawPayload,
      shippingCarrier: 'GHN',
      carrierName: 'Giao Hàng Nhanh (GHN Express)',
      trackingNumber: orderCode,
      ghnOrderCode: orderCode,
      ghnTotalFee: totalFee,
      ghnExpectedDelivery: expectedDeliveryTime,
      ghnCodAmount: codAmount,
      ghnIsReal: isRealGhn,
      ghnEnvironment,
      ghnRawResponse: ghnResponseData,
      ghnShippedAt: new Date().toISOString(),
      ...(ghnEnvironment === GhnEnvironment.TEST ? { ghnSimulation: createCustomerGhnSimulation(orderCode) } : {}),
    };

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: {
          status: OrderStatus.SHIPPING,
          rawPayload: updatedRawPayload,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Đơn hàng đã thay đổi trạng thái trong lúc tạo vận đơn.');
      }
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (order.status !== OrderStatus.SHIPPING) {
        await notifyCustomerOrderEvent(tx, current, 'ORDER_SHIPPED', {
          carrierName: 'Giao Hàng Nhanh (GHN Express)',
          trackingNumber: orderCode,
        });
      }
      return current;
    });

    return {
      success: true,
      message: ghnEnvironment === GhnEnvironment.TEST
        ? 'Đã tạo vận đơn thử nghiệm trên GHN Staging thành công.'
        : 'Đã tạo vận đơn chính thức trên hệ thống GHN Express thành công!',
      orderId: updatedOrder.id,
      orderCode,
      trackingNumber: orderCode,
      carrier: 'Giao Hàng Nhanh (GHN)',
      totalFee,
      expectedDeliveryTime,
      codAmount,
      isRealGhn,
      environment: ghnEnvironment,
      orderStatus: updatedOrder.status,
    };
  }

  async createSampleShippingOrder(requestId: string, shopOwnerId: string, environment: GhnEnvironment = GhnEnvironment.LIVE) {
    if (!Object.values(GhnEnvironment).includes(environment)) throw new BadRequestException('Môi trường GHN không hợp lệ.');
    if (environment === GhnEnvironment.TEST) {
      // Serialize requests for this sample across processes, including the carrier call.
      return this.prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731033, hashtext(${requestId}))`;
        return this.createSampleShippingOrderInternal(requestId, shopOwnerId, environment, tx);
      }, { timeout: 60000 });
    }
    return this.createSampleShippingOrderInternal(requestId, shopOwnerId, environment, this.prisma);
  }

  async sandboxSampleState(code: string, userId: string, action?: 'start' | 'receive' | 'video' | 'expire' | 'pay-shipping', videoUrl?: string, videoDetails?: { title?: string; caption?: string }) {
    const charge = await this.prisma.sampleShippingCharge.findFirst({
      where: { trackingNumber: code, environment: 'TEST', carrier: 'GHN' },
      include: { sampleRequest: { include: { product: { select: { store: { select: { ownerId: true } } } } } } },
    });
    if (!charge) throw new NotFoundException('Không tìm thấy vận đơn sandbox.');
    const sample = charge.sampleRequest;
    const owner = sample.product.store.ownerId === userId;
    const kol = sample.collaboratorId === userId;
    if ((!owner && !kol) || (['start', 'receive', 'expire', 'pay-shipping'].includes(action || '') && !owner) || (action === 'video' && !kol)) {
      throw new BadRequestException('Bạn không có quyền thao tác mẫu thử này.');
    }
    if (action === 'video') {
      try { if (typeof videoUrl !== 'string' || videoUrl.length > 2000 || !['http:', 'https:'].includes(new URL(videoUrl).protocol)) throw new Error(); }
      catch { throw new BadRequestException('Link video thử không hợp lệ.'); }
    }
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731034, hashtext(${charge.sampleRequestId}))`;
      const latest = await tx.sampleRequestEvent.findFirst({
        where: { sampleRequestId: charge.sampleRequestId, action: 'SANDBOX_SAMPLE_STATE', details: { path: ['orderCode'], equals: code } },
        orderBy: { createdAt: 'desc' },
      });
      const previous = (latest?.details || {}) as Record<string, any>;
      let shippingPayment = previous.shippingPayment || null;
      const newShippingPayment = action === 'pay-shipping' && !shippingPayment;
      if (newShippingPayment) {
        const amount = charge.amount === null || charge.amount === undefined ? null : Number(charge.amount);
        if (!isValidShippingFee(amount)) throw new BadRequestException('Chưa có cước GHN hợp lệ để thanh toán thử.');
        shippingPayment = {
          status: 'PAID_SIMULATED', amount, paidAt: new Date().toISOString(), paidBy: userId,
          reference: `SBX-SHIP-${charge.id}`, payer: 'SHOP', codAmount: 0,
        };
      }
      const now = Date.now();
      const startedAt = previous.simulationStartedAt ? Date.parse(previous.simulationStartedAt) : NaN;
      const elapsed = Number.isFinite(startedAt) ? Math.max(0, now - startedAt) : -1;
      const deliveryStatus = elapsed < 0 ? (previous.receivedAt ? 'DELIVERED' : 'NOT_STARTED')
        : elapsed < 60_000 ? 'WAITING_PICKUP' : elapsed < 120_000 ? 'IN_TRANSIT' : 'DELIVERED';
      const simulatedDeliveryAt = Number.isFinite(startedAt) ? new Date(startedAt + 120_000).toISOString() : null;
      let receivedAt = deliveryStatus === 'DELIVERED'
        ? previous.receivedAt || simulatedDeliveryAt || (action === 'receive' ? new Date().toISOString() : null)
        : previous.receivedAt || null;
      let deadlineAt = previous.deadlineAt || (receivedAt ? new Date(Date.parse(receivedAt) + 14 * 86400000).toISOString() : null);
      let simulatedNow = previous.simulatedNow || null;
      let nextDeliveryStatus = deliveryStatus;
      let simulationStartedAt = previous.simulationStartedAt || null;
      let videoUrlSaved = previous.videoUrl || null;
      let titleSaved = previous.title || null;
      let captionSaved = previous.caption || null;
      let statusChanged = nextDeliveryStatus !== (previous.deliveryStatus || (previous.receivedAt ? 'DELIVERED' : 'NOT_STARTED')) ||
        (receivedAt !== (previous.receivedAt || null));
      // Starting an existing run must be idempotent. The timestamp is stored
      // in the sandbox event, so revisiting the page or retrying the request
      // must never restart the two-minute clock.
      if (action === 'start' && !simulationStartedAt) {
        simulationStartedAt = new Date().toISOString();
        receivedAt = null; deadlineAt = null; simulatedNow = null;
        nextDeliveryStatus = 'WAITING_PICKUP';
        videoUrlSaved = null; titleSaved = null; captionSaved = null;
        statusChanged = true;
      }
      if (action === 'video' && !receivedAt) throw new BadRequestException('Shop chưa xác nhận nhận hàng thử.');
      if (action === 'expire' && (!receivedAt || previous.videoUrl)) throw new BadRequestException('Chỉ thử quá hạn khi đã nhận mẫu và chưa nộp video.');
      if (action === 'receive' && !receivedAt) {
        receivedAt = new Date().toISOString(); deadlineAt = new Date(Date.parse(receivedAt) + 14 * 86400000).toISOString();
        nextDeliveryStatus = 'DELIVERED'; statusChanged = true;
      }
      if (action === 'expire') simulatedNow = previous.simulatedNow || new Date(Math.max(Date.now(), Date.parse(deadlineAt!) + 1000)).toISOString();
      if (action === 'video') {
        videoUrlSaved = videoUrl!.trim();
        titleSaved = typeof videoDetails?.title === 'string' ? videoDetails.title.trim().slice(0, 255) : titleSaved;
        captionSaved = typeof videoDetails?.caption === 'string' ? videoDetails.caption.trim().slice(0, 5000) : captionSaved;
      }
      const state = { orderCode: code, simulated: true, simulationStartedAt, deliveryStatus: nextDeliveryStatus,
        receivedAt, deadlineAt, simulatedNow, videoUrl: videoUrlSaved, title: titleSaved, caption: captionSaved, shippingPayment };
      if ((action && action !== 'pay-shipping' && (action !== 'receive' || !previous.receivedAt)) || newShippingPayment || statusChanged) {
        await tx.sampleRequestEvent.create({ data: { sampleRequestId: charge.sampleRequestId, actorId: userId, action: 'SANDBOX_SAMPLE_STATE', details: state } });
      }
      const overdue = Boolean(state.receivedAt && !state.videoUrl && Date.parse(state.simulatedNow || new Date().toISOString()) >= Date.parse(state.deadlineAt!));
      return { ...state, status: state.videoUrl ? 'VIDEO_SUBMITTED' : overdue ? 'OVERDUE' : receivedAt ? 'RECEIVED' : 'SHIPPED' };
    });
  }

  private async createSampleShippingOrderInternal(requestId: string, shopOwnerId: string, environment: GhnEnvironment, db: Prisma.TransactionClient | PrismaService) {
    const sample = await db.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: { product: { include: { store: { include: { owner: true } } } } },
    });
    if (!sample) throw new NotFoundException('Không tìm thấy yêu cầu hàng mẫu.');
    if (sample.product.store.ownerId !== shopOwnerId) {
      throw new BadRequestException('Bạn không quản lý Shop của yêu cầu này.');
    }
    const sandbox = environment === GhnEnvironment.TEST;
    if (sample.status !== SampleRequestStatus.APPROVED && sample.status !== SampleRequestStatus.DELIVERY_ISSUE &&
        !(sandbox && sample.status === SampleRequestStatus.SHIPPED)) {
      throw new BadRequestException('Chỉ tạo vận đơn cho mẫu đã duyệt hoặc cần gửi lại.');
    }
    if (sandbox) {
      const existing = await db.sampleShippingCharge.findFirst({
        where: { sampleRequestId: requestId, environment: 'TEST', carrier: 'GHN' },
        orderBy: { recordedAt: 'desc' },
      });
      if (existing) {
        const detail = await this.ghnFetch<{ code: number; data?: { status?: string } }>('/v2/shipping-order/detail', {
          method: 'POST', environment, body: { order_code: existing.trackingNumber },
        });
        if (detail.code !== 200 || !detail.data?.status) {
          throw new BadRequestException('Chưa kiểm tra được mã sandbox hiện có. Vui lòng thử theo dõi lại; hệ thống không tạo thêm mã để tránh trùng.');
        }
        if (!['cancel', 'returned', 'lost', 'damage', 'scrap'].includes(detail.data.status)) {
          return { success: true, requestId, trackingNumber: existing.trackingNumber, carrier: 'GHN',
            environment, testOnly: true, reused: true, totalFee: existing.amount === null ? null : Number(existing.amount), shippingPayer: 'SHOP', codAmount: 0 };
        }
      }
    }
    if (!sample.recipientName || !sample.recipientPhone || !sample.shippingAddress) {
      throw new BadRequestException('Thiếu tên, số điện thoại hoặc địa chỉ người nhận mẫu.');
    }
    const store = sample.product.store;
    const sender = (store.onboardingData as Record<string, any>) || {};
    const returnWarehouse = (store.returnWarehouse as Record<string, any>) || {};

    const fromAddress = String(sender.warehouseAddress || returnWarehouse.address || '').trim();
    const fromPhone = String(sender.contactPhone || returnWarehouse.phone || store.owner?.phoneNumber || '').trim();
    const fromName = sender.representativeName || returnWarehouse.name || store.name || 'Gian hàng SCANMS';

    if (!fromAddress || !fromPhone) {
      throw new BadRequestException('Shop cần cập nhật địa chỉ kho và số điện thoại liên hệ.');
    }
    const from = await this.resolveGhnLocation(fromAddress, environment);
    const to = !sandbox && sample.ghnDistrictId && sample.ghnWardCode
      ? { districtId: sample.ghnDistrictId, wardCode: sample.ghnWardCode }
      : await this.resolveGhnLocation(sample.shippingAddress, environment);
    const response = await this.ghnFetch<{ code: number; message?: string; code_message_value?: string; code_message?: string; data?: { order_code: string; total_fee: number } }>(
      '/v2/shipping-order/create', {
        method: 'POST',
        environment,
        body: {
          payment_type_id: 1,
          required_note: GhnRequiredNote.CHOXEMHANGKHONGTHU,
          from_name: fromName,
          from_phone: fromPhone,
          from_address: fromAddress,
          from_district_id: from.districtId,
          from_ward_code: from.wardCode,
          to_name: sample.recipientName,
          to_phone: sample.recipientPhone,
          to_address: sample.shippingAddress,
          to_district_id: to.districtId,
          to_ward_code: to.wardCode,
          cod_amount: 0,
          content: `Hàng mẫu SCANMS - ${sample.product.title}`,
          weight: 500,
          length: 15, width: 10, height: 5,
          service_type_id: 2,
          items: [{ name: sample.product.title, quantity: 1, price: Math.round(Number(sample.product.price)) }],
        },
      },
    );
    const trackingNumber = response?.data?.order_code || '';
    if (response?.code !== 200 || !trackingNumber) {
      const reason = [response?.message, response?.code_message_value, response?.code_message]
        .find(value => typeof value === 'string' && value.trim())?.trim().slice(0, 280) || '';
      if (/exceed|limit|quota|vượt quá|giới hạn|số lượng cho phép/i.test(reason)) {
        throw new BadRequestException({
          statusCode: 400, code: 'GHN_ORDER_LIMIT_REACHED',
          message: `Tài khoản GHN ${sandbox ? 'sandbox' : 'thật'} đang bị giới hạn tạo vận đơn. Đây là hạn mức của GHN, không phải số suất mẫu Shop đã cấp. Vui lòng kiểm tra hạn mức tài khoản hoặc liên hệ GHN. Chưa thay đổi trạng thái mẫu và chưa bắt đầu hạn nộp video.`,
        });
      }
      throw new BadRequestException(`GHN chưa tạo được vận đơn mẫu${reason ? `: ${reason}` : ''}. Yêu cầu vẫn chờ gửi và chưa bắt đầu hạn nộp video.`);
    }
    // GHN may create the waybill without returning a usable fee. Keep its code
    // and record an unknown charge; never report missing freight as zero.
    const totalFee = isValidShippingFee(response?.data?.total_fee) ? response.data.total_fee : null;
    if (sandbox) {
      // A sandbox waybill is an integration test, never proof of real sample shipment/receipt.
        await db.sampleShippingCharge.create({ data: {
          sampleRequestId: requestId, storeId: store.id, carrier: 'GHN', environment: 'TEST',
          trackingNumber, amount: totalFee, payer: 'SHOP', codAmount: 0, status: totalFee === null ? 'PENDING_CONFIRMATION' : 'GHN_REPORTED',
        } });
        await db.sampleRequestEvent.create({ data: {
          sampleRequestId: requestId, actorId: shopOwnerId, action: 'GHN_SANDBOX_CREATED',
          details: { environment, trackingNumber, shippingFee: totalFee, testOnly: true },
        } });
      return { success: true, requestId, trackingNumber, carrier: 'GHN', totalFee, environment, testOnly: true, shippingPayer: 'SHOP', codAmount: 0 };
    }
    const chargeStatus = totalFee === null ? 'PENDING_CONFIRMATION' : 'GHN_REPORTED';
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.sampleProductRequest.updateMany({
        where: { id: requestId, status: sample.status },
        data: { status: SampleRequestStatus.SHIPPED, trackingNumber, carrier: 'GHN', rejectedReason: null, receivedAt: null, deadlineAt: null, expectedVideoAt: null },
      });
      if (changed.count !== 1) throw new ConflictException('Yêu cầu mẫu đã đổi trạng thái trong lúc tạo vận đơn.');
      await tx.sampleShippingCharge.create({ data: {
        sampleRequestId: requestId, storeId: store.id, carrier: 'GHN', environment: 'LIVE',
        trackingNumber, amount: totalFee, payer: 'SHOP', codAmount: 0, status: chargeStatus,
      } });
      await tx.sampleRequestEvent.create({
        data: { sampleRequestId: requestId, actorId: shopOwnerId, action: 'SAMPLE_REQUEST_SHIPPED', details: { carrier: 'GHN', trackingNumber, shippingFee: totalFee, shippingPayer: 'SHOP', codAmount: 0, chargeStatus } },
      });
      await tx.notification.create({
        data: {
          userId: sample.collaboratorId,
          title: 'Shop đã gửi hàng mẫu',
          message: `Hàng mẫu đang được GHN vận chuyển. Mã vận đơn: ${trackingNumber}.`,
          type: 'SAMPLE_SHIPPED',
          data: { sampleRequestId: requestId, trackingNumber },
        },
      });
    });
    return { success: true, requestId, trackingNumber, carrier: 'GHN', totalFee, environment, shippingPayer: 'SHOP', codAmount: 0, chargeStatus };
  }

  /**
   * Sinh Token in phiếu giao hàng chuẩn khổ A6 / A5 của GHN
   */
  async generatePrintToken(orderCodes: string[]) {
    const environment = orderCodes[0]
      ? await this.getOrderEnvironment(orderCodes[0])
      : GhnEnvironment.LIVE;
    try {
      const res = await this.ghnFetch<{
        code: number;
        data?: {
          token: string;
        };
      }>('/v2/a5/gen-token', {
        method: 'POST',
        body: { order_codes: orderCodes },
        environment,
      });

      if (res?.code === 200 && res.data?.token) {
        const { apiUrl } = this.getConfig(environment);
        const baseHost = apiUrl.includes('dev-')
          ? 'https://dev-online-gateway.ghn.vn'
          : 'https://online-gateway.ghn.vn';

        return {
          token: res.data.token,
          printA5Url: `${baseHost}/a5/public-api/printA5?token=${res.data.token}`,
          printA6Url: `${baseHost}/a5/public-api/printA5?token=${res.data.token}&size=A6`,
          isRealGhn: environment === GhnEnvironment.LIVE,
          environment,
        };
      }
    } catch (e: any) {
      this.logger.warn(`Không lấy được print token GHN: ${e?.message}`);
    }

    throw new BadRequestException('GHN chưa cấp token in phiếu giao hàng. Vui lòng thử lại.');
  }

  /**
   * Tra cứu hành trình bưu kiện
   */
  private async getOrderEnvironment(orderCode: string): Promise<GhnEnvironment> {
    if (this.prisma?.sampleShippingCharge?.findFirst) {
      const charge = await this.prisma.sampleShippingCharge.findFirst({ where: { trackingNumber: orderCode, carrier: 'GHN' }, orderBy: { recordedAt: 'desc' }, select: { environment: true } });
      if (charge) return charge.environment === 'TEST' ? GhnEnvironment.TEST : GhnEnvironment.LIVE;
    }
    if (!this.prisma?.order?.findFirst) return GhnEnvironment.LIVE;
    try {
      const order = await this.prisma.order.findFirst({
        where: { OR: [
          { rawPayload: { path: ['ghnOrderCode'], equals: orderCode } },
          { rawPayload: { path: ['trackingNumber'], equals: orderCode } },
        ] },
        select: { rawPayload: true },
      });
      const rawPayload = order?.rawPayload as Record<string, unknown> | null;
      return rawPayload?.ghnEnvironment === GhnEnvironment.TEST
        ? GhnEnvironment.TEST
        : GhnEnvironment.LIVE;
    } catch (error: any) {
      this.logger.warn(`Không xác định được môi trường GHN cho ${orderCode}: ${error?.message}`);
      return GhnEnvironment.LIVE;
    }
  }

  async trackOrder(orderCode: string, requestedEnvironment?: GhnEnvironment) {
    if (!/^[A-Za-z0-9-]{5,100}$/.test(orderCode)) throw new BadRequestException('Mã vận đơn GHN không hợp lệ.');
    const environment = requestedEnvironment || await this.getOrderEnvironment(orderCode);
    if (environment === GhnEnvironment.TEST && this.prisma?.order?.findFirst) {
      const order = await this.prisma.order.findFirst({
        where: { rawPayload: { path: ['ghnOrderCode'], equals: orderCode } }, select: { rawPayload: true },
      });
      const simulated = order?.rawPayload && customerGhnSimulationDetail(order.rawPayload as Record<string, any>, orderCode);
      if (simulated) {
        if (simulated.status === 'delivered') {
          await syncCustomerGhnSimulations(this.prisma, { rawPayload: { path: ['ghnOrderCode'], equals: orderCode } });
        }
        return simulated;
      }
    }
    let detailData: any = null;
    let trackingError: 'ORDER_NOT_FOUND' | null = null;

    try {
      const res = await this.ghnFetch<{
        code: number;
        data?: any;
        message?: string;
      }>(`/v2/shipping-order/detail`, {
        method: 'POST',
        body: { order_code: orderCode },
        environment,
      });

      if (res?.code === 200 && res.data) {
        detailData = res.data;
      } else if (/đơn hàng không tồn tại|order (?:does not exist|not found)/i.test(res?.message || '')) {
        trackingError = 'ORDER_NOT_FOUND';
      }
    } catch (e: any) {
      this.logger.warn(
        `Không tra cứu được mã ${orderCode} trên GHN: ${e?.message}`,
      );
    }

    let saved = await this.readTrackingEvidence(orderCode, environment);
    const status = ghnText(detailData?.status, 40)?.toLowerCase();
    const fresh = Boolean(status && Object.hasOwn(GHN_STATUS_LABELS, status));
    const detailEvents = normalizeGhnEvents(detailData?.log);
    if (status === 'delivering' || status === 'money_collect_delivering') {
      const latest = [...detailEvents].reverse().find(event => event.status === status);
      if (latest) {
        latest.shipperName = ghnText(detailData?.shipper_name) || latest.shipperName;
        latest.shipperPhone = this.trackingPhone(detailData?.shipper_phone) || latest.shipperPhone;
      }
    }
    if (status && fresh) {
      saved = await this.saveTrackingEvidence(orderCode, environment, {
        status, events: detailEvents,
        time: ghnTime(detailData?.updated_date),
        shipperName: ghnText(detailData?.shipper_name),
        shipperPhone: this.trackingPhone(detailData?.shipper_phone),
      }) || saved;
    }
    const timeline = normalizeGhnEvents([...(Array.isArray(saved?.events) ? saved.events : []),
      ...detailEvents]);
    const displayStatus = fresh ? status! : trackingError ? 'unavailable' : saved?.status || 'unavailable';
    const latestDelivery = [...timeline].reverse().find(event => ['delivering', 'money_collect_delivering'].includes(event.status) && event.time);
    const contactCurrent = !latestDelivery?.time || (saved?.contactUpdatedAt && new Date(saved.contactUpdatedAt).getTime() >= Date.parse(latestDelivery.time));
    const latestContact = contactCurrent ? saved : null;
    const shipperName = ghnText(detailData?.shipper_name) || latestContact?.shipperName || null;
    const shipperPhone = this.trackingPhone(detailData?.shipper_phone) || latestContact?.shipperPhone || null;
    return {
      orderCode,
      carrier: 'Giao Hàng Nhanh (GHN Express)',
      environment,
      status: displayStatus,
      trackingError,
      statusText: displayStatus !== 'unavailable'
        ? this.translateStatus(displayStatus)
        : 'Chưa tra cứu được trạng thái từ GHN',
      trackingUrl: environment === GhnEnvironment.TEST
        ? null
        : `https://ghn.vn/blogs/trang-thai-don-hang?order_code=${encodeURIComponent(orderCode)}`,
      expectedDeliveryTime:
        detailData?.leadtime || detailData?.expected_delivery_time || null,
      shipperName,
      shipperPhone,
      timeline,
      isStale: !fresh,
      lastCheckedAt: fresh ? new Date().toISOString() : saved?.observedAt?.toISOString() || null,
      lastKnownStatusText: saved?.status ? this.translateStatus(saved.status) : null,
      ghnRawDetail: detailData,
    };
  }

  async startCustomerSimulation(orderId: string, storeIdContext?: string) {
    const code = await this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Không tìm thấy đơn mua.');
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (storeIdContext && order.storeId !== storeIdContext) throw new BadRequestException('Đơn mua không thuộc Shop của bạn.');
      const raw = (order.rawPayload || {}) as Record<string, any>;
      if (raw.ghnEnvironment !== GhnEnvironment.TEST || !raw.ghnOrderCode || order.status !== OrderStatus.SHIPPING) {
        throw new BadRequestException('Chỉ mô phỏng đơn mua đang giao có vận đơn GHN TEST.');
      }
      // Retrying this action never restarts an existing clock or changes its shipper.
      if (!customerGhnSimulationDetail(raw, raw.ghnOrderCode)) {
        await tx.order.update({ where: { id: order.id }, data: {
          rawPayload: { ...raw, ghnSimulation: createCustomerGhnSimulation(raw.ghnOrderCode) },
        } });
      }
      return raw.ghnOrderCode as string;
    });
    return this.trackOrder(code, GhnEnvironment.TEST);
  }

  private trackingPhone(value: unknown): string | null {
    const phone = ghnText(value, 30);
    return phone && /^[+\d][\d\s().-]{5,29}$/.test(phone) ? phone : null;
  }

  private async readTrackingEvidence(orderCode: string, environment: GhnEnvironment) {
    if (!this.prisma.ghnTrackingRecord) return null;
    try { return await this.prisma.ghnTrackingRecord.findUnique({ where: { environment_orderCode: { environment, orderCode } } }); }
    catch (error: any) { this.logger.warn(`Chưa đọc được lịch sử GHN: ${error?.message}`); return null; }
  }

  private async saveTrackingEvidence(orderCode: string, environment: GhnEnvironment, evidence: {
    status: string; events: GhnEvent[]; time: string | null; shipperName?: string | null; shipperPhone?: string | null;
  }) {
    if (!this.prisma.ghnTrackingRecord) return null;
    return this.prisma.$transaction(async tx => {
      const where = { environment_orderCode: { environment, orderCode } };
      // The upsert update locks this waybill until commit. Merge after acquiring
      // that lock so polling and callbacks cannot overwrite each other's logs.
      const previous = await tx.ghnTrackingRecord.upsert({ where,
        create: { environment, orderCode, status: evidence.status, events: [] }, update: { orderCode } });
      const events = normalizeGhnEvents([...(Array.isArray(previous.events) ? previous.events : []), ...evidence.events]);
      const evidenceTime = evidence.time ? new Date(evidence.time) : null;
      const newerStatus = !previous.statusUpdatedAt || (evidenceTime && evidenceTime >= previous.statusUpdatedAt);
      const newerContact = !previous.contactUpdatedAt || (evidenceTime && evidenceTime >= previous.contactUpdatedAt);
      const hasContact = Boolean(evidence.shipperName || evidence.shipperPhone);
      return tx.ghnTrackingRecord.update({ where, data: {
        events: events as any,
        ...(newerStatus ? { status: evidence.status, ...(evidenceTime ? { statusUpdatedAt: evidenceTime } : {}) } : {}),
        ...(hasContact && newerContact ? { shipperName: evidence.shipperName || null, shipperPhone: evidence.shipperPhone || null,
          contactUpdatedAt: evidenceTime || new Date() } : {}),
        observedAt: new Date(),
      } });
    });
  }

  private trustedTrackingWebhook(payload: any, suppliedSecret?: string, environment = GhnEnvironment.LIVE): boolean {
    const expected = this.configService.get?.<string>('GHN_WEBHOOK_SECRET') || process.env.GHN_WEBHOOK_SECRET;
    if (!expected || !suppliedSecret || expected.length < 32) return false;
    const left = Buffer.from(expected), right = Buffer.from(suppliedSecret);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
    const shopId = this.getConfig(environment).shopId;
    return Boolean(shopId && String(payload.ShopID ?? payload.shop_id) === String(shopId));
  }

  async syncSampleDelivery(requestId: string, collaboratorId: string) {
    const sample = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      select: { id: true, collaboratorId: true, status: true, carrier: true, trackingNumber: true },
    });
    if (!sample || sample.collaboratorId !== collaboratorId) {
      throw new NotFoundException('Không tìm thấy yêu cầu mẫu của bạn.');
    }
    if (!SAMPLE_AWAITING_RECEIPT.includes(sample.status) ||
        !sample.trackingNumber || !sample.carrier?.toUpperCase().includes('GHN')) {
      return { status: sample.status, synchronized: false };
    }
    const detail = await this.trackOrder(sample.trackingNumber, GhnEnvironment.LIVE);
    if (detail.ghnRawDetail?.status !== 'delivered') {
      return { status: sample.status, synchronized: false };
    }
    const changed = await this.recordSampleDelivery(sample.id, sample.trackingNumber, detail.ghnRawDetail);
    const current = changed ? null : await this.prisma.sampleProductRequest.findUnique({ where: { id: sample.id }, select: { status: true } });
    return { status: changed ? SampleRequestStatus.RECEIVED : current?.status || sample.status, synchronized: changed };
  }

  @Cron('*/10 * * * *')
  async reconcileShippedSamples() {
    const where = { status: { in: SAMPLE_AWAITING_RECEIPT }, carrier: { contains: 'GHN', mode: 'insensitive' as const }, trackingNumber: { not: null } };
    let samples = await this.prisma.sampleProductRequest.findMany({
      where: { ...where, ...(this.sampleReconciliationCursor ? { id: { gt: this.sampleReconciliationCursor } } : {}) },
      select: { id: true, trackingNumber: true },
      orderBy: { id: 'asc' },
      take: 100,
    });
    if (!samples.length && this.sampleReconciliationCursor) {
      this.sampleReconciliationCursor = null;
      samples = await this.prisma.sampleProductRequest.findMany({ where, select: { id: true, trackingNumber: true }, orderBy: { id: 'asc' }, take: 100 });
    }
    if (samples.length) this.sampleReconciliationCursor = samples[samples.length - 1].id;
    for (const sample of samples) {
      if (!sample.trackingNumber) continue;
      try {
        const detail = await this.trackOrder(sample.trackingNumber, GhnEnvironment.LIVE);
        if (detail.ghnRawDetail?.status === 'delivered') {
          await this.recordSampleDelivery(sample.id, sample.trackingNumber, detail.ghnRawDetail);
        }
      } catch (error: any) {
        this.logger.warn(`Không thể đồng bộ trạng thái mẫu ${sample.id}: ${error?.message}`);
      }
    }
  }

  private async recordSampleDelivery(requestId: string, orderCode: string, ghnDetail?: any, verifiedCallbackTime?: string | null) {
    if (ghnDetail?.status !== 'delivered') return false;
    const deliveredEvents = Array.isArray(ghnDetail?.log)
      ? ghnDetail.log.filter((entry: any) => String(entry?.status).toLowerCase() === 'delivered')
      : [];
    const deliveryTimes = deliveredEvents.map((entry: any) => entry.created_date || entry.updated_date)
      .map((value: string | undefined) => parseGhnDeliveryTime(value))
      .filter((value: number) => Number.isFinite(value) && value > 0 && value <= Date.now());
    // Only evidence saved from the authenticated LIVE carrier API/callback for
    // this exact waybill is eligible. A general update/lookup time is not delivery.
    if (!deliveryTimes.length) {
      const saved = await this.readTrackingEvidence(orderCode, GhnEnvironment.LIVE);
      for (const event of Array.isArray(saved?.events) ? saved.events : []) {
        if ((event as any)?.status !== 'delivered') continue;
        const time = parseGhnDeliveryTime((event as any).time);
        if (Number.isFinite(time) && time > 0 && time <= Date.now()) deliveryTimes.push(time);
      }
      const time = parseGhnDeliveryTime(verifiedCallbackTime);
      if (Number.isFinite(time) && time > 0 && time <= Date.now()) deliveryTimes.push(time);
    }
    // A general update can occur long after delivery; it must never extend the SLA.
    // Prefer explicit delivered events over the order-level completion timestamp.
    if (!deliveryTimes.length) {
      const finishedAt = parseGhnDeliveryTime(ghnDetail?.finish_date);
      if (Number.isFinite(finishedAt) && finishedAt > 0 && finishedAt <= Date.now()) {
        deliveryTimes.push(finishedAt);
      }
    }
    if (!deliveryTimes.length) {
      this.logger.warn(`GHN xác nhận delivered cho ${orderCode} nhưng thiếu thời điểm giao; sẽ kiểm tra lại, không dời hạn video sang thời điểm phát hiện.`);
      return false;
    }
    const receivedAt = new Date(Math.min(...deliveryTimes));
    const deadlineAt = new Date(receivedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.sampleProductRequest.updateMany({
        where: { id: requestId, status: { in: SAMPLE_AWAITING_RECEIPT }, trackingNumber: orderCode,
          carrier: { contains: 'GHN', mode: 'insensitive' }, receivedAt: null },
        data: { status: SampleRequestStatus.RECEIVED, receivedAt, deadlineAt, expectedVideoAt: deadlineAt, rejectedReason: null },
      });
      if (changed.count) {
        await tx.sampleRequestEvent.create({
          data: { sampleRequestId: requestId, action: 'GHN_DELIVERED', details: { orderCode, receivedAt: receivedAt.toISOString(), deadlineAt: deadlineAt.toISOString() } },
        });
        const sample = await tx.sampleProductRequest.findUnique({ where: { id: requestId }, select: { collaboratorId: true } });
        if (sample) await tx.notification.create({
          data: { userId: sample.collaboratorId, title: 'Đã giao hàng mẫu', message: `GHN xác nhận bạn đã nhận hàng mẫu. Hạn đăng video: ${deadlineAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`, type: 'SAMPLE_RECEIVED', data: { sampleRequestId: requestId } },
        });
      }
      return changed.count === 1;
    });
  }

  /**
   * Xử lý Webhook tự động từ GHN khi bưu tá đổi trạng thái đơn
   */
  async handleGhnWebhook(payload: any, suppliedSecret?: string) {
    const orderCode = payload?.OrderCode || payload?.order_code;
    if (typeof orderCode !== 'string' || !/^[A-Za-z0-9-]{5,100}$/.test(orderCode)) {
      return { success: false, message: 'Missing OrderCode' };
    }
    // Webhook công khai không đủ tin cậy để đổi trạng thái tiền/hạn video.
    // Đọc lại trạng thái trực tiếp từ GHN bằng token của hệ thống.
    const detail = await this.trackOrder(orderCode);
    if ('isSimulation' in detail && detail.isSimulation) {
      return { success: true, ignored: true, message: 'Customer simulation does not process carrier delivery callbacks' };
    }
    const ghnStatus = detail.ghnRawDetail?.status;
    const environment = detail.environment || GhnEnvironment.LIVE;
    const callbackStatus = String(payload?.Status || payload?.status || '').toLowerCase();
    const callbackTime = ghnTime(payload?.Time || payload?.time);
    const trusted = this.trustedTrackingWebhook(payload, suppliedSecret, environment);
    if (trusted && callbackTime && Object.hasOwn(GHN_STATUS_LABELS, callbackStatus)) {
      const shipperName = ghnText(payload.ShipperName);
      const shipperPhone = this.trackingPhone(payload.ShipperPhone);
      await this.saveTrackingEvidence(orderCode, environment, { status: callbackStatus, time: callbackTime,
        shipperName, shipperPhone, events: normalizeGhnEvents([{ status: callbackStatus, time: callbackTime,
          warehouse: payload.Warehouse, shipperName, shipperPhone }]) });
    }
    if (!ghnStatus || ghnStatus !== String(payload?.Status || payload?.status || '').toLowerCase()) {
      if (trusted && callbackTime && Object.hasOwn(GHN_STATUS_LABELS, callbackStatus)) return { success: true, processedOrderCode: orderCode, historyRecorded: true };
      return { success: false, message: 'GHN status could not be verified' };
    }

    if (ghnStatus === 'delivered' && environment === GhnEnvironment.LIVE) {
      const sample = await this.prisma.sampleProductRequest.findFirst({
        where: { trackingNumber: orderCode, carrier: { contains: 'GHN', mode: 'insensitive' } },
        select: { id: true, status: true, collaboratorId: true },
      });
      if (sample) {
        const synchronized = SAMPLE_AWAITING_RECEIPT.includes(sample.status)
          ? await this.recordSampleDelivery(sample.id, orderCode, detail.ghnRawDetail,
            trusted && callbackStatus === 'delivered' ? callbackTime : null)
          : false;
        return { success: true, processedOrderCode: orderCode, status: ghnStatus, synchronized };
      }
    }

    // Tìm đơn hàng có mã vận đơn này
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { externalOrderSn: orderCode },
          { rawPayload: { path: ['trackingNumber'], equals: orderCode } },
          { rawPayload: { path: ['ghnOrderCode'], equals: orderCode } },
        ],
      },
    });

    if (!order) {
      this.logger.warn(`Không tìm thấy đơn hàng với mã GHN: ${orderCode}`);
      return { success: false, message: 'Order not found' };
    }

    // Nếu GHN báo đã giao hàng thành công -> Chuyển đơn sang DELIVERED
    if (ghnStatus === 'delivered') {
      const finalStatuses: OrderStatus[] = [
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
        OrderStatus.RETURN_REQUESTED,
        OrderStatus.DISPUTED,
        OrderStatus.RETURNED,
      ];
      if (!finalStatuses.includes(order.status)) {
        const changed = await this.prisma.$transaction(async (tx) => {
          const result = await tx.order.updateMany({
            where: { id: order.id, status: order.status },
            data: {
              status: OrderStatus.DELIVERED,
              deliveredAt: new Date(),
            },
          });
          if (result.count === 1) {
            await notifyCustomerOrderEvent(tx, order, 'ORDER_DELIVERED', {
              carrierName: 'Giao Hàng Nhanh (GHN Express)',
              trackingNumber: orderCode,
            });
          }
          return result.count === 1;
        });
        if (changed) {
          this.logger.log(`✅ Webhook GHN: Đơn #${order.externalOrderSn} đã được chuyển sang DELIVERED.`);
        }
      }
    }

    return { success: true, processedOrderCode: orderCode, status: ghnStatus };
  }

  @Cron('*/10 * * * * *')
  async reconcileCustomerSimulations() {
    try {
      await syncCustomerGhnSimulations(this.prisma);
    } catch (error: any) {
      this.logger.warn(`Chưa đồng bộ được trạng thái giao hàng Sandbox: ${error?.message}`);
    }
  }

  private translateStatus(status: string): string {
    return Object.hasOwn(GHN_STATUS_LABELS, status) ? GHN_STATUS_LABELS[status] : 'Đang vận chuyển';
  }
}

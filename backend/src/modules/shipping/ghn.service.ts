import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { OrderStatus, SampleRequestStatus } from '@prisma/client';
import {
  CreateGhnOrderDto,
  CalculateShippingFeeDto,
  GhnRequiredNote,
} from './dto/shipping.dto';
import { notifyCustomerOrderEvent } from '../orders/customer-order-notifications';
import { Cron } from '@nestjs/schedule';

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
  private cachedProvinces: GhnProvince[] = [];
  private cachedDistricts: Map<number, GhnDistrict[]> = new Map();
  private cachedWards: Map<number, GhnWard[]> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lấy cấu hình GHN từ .env
   */
  private getConfig() {
    const apiUrl =
      this.configService.get<string>('GHN_API_URL') ||
      process.env.GHN_API_URL ||
      'https://online-gateway.ghn.vn/shiip/public-api';

    const apiToken =
      this.configService.get<string>('GHN_API_TOKEN') ||
      process.env.GHN_API_TOKEN;

    const shopId =
      this.configService.get<string>('GHN_SHOP_ID') ||
      process.env.GHN_SHOP_ID;

    return { apiUrl, apiToken, shopId };
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
    } = {},
  ): Promise<T> {
    const { apiUrl, apiToken, shopId } = this.getConfig();
    if (!apiToken || (options.includeShopId !== false && !shopId)) {
      throw new BadRequestException('Chưa cấu hình GHN_API_TOKEN hoặc GHN_SHOP_ID.');
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
  async getProvinces(): Promise<GhnProvince[]> {
    if (this.cachedProvinces.length > 0) return this.cachedProvinces;

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnProvince[] }>(
        '/master-data/province',
        { includeShopId: false },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        this.cachedProvinces = res.data;
        return this.cachedProvinces;
      }
    } catch (e: any) {
      this.logger.warn(`Không lấy được danh sách Tỉnh từ GHN: ${e?.message}`);
    }
    return [];
  }

  /**
   * Lấy danh mục Quận/Huyện theo Tỉnh từ GHN
   */
  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    if (this.cachedDistricts.has(provinceId)) {
      return this.cachedDistricts.get(provinceId)!;
    }

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnDistrict[] }>(
        '/master-data/district',
        {
          method: 'POST',
          body: { province_id: provinceId },
          includeShopId: false,
        },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        this.cachedDistricts.set(provinceId, res.data);
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
  async getWards(districtId: number): Promise<GhnWard[]> {
    if (this.cachedWards.has(districtId)) {
      return this.cachedWards.get(districtId)!;
    }

    try {
      const res = await this.ghnFetch<{ code: number; data: GhnWard[] }>(
        `/master-data/ward?district_id=${districtId}`,
        { includeShopId: false },
      );
      if (res?.code === 200 && Array.isArray(res.data)) {
        this.cachedWards.set(districtId, res.data);
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
  private async resolveGhnLocation(address: string): Promise<{
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
    const province = matchOne(await this.getProvinces(), (item) => item.ProvinceName, parts[parts.length - 1], (item: any) => item.NameExtension);
    if (!province) throw new BadRequestException('Tỉnh/thành trong địa chỉ chưa khớp danh mục GHN.');
    const district = matchOne(await this.getDistricts(province.ProvinceID), (item) => item.DistrictName, parts[parts.length - 2], (item: any) => item.NameExtension);
    if (!district) throw new BadRequestException('Quận/huyện trong địa chỉ chưa khớp danh mục GHN.');
    const ward = matchOne(await this.getWards(district.DistrictID), (item) => item.WardName, parts[parts.length - 3], (item: any) => item.NameExtension);
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
          totalFee: res.data.total,
          serviceFee: res.data.service_fee,
          insuranceFee: res.data.insurance_fee,
          isRealGhn: true,
        };
      }
    } catch (e: any) {
      this.logger.warn(
        `Tính cước GHN lỗi, chuyển sang cước mặc định: ${e?.message}`,
      );
    }

    throw new BadRequestException('GHN chưa trả được cước vận chuyển. Vui lòng thử lại sau.');
  }

  async quoteAddress(address: string, weight = 500, insuranceValue = 0, storeId?: string) {
    if (!storeId) throw new BadRequestException('Cần chọn gian hàng để tính cước từ đúng kho xuất.');
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { onboardingData: true, isActive: true, isDeleted: true } });
    if (!store?.isActive || store.isDeleted) throw new BadRequestException('Gian hàng không khả dụng.');
    const warehouseAddress = (store.onboardingData as Record<string, any> | null)?.warehouseAddress;
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
        store: true,
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
    if (order.status !== OrderStatus.PENDING || (order.rawPayload as any)?.ghnOrderCode) {
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

    const rawPayload = (order.rawPayload as any) || {};
    const onboarding = (order.store?.onboardingData as Record<string, any>) || {};
    const storeWarehouse = (order.store?.returnWarehouse as Record<string, any>) || {};

    const fromName = onboarding.representativeName || storeWarehouse.name || order.store?.name || 'Gian hàng SCANMS';
    const fromPhone = onboarding.contactPhone || storeWarehouse.phone || (order.store as any)?.owner?.phoneNumber || '0902345678';
    const fromAddressRaw = onboarding.warehouseAddress || storeWarehouse.address || 'Kho hàng SCANMS, 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP. Hồ Chí Minh';

    const { districtId: fromDistrictId, wardCode: fromWardCode } = await this.resolveGhnLocation(fromAddressRaw);
    const { districtId, wardCode } = rawPayload.ghnDistrictId && rawPayload.ghnWardCode
      ? { districtId: Number(rawPayload.ghnDistrictId), wardCode: String(rawPayload.ghnWardCode) }
      : await this.resolveGhnLocation(order.shippingAddress || '');

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

    try {
      this.logger.log(
        `Đang gửi yêu cầu tạo đơn sang GHN cho Đơn hàng #${order.externalOrderSn}...`,
      );
      let ghnRes = await this.ghnFetch<{
        code: number;
        message: string;
        code_message?: string;
        data?: {
          order_code: string;
          total_fee: number;
          expected_delivery_time: string;
          trans_type: string;
        };
      }>('/v2/shipping-order/create', {
        method: 'POST',
        body: buildGhnPayload(codAmount),
      });

      if (ghnRes?.code === 200 && ghnRes.data?.order_code) {
        orderCode = ghnRes.data.order_code;
        totalFee = ghnRes.data.total_fee;
        expectedDeliveryTime = ghnRes.data.expected_delivery_time || null;
        isRealGhn = true;
        ghnResponseData = ghnRes.data;
        this.logger.log(
          `✅ Tạo đơn GHN thành công! Mã vận đơn GHN: ${orderCode}`,
        );
      } else {
        this.logger.warn(`GHN trả về mã ${ghnRes?.code}: ${ghnRes?.message}.`);
      }
    } catch (err: any) {
      this.logger.warn(`Kết nối GHN gián đoạn (${err?.message})`);
    }

    // Không ghi nhận vận đơn nếu GHN không xác nhận mã thật.
    if (!orderCode) {
      throw new BadRequestException('GHN chưa tạo được vận đơn. Vui lòng kiểm tra địa chỉ, cấu hình và thử lại.');
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
      ghnRawResponse: ghnResponseData,
      ghnShippedAt: new Date().toISOString(),
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
      message: 'Đã tạo vận đơn chính thức trên hệ thống GHN Express thành công!',
      orderId: updatedOrder.id,
      orderCode,
      trackingNumber: orderCode,
      carrier: 'Giao Hàng Nhanh (GHN)',
      totalFee,
      expectedDeliveryTime,
      codAmount,
      isRealGhn,
      orderStatus: updatedOrder.status,
    };
  }

  async createSampleShippingOrder(requestId: string, shopOwnerId: string) {
    const sample = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      include: { product: { include: { store: { include: { owner: true } } } } },
    });
    if (!sample) throw new NotFoundException('Không tìm thấy yêu cầu hàng mẫu.');
    if (sample.product.store.ownerId !== shopOwnerId) {
      throw new BadRequestException('Bạn không quản lý Shop của yêu cầu này.');
    }
    if (sample.status !== SampleRequestStatus.APPROVED && sample.status !== SampleRequestStatus.DELIVERY_ISSUE) {
      throw new BadRequestException('Chỉ tạo vận đơn cho mẫu đã duyệt hoặc cần gửi lại.');
    }
    if (!sample.recipientName || !sample.recipientPhone || !sample.shippingAddress) {
      throw new BadRequestException('Thiếu tên, số điện thoại hoặc địa chỉ người nhận mẫu.');
    }
    const store = sample.product.store;
    const sender = (store.onboardingData as Record<string, any>) || {};
    const returnWarehouse = (store.returnWarehouse as Record<string, any>) || {};

    const fromAddress = sender.warehouseAddress || returnWarehouse.address || 'Kho hàng SCANMS, 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP. Hồ Chí Minh';
    const fromPhone = sender.contactPhone || returnWarehouse.phone || (store as any).owner?.phoneNumber || '0902345678';
    const fromName = sender.representativeName || returnWarehouse.name || store.name || 'Gian hàng SCANMS';

    if (!fromAddress || !fromPhone) {
      throw new BadRequestException('Shop cần cập nhật địa chỉ kho và số điện thoại liên hệ.');
    }
    const from = await this.resolveGhnLocation(fromAddress);
    const to = sample.ghnDistrictId && sample.ghnWardCode
      ? { districtId: sample.ghnDistrictId, wardCode: sample.ghnWardCode }
      : await this.resolveGhnLocation(sample.shippingAddress);
    const response = await this.ghnFetch<{ code: number; message?: string; data?: { order_code: string; total_fee: number } }>(
      '/v2/shipping-order/create', {
        method: 'POST',
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
    let trackingNumber = response?.data?.order_code || '';
    if (response?.code !== 200 || !trackingNumber) {
      if ((response as any)?.code_message === 'CREATE_ORDER_FAIL_BY_EXCEED_LIMIT' || process.env.NODE_ENV !== 'production') {
        trackingNumber = `GHN${Math.floor(10000000 + Math.random() * 90000000)}`;
        this.logger.warn(`GHN Sandbox trả về (${response?.message || (response as any)?.code_message}), tự sinh mã vận đơn ${trackingNumber} cho hàng mẫu.`);
      } else {
        throw new BadRequestException(response?.message || 'GHN chưa tạo được vận đơn mẫu.');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.sampleProductRequest.updateMany({
        where: { id: requestId, status: sample.status },
        data: { status: SampleRequestStatus.SHIPPED, trackingNumber, carrier: 'GHN', rejectedReason: null },
      });
      if (changed.count !== 1) throw new ConflictException('Yêu cầu mẫu đã đổi trạng thái trong lúc tạo vận đơn.');
      await tx.sampleRequestEvent.create({
        data: { sampleRequestId: requestId, actorId: shopOwnerId, action: 'SAMPLE_REQUEST_SHIPPED', details: { carrier: 'GHN', trackingNumber } },
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
    return { success: true, requestId, trackingNumber, carrier: 'GHN', totalFee: response?.data?.total_fee || 0 };
  }

  /**
   * Sinh Token in phiếu giao hàng chuẩn khổ A6 / A5 của GHN
   */
  async generatePrintToken(orderCodes: string[]) {
    try {
      const res = await this.ghnFetch<{
        code: number;
        data?: {
          token: string;
        };
      }>('/v2/a5/gen-token', {
        method: 'POST',
        body: { order_codes: orderCodes },
      });

      if (res?.code === 200 && res.data?.token) {
        const { apiUrl } = this.getConfig();
        const baseHost = apiUrl.includes('dev-')
          ? 'https://dev-online-gateway.ghn.vn'
          : 'https://online-gateway.ghn.vn';

        return {
          token: res.data.token,
          printA5Url: `${baseHost}/a5/public-api/printA5?token=${res.data.token}`,
          printA6Url: `${baseHost}/a5/public-api/printA5?token=${res.data.token}&size=A6`,
          isRealGhn: true,
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
  async trackOrder(orderCode: string) {
    let detailData: any = null;

    try {
      const res = await this.ghnFetch<{
        code: number;
        data?: any;
      }>(`/v2/shipping-order/detail`, {
        method: 'POST',
        body: { order_code: orderCode },
      });

      if (res?.code === 200 && res.data) {
        detailData = res.data;
      }
    } catch (e: any) {
      this.logger.warn(
        `Không tra cứu được mã ${orderCode} trên GHN: ${e?.message}`,
      );
    }

    return {
      orderCode,
      carrier: 'Giao Hàng Nhanh (GHN Express)',
      status: detailData?.status || 'unavailable',
      statusText: detailData?.status
        ? this.translateStatus(detailData.status)
        : 'Chưa tra cứu được trạng thái từ GHN',
      trackingUrl: `https://ghn.vn/blogs/trang-thai-don-hang?order_code=${encodeURIComponent(orderCode)}`,
      expectedDeliveryTime:
        detailData?.leadtime || detailData?.expected_delivery_time || null,
      shipperName: detailData?.shipper_name || null,
      shipperPhone: detailData?.shipper_phone || null,
      timeline: Array.isArray(detailData?.log)
        ? detailData.log.map((entry: any) => ({
            status: entry.status,
            title: this.translateStatus(entry.status),
            time: entry.updated_date || entry.created_date || null,
            completed: true,
          }))
        : [],
      ghnRawDetail: detailData,
    };
  }

  async syncSampleDelivery(requestId: string, collaboratorId: string) {
    const sample = await this.prisma.sampleProductRequest.findUnique({
      where: { id: requestId },
      select: { id: true, collaboratorId: true, status: true, carrier: true, trackingNumber: true },
    });
    if (!sample || sample.collaboratorId !== collaboratorId) {
      throw new NotFoundException('Không tìm thấy yêu cầu mẫu của bạn.');
    }
    if (sample.status !== SampleRequestStatus.SHIPPED ||
        !sample.trackingNumber || !sample.carrier?.toUpperCase().includes('GHN')) {
      return { status: sample.status, synchronized: false };
    }
    const detail = await this.trackOrder(sample.trackingNumber);
    if (detail.ghnRawDetail?.status !== 'delivered') {
      return { status: sample.status, synchronized: false };
    }
    const changed = await this.recordSampleDelivery(sample.id, sample.trackingNumber, detail.ghnRawDetail);
    return { status: changed ? SampleRequestStatus.RECEIVED : sample.status, synchronized: changed };
  }

  @Cron('*/10 * * * *')
  async reconcileShippedSamples() {
    const where = { status: SampleRequestStatus.SHIPPED, carrier: { contains: 'GHN', mode: 'insensitive' as const }, trackingNumber: { not: null } };
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
        const detail = await this.trackOrder(sample.trackingNumber);
        if (detail.ghnRawDetail?.status === 'delivered') {
          await this.recordSampleDelivery(sample.id, sample.trackingNumber, detail.ghnRawDetail);
        }
      } catch (error: any) {
        this.logger.warn(`Không thể đồng bộ trạng thái mẫu ${sample.id}: ${error?.message}`);
      }
    }
  }

  private async recordSampleDelivery(requestId: string, orderCode: string, ghnDetail?: any) {
    const deliveredEvents = Array.isArray(ghnDetail?.log)
      ? ghnDetail.log.filter((entry: any) => String(entry?.status).toLowerCase() === 'delivered')
      : [];
    const deliveryTimes = deliveredEvents.map((entry: any) => entry.created_date || entry.updated_date)
      .map((value: string | undefined) => parseGhnDeliveryTime(value))
      .filter((value: number) => Number.isFinite(value) && value > 0 && value <= Date.now());
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
        where: { id: requestId, status: SampleRequestStatus.SHIPPED, trackingNumber: orderCode },
        data: { status: SampleRequestStatus.RECEIVED, receivedAt, deadlineAt, expectedVideoAt: deadlineAt },
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
  async handleGhnWebhook(payload: any) {
    const orderCode = payload?.OrderCode || payload?.order_code;
    if (typeof orderCode !== 'string' || !/^[A-Za-z0-9-]{5,100}$/.test(orderCode)) {
      return { success: false, message: 'Missing OrderCode' };
    }
    // Webhook công khai không đủ tin cậy để đổi trạng thái tiền/hạn video.
    // Đọc lại trạng thái trực tiếp từ GHN bằng token của hệ thống.
    const detail = await this.trackOrder(orderCode);
    const ghnStatus = detail.ghnRawDetail?.status;
    if (!ghnStatus || ghnStatus !== String(payload?.Status || payload?.status || '').toLowerCase()) {
      return { success: false, message: 'GHN status could not be verified' };
    }

    if (ghnStatus === 'delivered') {
      const sample = await this.prisma.sampleProductRequest.findFirst({
        where: { trackingNumber: orderCode, carrier: { contains: 'GHN', mode: 'insensitive' } },
        select: { id: true, status: true, collaboratorId: true },
      });
      if (sample?.status === SampleRequestStatus.SHIPPED) {
        await this.recordSampleDelivery(sample.id, orderCode, detail.ghnRawDetail);
        return { success: true, processedOrderCode: orderCode, status: ghnStatus };
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

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      ready_to_pick: 'Chờ lấy hàng',
      picking: 'Đang lấy hàng',
      storing: 'Đang lưu kho',
      delivering: 'Đang giao hàng',
      delivered: 'Giao hàng thành công',
      cancel: 'Đã hủy',
      return: 'Đang chuyển hoàn',
      returned: 'Đã hoàn trả',
    };
    return map[status] || 'Đang vận chuyển';
  }
}

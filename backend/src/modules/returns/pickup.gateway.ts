import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { BookPickupInput, WarehouseInput } from './return.schemas';

export interface PickupBooking {
  provider: 'MOCK' | 'GHN_STAGING';
  carrierName: string;
  trackingNumber: string;
  providerStatus: string;
  feeAmount: number | null;
}

@Injectable()
export class PickupGateway {
  mode(): 'mock' | 'staging' | 'disabled' {
    if (process.env.RETURN_PICKUP_PROVIDER === 'staging') return 'staging';
    if (process.env.NODE_ENV !== 'production') return 'mock';
    return 'disabled';
  }

  async book(input: {
    clientOrderCode: string;
    pickup: BookPickupInput;
    warehouse: WarehouseInput;
    content: string;
  }): Promise<PickupBooking> {
    if (this.mode() === 'disabled') {
      throw new ServiceUnavailableException(
        'Chưa cấu hình dịch vụ lấy hàng trả',
      );
    }
    if (this.mode() === 'mock') {
      return {
        provider: 'MOCK',
        carrierName: 'SCANMS Demo',
        trackingNumber: `SIM${input.clientOrderCode.replace(/[^A-Z0-9]/g, '').slice(-15)}`,
        providerStatus: 'ready_to_pick',
        feeAmount: null,
      };
    }

    const token = process.env.GHN_STAGING_TOKEN;
    const shopId = process.env.GHN_STAGING_SHOP_ID;
    if (!token || !shopId || !/^\d+$/.test(shopId)) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình GHN Staging Token và ShopId ở backend',
      );
    }

    const { pickup, warehouse } = input;
    const body = {
      client_order_code: input.clientOrderCode,
      from_name: pickup.name,
      from_phone: pickup.phone,
      from_address: pickup.address,
      from_ward_name: pickup.wardName,
      from_province_name: pickup.provinceName,
      ...(pickup.districtName
        ? { from_district_name: pickup.districtName }
        : {}),
      is_new_from_address: !pickup.districtName,
      to_name: warehouse.name,
      to_phone: warehouse.phone,
      to_address: warehouse.address,
      to_ward_name: warehouse.wardName,
      to_province_name: warehouse.provinceName,
      ...(warehouse.districtName
        ? { to_district_name: warehouse.districtName }
        : {}),
      is_new_to_address: !warehouse.districtName,
      payment_type_id: 1,
      cod_amount: 0,
      required_note: 'KHONGCHOXEMHANG',
      service_type_id: 2,
      content: input.content.slice(0, 2000),
      weight: pickup.weight,
      length: pickup.length,
      width: pickup.width,
      height: pickup.height,
      pick_station_id: 0,
    };

    try {
      const response = await fetch(
        'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Token: token,
            ShopId: shopId,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12000),
        },
      );
      const result = (await response.json()) as {
        code?: number;
        message?: string;
        data?: { order_code?: string; total_fee?: number };
      };
      if (!response.ok || result.code !== 200 || !result.data?.order_code) {
        throw new BadGatewayException(
          `GHN Staging không tạo được đơn lấy hàng: ${result.message || 'Dữ liệu chưa hợp lệ'}`,
        );
      }
      return {
        provider: 'GHN_STAGING',
        carrierName: 'GHN (Staging)',
        trackingNumber: result.data.order_code,
        providerStatus: 'ready_to_pick',
        feeAmount: result.data.total_fee ?? null,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        'Không kết nối được GHN Staging. Vui lòng thử lại sau.',
      );
    }
  }

  async status(trackingNumber: string): Promise<string> {
    if (this.mode() !== 'staging')
      throw new ServiceUnavailableException(
        'Chỉ đồng bộ được vận đơn GHN Staging',
      );
    const token = process.env.GHN_STAGING_TOKEN;
    const shopId = process.env.GHN_STAGING_SHOP_ID;
    if (!token || !shopId)
      throw new ServiceUnavailableException('Chưa cấu hình GHN Staging');
    try {
      const url = new URL(
        'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail',
      );
      url.searchParams.set('order_code', trackingNumber);
      const response = await fetch(url, {
        headers: { Token: token, ShopId: shopId },
        signal: AbortSignal.timeout(12000),
      });
      const result = (await response.json()) as {
        code?: number;
        data?: { order_code?: string; status?: string; shop_id?: number };
      };
      if (
        !response.ok ||
        result.code !== 200 ||
        result.data?.order_code !== trackingNumber ||
        result.data?.shop_id !== Number(shopId) ||
        !result.data.status
      ) {
        throw new BadGatewayException(
          'Không đồng bộ được trạng thái vận đơn GHN Staging',
        );
      }
      return result.data.status;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(
        'Không kết nối được GHN Staging. Vui lòng thử lại sau.',
      );
    }
  }
}

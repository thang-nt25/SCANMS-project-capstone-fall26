import api from './api';

export interface EligibleProduct {
  id: string;
  title: string;
  sku: string;
  categoryName: string | null;
  imageUrl: string | null;
  originalPrice: string | number | null;
  price: string | number;
  customCommissionRate: string | number | null;
  stockQuantity: number;
  store: {
    id: string;
    name: string;
    slug: string;
    defaultCommissionRate: string | number;
  };
  estimatedCommissionRate: number;
  estimatedCommissionAmount: number;
}

export interface ReferralLinkItem {
  id: string;
  collaboratorId: string;
  storeId: string;
  productId: string;
  campaignId: string | null;
  shortCode: string;
  shortUrl: string;
  label: string | null;
  channel: string | null;
  destinationPath: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'BLOCKED';
  isActive: boolean;
  expiresAt: string | null;
  disabledReason: string | null;
  disabledBy: string | null;
  disabledAt: string | null;
  lastAccessedAt: string | null;
  customCouponCode: string | null;
  qrCodeUrl: string | null;
  totalClicks: number;
  uniqueClicks: number;
  totalOrders: number;
  createdAt: string;
  commissionRate?: number;
  product: {
    id: string;
    title: string;
    imageUrl: string | null;
    price: string | number;
    customCommissionRate?: string | number | null;
    store?: {
      id: string;
      name: string;
      defaultCommissionRate: string | number;
    };
  };
  store: {
    id: string;
    name: string;
    slug: string;
  };
  collaborator?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
  };
}

export interface CreateReferralLinkPayload {
  productId: string;
  campaignId?: string;
  label?: string;
  channel?: string;
  customCouponCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  expiresAt?: string;
}

export interface QueryReferralLinksParams {
  page?: number;
  limit?: number;
  status?: string;
  channel?: string;
  storeId?: string;
  campaignId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const referralLinksService = {
  // Lấy danh sách sản phẩm được tiếp thị
  async getEligibleProducts(params?: { search?: string; storeId?: string }): Promise<EligibleProduct[]> {
    const res: any = await api.get('/collaborator/referral-links/products', { params });
    return res?.data || res || [];
  },

  // Lấy danh sách link tiếp thị của KOL
  async getMyLinks(params?: QueryReferralLinksParams): Promise<{ data: ReferralLinkItem[]; meta: any }> {
    const res: any = await api.get('/collaborator/referral-links', { params });
    const payload = res?.data || res;
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  // Lấy chi tiết 1 link
  async getLinkDetail(id: string): Promise<ReferralLinkItem> {
    const res: any = await api.get(`/collaborator/referral-links/${id}`);
    return res?.data?.data || res?.data || res;
  },

  // Tạo link tiếp thị mới
  async createLink(payload: CreateReferralLinkPayload): Promise<ReferralLinkItem> {
    const res: any = await api.post('/collaborator/referral-links', payload);
    return res?.data?.data || res?.data || res;
  },

  // Cập nhật nhãn/kênh link
  async updateLink(id: string, payload: Partial<CreateReferralLinkPayload>): Promise<ReferralLinkItem> {
    const res: any = await api.patch(`/collaborator/referral-links/${id}`, payload);
    return res?.data?.data || res?.data || res;
  },

  // Tạm dừng / Kích hoạt lại
  async toggleStatus(id: string): Promise<ReferralLinkItem> {
    const res: any = await api.patch(`/collaborator/referral-links/${id}/status`);
    return res?.data?.data || res?.data || res;
  },

  // Xóa mềm link
  async deleteLink(id: string): Promise<{ success: boolean; message: string }> {
    const res: any = await api.delete(`/collaborator/referral-links/${id}`);
    return res?.data || res;
  },

  // Chủ Shop xem danh sách link
  async getStoreLinks(storeId: string, params?: QueryReferralLinksParams): Promise<{ data: ReferralLinkItem[]; meta: any }> {
    const res: any = await api.get(`/stores/${storeId}/referral-links`, { params });
    const payload = res?.data || res;
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  // Chủ Shop khóa link vi phạm (kèm lý do bắt buộc)
  async blockLink(storeId: string, linkId: string, reason: string): Promise<any> {
    const res: any = await api.patch(`/stores/${storeId}/referral-links/${linkId}/block`, { reason });
    return res?.data || res;
  },

  // Chủ Shop mở khóa link
  async unblockLink(storeId: string, linkId: string): Promise<any> {
    const res: any = await api.patch(`/stores/${storeId}/referral-links/${linkId}/unblock`);
    return res?.data || res;
  },

  // Quản trị viên (Admin) xem danh sách tất cả link toàn sàn
  async getAdminReferralLinks(params?: QueryReferralLinksParams): Promise<{ data: ReferralLinkItem[]; meta: any }> {
    const res: any = await api.get('/admin/referral-links', { params });
    const payload = res?.data || res;
    return {
      data: payload?.data || [],
      meta: payload?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  // Quản trị viên (Admin) khóa link vi phạm toàn hệ thống
  async blockLinkByAdmin(linkId: string, reason: string): Promise<any> {
    const res: any = await api.patch(`/admin/referral-links/${linkId}/block`, { reason });
    return res?.data || res;
  },

  // Quản trị viên (Admin) mở khóa link
  async unblockLinkByAdmin(linkId: string): Promise<any> {
    const res: any = await api.patch(`/admin/referral-links/${linkId}/unblock`);
    return res?.data || res;
  },

  // ==========================================
  // FR-11 — MÃ QR TIẾP THỊ ĐỘNG
  // ==========================================
  // Lấy URL xem trước / tải ảnh QR từ Backend
  getQrDownloadUrl(id: string, format: 'png' | 'svg' = 'png', size: number = 1024): string {
    const baseURL = (api.defaults.baseURL || '/api').replace(/\/$/, '');
    return `${baseURL}/referral-links/${id}/qr?format=${format}&size=${size}&download=true`;
  },

  // Tải ảnh QR với tên file SCANMS-QR-{shortCode}.{format}
  async downloadQrCode(
    id: string,
    shortCode: string,
    format: 'png' | 'svg' = 'png',
    size: number = 1024,
  ): Promise<void> {
    const res = await api.get(`/referral-links/${id}/qr`, {
      params: { format, size, download: true },
      responseType: 'blob',
    });
    const mimeType = format === 'png' ? 'image/png' : 'image/svg+xml;charset=utf-8';
    const blob = new Blob([res.data], { type: mimeType });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `SCANMS-QR-${shortCode}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },
};



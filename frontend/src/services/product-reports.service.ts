import api from './api';

export const productReportReasons = {
  WRONG_IMAGE: 'Hình ảnh sai sản phẩm',
  MISLEADING_INFORMATION: 'Thông tin gây hiểu nhầm',
  SUSPECTED_COUNTERFEIT: 'Nghi hàng giả',
  OTHER: 'Khác',
} as const;

export const productReportStatuses = {
  PENDING: 'Chờ xử lý',
  ESCALATED: 'Chờ Admin xem xét',
  DISMISSED: 'Không phát hiện vi phạm',
  CORRECTION_REQUESTED: 'Đã yêu cầu chỉnh sửa',
  HIDDEN: 'Đã ẩn sản phẩm',
} as const;

export type ProductReportReason = keyof typeof productReportReasons;
export type ProductReportStatus = keyof typeof productReportStatuses;
export type ProductReportDecision = Exclude<ProductReportStatus, 'PENDING'>;

export interface ProductReportItem {
  id: string;
  reason: ProductReportReason;
  details?: string | null;
  status: ProductReportStatus;
  evidenceMime?: string | null;
  evidenceVideoMime?: string | null;
  variantName?: string | null;
  variantSku?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  decisionNote?: string | null;
  product: { id: string; title: string; sku: string; imageUrl?: string | null; isActive: boolean; store: { name: string } };
}

export const productReportsService = {
  async submit(productId: string, body: FormData) {
    await api.post(`/product-reports/products/${productId}`, body, {
      timeout: 30_000, headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  async list(status: string, page: number, report: string | null, product: string | null, signal: AbortSignal) {
    const response = await api.get('/product-reports', {
      params: { status: status || undefined, page, report: report || undefined, product: product || undefined },
      signal, headers: { 'x-skip-cache': 'true' },
    });
    return response.data as { items: ProductReportItem[]; total: number; pageSize: number };
  },
  async evidence(id: string, kind: 'image' | 'video', signal: AbortSignal) {
    const path = kind === 'video' ? 'evidence/video' : 'evidence';
    return await api.get(`/product-reports/${id}/${path}`, {
      signal, responseType: 'blob', headers: { 'x-skip-cache': 'true' },
    }) as unknown as Blob;
  },
  async resolve(id: string, decision: ProductReportDecision, note: string) {
    await api.patch(`/product-reports/${id}`, { decision, note });
  },
};

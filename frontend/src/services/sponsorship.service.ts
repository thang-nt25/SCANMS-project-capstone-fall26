import api from "./api";

export type SponsorshipStatus =
  "REQUESTED" | "AWAITING_PAYMENT" | "PAYMENT_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export interface SponsorshipProduct {
  id: string;
  title: string;
  imageUrl: string | null;
}
export interface Sponsorship {
  id: string;
  headline: string;
  product?: SponsorshipProduct | null;
  bannerImageUrl?: string | null;
  startsAt: string;
  endsAt: string;
  status: SponsorshipStatus;
  fundingType: "PAID" | "PLATFORM_GRANT" | null;
  amount: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentDeadline?: string | null;
  paymentStartedAt?: string | null;
  paidAt?: string | null;
  receivedAmount?: string | null;
  paymentIssue?: string | null;
  payosOrderCode?: string | null;
  reviewNote: string | null;
  store: { id: string; name: string; logoUrl?: string | null };
}
export interface SponsorshipPage {
  items: Sponsorship[];
  page: number;
  totalPages: number;
  total: number;
}
export interface SponsorshipRequest {
  renewsPlacementId?: string;
  quotedAmount: number;
  requestKey: string;
  headline: string;
  productId?: string;
  bannerImageUrl?: string;
  startsAt: string;
  endsAt: string;
}
export interface SponsorshipReview {
  decision: "APPROVE" | "REJECT";
  note: string;
}
// The shared interceptor unwraps HTTP responses; support the global response envelope too.
const unwrap = <T>(response: unknown): T =>
  (response as { data?: T })?.data ?? (response as T);
export const sponsorshipService = {
  async products(storeId: string, signal?: AbortSignal): Promise<SponsorshipProduct[]> {
    if (!storeId) return [];
    const products = new Map<string, SponsorshipProduct>();
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page += 1) {
      const catalog = unwrap<{
        items: (SponsorshipProduct & { store: { id: string } })[];
        pagination: { totalPages: number };
      }>(await api.get('/public/products', {
        params: { storeId, page, limit: 100 },
        headers: { 'x-skip-cache': 'true' },
        signal,
      }));
      if (!Array.isArray(catalog?.items) || !Number.isInteger(catalog.pagination?.totalPages)) {
        throw new Error('Không tải được danh sách sản phẩm của gian hàng.');
      }
      totalPages = catalog.pagination.totalPages;
      for (const { id, title, imageUrl, store } of catalog.items) {
        if (store?.id === storeId) products.set(id, { id, title, imageUrl });
      }
    }
    return [...products.values()].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  },
  async pricing(): Promise<{ dailyRate: number; currency: string; billingHours: number; minHours: number; maxDays: number }> {
    return unwrap(await api.get('/sponsored-placements/pricing', { headers: { 'x-skip-cache': 'true' } }));
  },
  async list(page: number, status: string): Promise<SponsorshipPage> {
    const history = unwrap<SponsorshipPage>(
      await api.get("/sponsored-placements", {
        params: { page, ...(status ? { status } : {}) },
        headers: { "x-skip-cache": "true" },
      }),
    );
    if (!Array.isArray(history?.items) || !Number.isInteger(history.total) || !Number.isInteger(history.totalPages)) {
      throw new Error('Không tải được lịch sử đăng ký.');
    }
    return history;
  },
  async request(data: SponsorshipRequest) {
    return unwrap<Sponsorship>(await api.post("/sponsored-placements", data));
  },
  async review(id: string, data: SponsorshipReview) {
    return unwrap<Sponsorship>(
      await api.patch(`/sponsored-placements/${id}/review`, data),
    );
  },
  async cancel(id: string, note: string) {
    await api.patch(`/sponsored-placements/${id}/cancel`, { note });
  },
  async startPayment(id: string) {
    const result = unwrap<{ checkoutUrl: string }>(await api.post(`/sponsored-placements/${id}/payment`));
    if (!result?.checkoutUrl?.startsWith('https://pay.payos.vn/web/')) throw new Error('Liên kết payOS không hợp lệ.');
    return result;
  },
  async checkPayment(id: string) {
    return unwrap<{ status: SponsorshipStatus; amount: number; deadline: string | null }>(
      await api.get(`/sponsored-placements/${id}/payment`, { headers: { 'x-skip-cache': 'true' } }),
    );
  },
};

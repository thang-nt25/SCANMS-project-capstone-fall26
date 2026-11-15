import { Image as ImageIcon } from 'lucide-react';
import { handleProductImageError } from '@/utils/image-fallback.utils';
import type { ReturnDetail } from '@/services/return.service';

export function caseProducts(request: ReturnDetail) {
  if (request.items?.length) return request.items.map(line => ({ id: line.id, title: line.orderItem.product.title, imageUrl: line.orderItem.product.imageUrl, variantName: line.orderItem.variant?.name, quantity: line.quantity, unitPrice: line.unitPrice }));
  return request.order.products ?? [];
}
export function CaseProductImage({ product, size = 56 }: { product?: { title: string; imageUrl?: string | null }; size?: number }) {
  return <span className="return-product-image" style={{ width: size, height: size }}>{product?.imageUrl ? <img src={product.imageUrl} onError={handleProductImageError} alt={product.title}/> : <ImageIcon size={22} aria-label="Chưa có ảnh sản phẩm"/>}</span>;
}
export const returnMoney = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
export const returnDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa ghi nhận';
export const claimLabels: Record<string, string> = { DRAFT: 'Chờ gửi GHN', SUBMITTED: 'Đã gửi GHN', NEEDS_MORE_EVIDENCE: 'Cần bổ sung bằng chứng', ACCEPTED: 'GHN chấp thuận', REJECTED: 'GHN từ chối', PAID: 'GHN đã thanh toán' };

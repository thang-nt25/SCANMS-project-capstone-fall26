import { Modal } from '../ui/Modal';
import type { ReferralOrderItem } from '../../services/analytics.service';
import { formatMoney, getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';
import { kolOrderCommissionStatus, kolOrderCommissionAmountLabel } from '../../utils/kol-order-status';

export function KolReferralOrderDialog({ order, onClose }: { order: ReferralOrderItem; onClose: () => void }) {
  return <Modal isOpen onClose={onClose} title={`Đơn ${order.orderCode}`} subtitle={order.storeName} maxWidth="2xl">
    <div className="kol-order-detail-summary"><div><span>Thời gian đặt</span><strong>{new Date(order.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong></div><div><span>Đối soát thù lao</span><strong>{kolOrderCommissionStatus(order)}</strong></div><div><span>Giá trị đơn</span><strong>{formatMoney(order.finalAmount)}</strong></div><div><span>{kolOrderCommissionAmountLabel(order)}</span><strong>{formatMoney(order.commissionAmount)}</strong></div></div>
    <div className="kol-order-detail-products">{order.products.map((product, index) => <div key={`${product.id}-${index}`}><img src={getSafeProductImageUrl(product.imageUrl, product.title)} alt={product.title} onError={handleProductImageError}/><div><strong>{product.title}</strong><span>{product.variantName ? `${product.variantName} · ` : ''}Số lượng {product.quantity}</span></div><strong>{formatMoney(product.commissionAmount)}</strong></div>)}</div>
    {order.availableAt && <p className="mt-3 text-xs text-[#7D715E]">Mốc khả dụng ghi nhận: {new Date(order.availableAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>}
  </Modal>;
}

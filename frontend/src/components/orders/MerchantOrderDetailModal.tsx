import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, Package, ShoppingBag, Users, Wallet, X } from 'lucide-react';
import type { StoreOrderItem, StoreOrderRecord } from '../../services/order.service';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';
import './MerchantOrderDetailModal.css';

const amount = (value: number) => `${(value ?? 0).toLocaleString('vi-VN')} ₫`;
const statusLabels: Record<string, string> = {
  PENDING: 'Chờ lấy hàng', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', RETURN_REQUESTED: 'Yêu cầu đổi trả',
  DISPUTED: 'Đang khiếu nại', RETURNED: 'Đã trả hàng',
};
const paymentLabels: Record<string, string> = {
  MANUAL: 'Đơn thủ công — chưa chọn phương thức',
  WALLET: 'Ví SCANMS', E_WALLET: 'Ví điện tử', COD: 'Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản', PAYOS: 'Chuyển khoản PayOS',
};

export function MerchantOrderDetailModal({ order, onClose, getItemThumbnail, children, onRequestPayment }: {
  order: StoreOrderRecord;
  onClose: () => void;
  getItemThumbnail: (item: StoreOrderItem) => string | null;
  children?: ReactNode;
  onRequestPayment?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return createPortal(<dialog
    ref={dialog}
    aria-labelledby="order-detail-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}
    className="merchant-order-detail m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-[680px] flex-col overflow-hidden rounded-[20px] border border-[#EAE4D7] bg-white p-0 text-left font-sans text-[#1A1612] shadow-[0_24px_80px_rgb(35_29_21/18%)] backdrop:bg-[#231D15]/35 backdrop:backdrop-blur-[2px] open:flex sm:max-h-[calc(100dvh-48px)]"
  >
    <header className="shrink-0 border-b border-[#EAE4D7] px-4 py-4 sm:px-6">
      <div className="order-detail-heading flex items-start gap-3">
        <span className="order-detail-heading-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><ShoppingBag size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="order-detail-title" className="text-lg font-bold leading-tight tracking-tight sm:text-xl">Chi tiết đơn hàng</h2>
          <div className="order-detail-meta"><span>#{order.externalOrderSn}</span><span><Clock size={12} aria-hidden="true" /><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</time></span></div>
        </div>
        <span className="order-detail-state" data-status={order.status}>{statusLabels[order.status] || order.status}</span>
        <button type="button" aria-label="Đóng chi tiết đơn hàng" onClick={onClose} className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#7D715E] transition-colors hover:bg-[#F3EFE6] hover:text-[#1A1612] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]"><X size={18} /></button>
      </div>
    </header>

    <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" data-order-detail-content>
      <section aria-labelledby="order-recipient-title">
        <h3 id="order-recipient-title" className="mb-2.5 flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-[#B88E4F]" />Người nhận hàng</h3>
        <dl className="order-detail-recipient grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]/60 p-3.5 text-xs sm:p-4">
          <div className="min-w-0"><dt className="text-[11px] text-[#7D715E]">Họ và tên</dt><dd className="mt-1 break-words font-semibold">{order.customerName || 'Chưa có thông tin'}</dd></div>
          <div className="min-w-0"><dt className="text-[11px] text-[#7D715E]">Số điện thoại</dt><dd className="mt-1 break-all font-medium tabular-nums">{order.customerPhone || 'Chưa có thông tin'}</dd></div>
          {order.customerEmail && <div className="order-detail-email col-span-2 min-w-0"><dt className="text-[11px] text-[#7D715E]">Email</dt><dd className="mt-1 break-all leading-relaxed">{order.customerEmail}</dd></div>}
          <div className="col-span-2 min-w-0 border-t border-[#EAE4D7]/80 pt-3"><dt className="flex items-center gap-1 text-[11px] text-[#7D715E]"><MapPin size={12} />Địa chỉ giao hàng</dt><dd className="mt-1 break-words leading-relaxed">{order.shippingAddress || 'Chưa có địa chỉ giao hàng'}</dd></div>
          {order.deliveryLocation && <div className="col-span-2 min-w-0 rounded-lg border border-[#EAE4D7] bg-white p-3">
            <dt className="text-[11px] text-[#7D715E]">Vị trí giao hàng đã lưu</dt>
            <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] tabular-nums">{order.deliveryLocation.latitude.toFixed(6)}, {order.deliveryLocation.longitude.toFixed(6)}</span>
              <a href={`https://www.google.com/maps/search/?api=1&query=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-[#EEDFC6] bg-white px-2.5 py-1.5 text-[11px] text-[#79592C] hover:bg-[#FBF5EB]">Mở bản đồ</a>
            </dd>
          </div>}
          {order.note && <div className="col-span-2 min-w-0"><dt className="text-[11px] text-[#7D715E]">Ghi chú đơn hàng</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{order.note}</dd></div>}
        </dl>
      </section>

      <section aria-labelledby="order-products-title">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h3 id="order-products-title" className="flex items-center gap-2 text-sm font-semibold"><Package size={16} className="text-[#B88E4F]" />Sản phẩm trong đơn</h3>
          <span className="text-[11px] text-[#7D715E]">{order.items.length} sản phẩm · SL: {quantity}</span>
        </div>
        <div className="order-detail-products divide-y divide-[#EAE4D7] overflow-hidden rounded-xl border border-[#EAE4D7]">
          {order.items.map((item, index) => <div key={`${item.productId}-${index}`} className="order-detail-product grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 p-3 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:p-3.5">
            <img src={getSafeProductImageUrl(getItemThumbnail(item), item.title)} alt={item.title} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/scanms-placeholder.svg'; }} className="row-span-2 h-12 w-12 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] object-contain sm:h-14 sm:w-14" />
            <div className="min-w-0 self-end"><p className="break-words text-xs font-semibold leading-relaxed sm:text-[13px]">{item.title}</p><p className="mt-1 text-[11px] text-[#7D715E]">{item.quantity} × {amount(item.unitPrice)}</p>{item.sku && <p className="mt-1 break-all font-mono text-[10px] text-[#7D715E]">SKU: {item.sku}</p>}</div>
            <strong className="col-start-2 self-start text-xs font-semibold tabular-nums sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:self-center sm:text-right">{amount(item.unitPrice * item.quantity)}</strong>
          </div>)}
        </div>
      </section>

      {children}

      <section aria-labelledby="order-finance-title" className="order-detail-finance overflow-hidden rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/70">
        <div className="p-3.5 sm:p-4">
          <div className="order-detail-finance-heading mb-4 flex flex-wrap items-center justify-between gap-2"><h3 id="order-finance-title" className="flex items-center gap-2 text-sm font-semibold"><Wallet size={16} className="text-[#B88E4F]" />Thanh toán</h3><div className="order-detail-payment-meta">{order.paymentMethod && <span>{paymentLabels[order.paymentMethod] || order.paymentMethod}</span>}<span className="order-detail-payment-state">{order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></div></div>
          <dl className="space-y-2.5 text-xs">
            <div className="flex items-baseline justify-between gap-3"><dt className="text-[#7D715E]">Tiền hàng</dt><dd className="shrink-0 font-medium tabular-nums">{amount(order.subtotalAmount)}</dd></div>
            <div className="flex items-baseline justify-between gap-3"><dt className="text-[#7D715E]">Phí vận chuyển</dt><dd className="shrink-0 font-medium tabular-nums">{amount(order.shippingFee)}</dd></div>
            {order.discountAmount > 0 && <div className="flex items-baseline justify-between gap-3"><dt className="text-[#7D715E]">Giảm giá{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd className="shrink-0 font-medium tabular-nums text-[#8C6B32]">−{amount(order.discountAmount)}</dd></div>}
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[#EEDFC6] pt-3"><dt className="text-sm font-semibold">Tổng thanh toán</dt><dd className="text-xl font-bold tracking-tight tabular-nums sm:text-2xl" data-order-detail-total>{amount(order.finalAmount)}</dd></div>
          </dl>
          {order.isManualOrder && order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && onRequestPayment && <button type="button" onClick={onRequestPayment} className="mt-3 rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 text-xs font-medium hover:bg-[#F3EFE6]">Mở QR / link thanh toán PayOS</button>}
        </div>
        <div className="order-detail-commission flex items-baseline justify-between gap-3 border-t border-[#EEDFC6] bg-white/70 px-3.5 py-3 text-[11px] sm:px-4"><span className="text-[#7D715E]">Hoa hồng KOL ghi nhận</span><strong className="shrink-0 font-semibold tabular-nums text-[#8C6B32]">{order.totalCommission > 0 ? '+' : ''}{amount(order.totalCommission)}</strong></div>
      </section>
    </div>

    <footer className="flex shrink-0 justify-end border-t border-[#EAE4D7] bg-white px-4 py-3 sm:px-6">
      <button type="button" onClick={onClose} className="min-h-10 min-w-24 cursor-pointer rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-5 py-2 text-xs font-semibold text-[#1A1612] transition-colors hover:border-[#C59B58] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]">Đóng</button>
    </footer>
  </dialog>, document.body);
}

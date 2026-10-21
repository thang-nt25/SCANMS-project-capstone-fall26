import { MessageCircle, RotateCcw, Star } from 'lucide-react';
import type { CustomerOrder } from '../../services/customer.service';
import { getCustomerOrderActions } from '../../utils/customer-order-actions';

export function CustomerOrderDetailActions({ order, trackingStatus, onChat, onCancel, onReview, onReorder }: {
  order: CustomerOrder; trackingStatus?: string | null;
  onChat: () => void;
  onCancel: () => void;
  onReview: () => void; onReorder: () => void;
}) {
  const actions = getCustomerOrderActions(order, Date.now(), trackingStatus);
  const secondary = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-semibold text-[#1A1612] hover:border-[#C59B58] hover:bg-[#FBF5EB] disabled:opacity-50';
  const primary = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#C59B58] bg-[#C59B58] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B88E4F] disabled:opacity-50';
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-[#EAE4D7] pt-4 [&>button]:min-h-11 [&>button]:w-full [&>button]:min-w-0 [&>button]:whitespace-normal" aria-label="Thao tác đơn hàng">
      <button type="button" className={secondary} onClick={onChat}><MessageCircle size={14} />Chat Shop</button>
      {actions.cancel && <button type="button" className={secondary} onClick={onCancel}>Hủy đơn</button>}
      {actions.review && <button type="button" className={primary} onClick={onReview}><Star size={14} />Đánh giá</button>}
      {actions.reorder && <button type="button" className={actions.confirmReceipt || actions.review ? secondary : primary} onClick={onReorder}><RotateCcw size={14} />Mua lại đơn hàng</button>}
    </div>
  );
}

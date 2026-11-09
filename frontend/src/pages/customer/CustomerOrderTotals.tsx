import type { CustomerOrder } from '../../services/customer.service';
import { formatMoney } from '../../utils/marketplace.utils';

export function CustomerOrderTotals({ order }: { order: CustomerOrder }) {
  const discount = Number(order.discountAmount) || 0;
  const hasDiscount = discount > 0;
  const subtotal = Number(order.subtotalAmount) || 0;
  const couponCode = order.rawPayload?.couponCode || order.rawPayload?.voucherCode;

  return (
    <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1" aria-label="Thành tiền đơn hàng">
      <span className="text-xs text-[#7D715E] font-medium">Thành tiền:</span>
      <div className="inline-flex items-baseline gap-2">
        {hasDiscount && subtotal > Number(order.finalAmount) && (
          <span className="text-xs text-[#7D715E] line-through font-mono tabular-nums">
            {formatMoney(subtotal)}
          </span>
        )}
        <strong className="text-base sm:text-lg font-bold font-mono text-[#1A1612] tabular-nums tracking-tight">
          {formatMoney(order.finalAmount)}
        </strong>
      </div>
      {couponCode && (
        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
          Voucher: {couponCode}
        </span>
      )}
    </div>
  );
}
